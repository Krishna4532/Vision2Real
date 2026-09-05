import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.validation import Validation, ValidationReport
from app.repositories.validation_repository import ValidationRepository
from app.schemas.validation import (
    DetailedScores,
    StructuredValidationReport,
    SWOTAnalysis,
    ValidationEventType,
    ValidationProgress,
    ValidationStatus,
)
from app.services.agents.concrete_agents import (
    BusinessModelAgent,
    DocumentParserAgent,
    FinancialAgent,
    MarketAnalysisAgent,
    ReportGenerationAgent,
    ResearchAgent,
    RiskAnalysisAgent,
    ScoringAgent,
)
from app.services.llm.base_provider import LLMProvider
from app.services.pdf_service import PDFReportGenerator
from app.services.prompt_builder import PromptBuilder
from app.services.validation.report_mapper import ReportMapper

logger = logging.getLogger(__name__)


class ValidationProgressBroadcaster:
    """In-memory event broadcaster for streaming live SSE progress events."""

    _listeners: Dict[str, List[asyncio.Queue]] = {}

    @classmethod
    def subscribe(cls, validation_id: str) -> asyncio.Queue:
        if validation_id not in cls._listeners:
            cls._listeners[validation_id] = []
        queue = asyncio.Queue()
        cls._listeners[validation_id].append(queue)
        return queue

    @classmethod
    def unsubscribe(cls, validation_id: str, queue: asyncio.Queue):
        if validation_id in cls._listeners:
            if queue in cls._listeners[validation_id]:
                cls._listeners[validation_id].remove(queue)
            if not cls._listeners[validation_id]:
                del cls._listeners[validation_id]

    @classmethod
    async def publish(cls, validation_id: str, event: ValidationProgress):
        if validation_id in cls._listeners:
            for queue in list(cls._listeners[validation_id]):
                await queue.put(event)


class ValidationOrchestrator:
    """Multi-Agent Validation Orchestrator for Vision2Real.

    Coordinates execution across 8 specialized AI agents and 12 sequential pipeline
    stages, emitting real-time progress events over SSE.

    Execution mode is controlled by VISION2REAL_EXECUTION_MODE (default: "v1"):
      v1 — single master LLM call (MVP). Fast, high-quality, single JSON response.
      v2 — full multi-agent pipeline (future). Each agent runs independently.

    Switching from v1 to v2 requires only changing the environment variable.
    No source code changes are needed.
    """

    def __init__(
        self,
        db: AsyncSession,
        llm_provider: Optional[LLMProvider] = None,
        prompt_builder: Optional[PromptBuilder] = None,
    ):
        self.db = db
        self.repo = ValidationRepository(db)
        self.pdf_generator = PDFReportGenerator()
        self.llm_provider = llm_provider
        self.prompt_builder = prompt_builder or PromptBuilder()

        # Instantiate 8 concrete agents with the shared provider and prompt builder.
        # These are preserved for V2. In V1 mode their .run() is never called,
        # but the objects exist so imports and tests remain unchanged.
        self.agents = [
            DocumentParserAgent(llm_provider=self.llm_provider, prompt_builder=self.prompt_builder),
            ResearchAgent(llm_provider=self.llm_provider, prompt_builder=self.prompt_builder),
            MarketAnalysisAgent(llm_provider=self.llm_provider, prompt_builder=self.prompt_builder),
            BusinessModelAgent(llm_provider=self.llm_provider, prompt_builder=self.prompt_builder),
            FinancialAgent(llm_provider=self.llm_provider, prompt_builder=self.prompt_builder),
            RiskAnalysisAgent(llm_provider=self.llm_provider, prompt_builder=self.prompt_builder),
            ScoringAgent(llm_provider=self.llm_provider, prompt_builder=self.prompt_builder),
            ReportGenerationAgent(llm_provider=self.llm_provider, prompt_builder=self.prompt_builder),
        ]

    # ── SSE Helpers ───────────────────────────────────────────────────────────

    async def emit_progress(
        self,
        validation_id: str,
        stage: str,
        agent_name: str,
        status: str,
        progress_percentage: float,
        message: str,
        started_at: Optional[str] = None,
        completed_at: Optional[str] = None,
        duration_ms: Optional[int] = None,
    ) -> ValidationProgress:
        event = ValidationProgress(
            validation_id=validation_id,
            stage=stage,
            agent_name=agent_name,
            status=status,
            progress_percentage=progress_percentage,
            message=message,
            started_at=started_at,
            completed_at=completed_at,
            duration_ms=duration_ms,
        )
        await ValidationProgressBroadcaster.publish(validation_id, event)
        return event

    # ── Main Pipeline Entry Point ─────────────────────────────────────────────

    async def run_pipeline(self, validation_id: str) -> Validation:
        """Entry point for both V1 and V2 execution modes.

        Reads VISION2REAL_EXECUTION_MODE from settings and dispatches to either
        _run_v1_single_shot() or _run_multi_agent_pipeline(). Every stage that
        wraps the execution (upload event, PDF generation, DB save) runs the
        same way in both modes.
        """
        t_pipeline_start = time.monotonic()
        logger.info("=== Validation Pipeline Started for %s ===", validation_id)
        print(f"\n[Orchestrator] Validation Started for {validation_id}")

        validation = await self.repo.get_by_id(validation_id)
        if not validation:
            raise ValueError(f"Validation {validation_id} not found")

        # Update status to PROCESSING
        validation.status = ValidationStatus.PROCESSING.value
        await self.repo.save(validation)
        await self.repo.save_event(
            validation_id=validation.id,
            event_type=ValidationEventType.VALIDATION_STARTED,
        )

        context: Dict[str, Any] = {
            "validation_id": validation.id,
            "idea_description": validation.inputs.idea_description if validation.inputs else "",
            "target_customer": validation.inputs.target_customer if validation.inputs else None,
            "target_market": validation.inputs.target_market if validation.inputs else None,
            "founder_stage": validation.inputs.founder_stage if validation.inputs else None,
            "attachments": [
                {"filename": a.filename, "storage_path": a.storage_path}
                for a in (validation.attachments or [])
            ],
        }

        stage_execution_times: Dict[str, int] = {}
        total_stages = 12

        # ── Stage 1: Upload Complete ──────────────────────────────────────────
        t0 = time.monotonic()
        d_ms = int((time.monotonic() - t0) * 1000)
        stage_execution_times["Upload"] = d_ms
        await self.emit_progress(
            validation_id=validation.id,
            stage="Upload",
            agent_name="System",
            status="completed",
            progress_percentage=(1 / total_stages) * 100,
            message="✔ Upload Complete",
            duration_ms=d_ms,
        )
        print(f"✔ Upload Complete [{d_ms}ms]")

        # ── Stages 2–9: Execution Mode Dispatch ───────────────────────────────
        settings = get_settings()
        execution_mode = (settings.execution_mode or "v1").lower().strip()

        if execution_mode == "v1":
            logger.info("Execution mode: v1 (single master LLM call)")
            report_content = await self._run_v1_single_shot(
                context=context,
                validation_id=validation.id,
                stage_execution_times=stage_execution_times,
                total_stages=total_stages,
            )
        else:
            logger.info("Execution mode: v2 (multi-agent pipeline)")
            report_content = await self._run_multi_agent_pipeline(
                context=context,
                validation_id=validation.id,
                stage_execution_times=stage_execution_times,
                total_stages=total_stages,
            )

        # ── Stage 10: Report Generation ───────────────────────────────────────
        t_rep_start = time.monotonic()
        await self.emit_progress(
            validation_id=validation.id,
            stage="Report Generation",
            agent_name="Report Generator",
            status="running",
            progress_percentage=(10 / total_stages) * 100,
            message="Synthesizing executive report sections...",
        )
        print("Generating Report...")

        d_rep_ms = int((time.monotonic() - t_rep_start) * 1000)
        stage_execution_times["Report Generation"] = d_rep_ms
        await self.emit_progress(
            validation_id=validation.id,
            stage="Report Generation",
            agent_name="Report Generator",
            status="completed",
            progress_percentage=(10 / total_stages) * 100,
            message="✔ Complete",
            duration_ms=d_rep_ms,
        )
        print(f"✔ Complete [{d_rep_ms}ms]")

        # ── Stage 11: PDF Generation ──────────────────────────────────────────
        t_pdf_start = time.monotonic()
        await self.emit_progress(
            validation_id=validation.id,
            stage="PDF Generation",
            agent_name="Report Generator",
            status="running",
            progress_percentage=(11 / total_stages) * 100,
            message="Building branded PDF document...",
        )
        print("Generating PDF...")

        pdf_path = self.pdf_generator.generate_pdf(
            validation_id=validation.id,
            report_data=report_content.model_dump(),
        )
        report_content.pdf_url = f"/api/v1/validations/{validation.id}/pdf"

        d_pdf_ms = int((time.monotonic() - t_pdf_start) * 1000)
        stage_execution_times["PDF Generation"] = d_pdf_ms
        await self.emit_progress(
            validation_id=validation.id,
            stage="PDF Generation",
            agent_name="Report Generator",
            status="completed",
            progress_percentage=(11 / total_stages) * 100,
            message="✔ Complete",
            duration_ms=d_pdf_ms,
        )
        print(f"✔ Complete [{d_pdf_ms}ms]")

        # ── Stage 12: Save Results ────────────────────────────────────────────
        t_save_start = time.monotonic()
        await self.emit_progress(
            validation_id=validation.id,
            stage="Save Results",
            agent_name="System",
            status="running",
            progress_percentage=98.0,
            message="Persisting validation results to PostgreSQL...",
        )
        print("Saving to PostgreSQL...")

        await self.repo.save_report(
            validation_id=validation.id,
            report_json=report_content.model_dump(),
        )

        overall_score = report_content.overall_score
        recommendation = report_content.recommendation
        total_elapsed_ms = int((time.monotonic() - t_pipeline_start) * 1000)

        validation.status = ValidationStatus.COMPLETED.value
        validation.overall_score = overall_score
        validation.recommendation = recommendation
        validation.processing_time_ms = total_elapsed_ms

        await self.repo.save(validation)
        await self.repo.save_event(
            validation_id=validation.id,
            event_type=ValidationEventType.VALIDATION_COMPLETED,
            metadata={
                "overall_score": overall_score,
                "recommendation": recommendation,
                "processing_time_ms": total_elapsed_ms,
                "stage_execution_times": stage_execution_times,
                "pdf_path": pdf_path,
                "execution_mode": execution_mode,
            },
        )

        d_save_ms = int((time.monotonic() - t_save_start) * 1000)
        stage_execution_times["Save Results"] = d_save_ms

        await self.emit_progress(
            validation_id=validation.id,
            stage="Save Results",
            agent_name="System",
            status="completed",
            progress_percentage=100.0,
            message="✔ Complete",
            duration_ms=d_save_ms,
        )
        print(f"✔ Complete [{d_save_ms}ms]")
        print(f"Validation Finished in {total_elapsed_ms}ms  (mode={execution_mode})\n")

        return await self.repo.get_by_id(validation.id)

    # ── V1 Execution Path ─────────────────────────────────────────────────────

    async def _run_v1_single_shot(
        self,
        context: Dict[str, Any],
        validation_id: str,
        stage_execution_times: Dict[str, int],
        total_stages: int,
    ) -> StructuredValidationReport:
        """V1 MVP execution path: single master LLM call.

        Emits SSE progress events across all 8 validation stages so the frontend
        sees the same stage sequence as V2, then calls the LLM exactly once and
        maps the response to StructuredValidationReport via ReportMapper.

        No agents execute. Agent objects exist but .run() is never called here.
        """
        # Stage labels that the frontend expects (preserving the same names as V2).
        v1_stages = [
            ("Idea Extraction",   "Master Validator", "Extracting startup facts and assumptions..."),
            ("Research Agent",    "Master Validator", "Analyzing problem space and market demand..."),
            ("Market Analysis",   "Master Validator", "Evaluating market opportunity and competition..."),
            ("Business Model",    "Master Validator", "Assessing business model and revenue model..."),
            ("Financial Analysis","Master Validator", "Projecting financial outlook and unit economics..."),
            ("Risk Analysis",     "Master Validator", "Identifying execution and market risks..."),
            ("Scoring",           "Master Validator", "Computing venture scores and final recommendation..."),
        ]

        # ── Emit "running" events for all stages upfront ──────────────────────
        # This gives the frontend immediate feedback that work has started.
        for stage_idx, (stage_name, agent_name, message) in enumerate(v1_stages, start=2):
            await self.emit_progress(
                validation_id=validation_id,
                stage=stage_name,
                agent_name=agent_name,
                status="running",
                progress_percentage=((stage_idx - 0.5) / total_stages) * 100,
                message=message,
                started_at=datetime.now(timezone.utc).isoformat(),
            )

        # ── Attachment text extraction ────────────────────────────────────────
        t_llm_start = time.monotonic()
        attachment_text, attachment_filenames = self._extract_attachment_text(
            context.get("attachments", [])
        )

        # ── Build master prompt ───────────────────────────────────────────────
        master_prompt = PromptBuilder.build_master_validation_prompt(
            idea_description=context.get("idea_description") or "",
            target_customer=context.get("target_customer"),
            target_market=context.get("target_market"),
            founder_stage=context.get("founder_stage"),
            attachment_text=attachment_text,
            attachment_filenames=attachment_filenames,
        )

        # ── Single LLM call ───────────────────────────────────────────────────
        payload: Dict[str, Any] = {}
        if self.llm_provider is not None:
            try:
                result = await self.llm_provider.validate_startup(master_prompt)
                payload = getattr(result, "payload", {}) or {}
                if not isinstance(payload, dict):
                    logger.warning("LLM returned non-dict payload for V1 call. Using empty dict.")
                    payload = {}
            except Exception as exc:
                logger.exception("V1 single LLM call failed: %s", exc)
                # Fall through with empty payload — ReportMapper produces safe defaults.
                payload = {}
        else:
            logger.warning("No LLM provider configured. Report will use ReportMapper defaults.")

        d_llm_ms = int((time.monotonic() - t_llm_start) * 1000)
        logger.info("V1 LLM call completed in %dms", d_llm_ms)

        # ── Emit "completed" events for all stages ────────────────────────────
        t_end_iso = datetime.now(timezone.utc).isoformat()
        for stage_idx, (stage_name, agent_name, _) in enumerate(v1_stages, start=2):
            stage_execution_times[stage_name] = d_llm_ms
            await self.emit_progress(
                validation_id=validation_id,
                stage=stage_name,
                agent_name=agent_name,
                status="completed",
                progress_percentage=(stage_idx / total_stages) * 100,
                message="✔ Complete",
                completed_at=t_end_iso,
                duration_ms=d_llm_ms,
            )

        # ── Map to StructuredValidationReport via shared ReportMapper ─────────
        return ReportMapper.from_llm_response(payload)

    # ── V2 Execution Path (preserved intact) ─────────────────────────────────

    async def _run_multi_agent_pipeline(
        self,
        context: Dict[str, Any],
        validation_id: str,
        stage_execution_times: Dict[str, int],
        total_stages: int,
    ) -> StructuredValidationReport:
        """V2 multi-agent execution path (original pipeline, preserved).

        Runs the 8 concrete agents sequentially, collects their outputs, and
        maps the aggregated output to StructuredValidationReport via the shared
        ReportMapper — ensuring V1 and V2 produce identical report structures.

        This method contains the original agent loop from run_pipeline() and is
        called only when VISION2REAL_EXECUTION_MODE=v2.
        """
        stage_mapping = [
            ("Document Parsing",  self.agents[0]),
            ("Idea Extraction",   self.agents[1]),
            ("Research Agent",    self.agents[1]),
            ("Market Analysis",   self.agents[2]),
            ("Business Model",    self.agents[3]),
            ("Financial Analysis",self.agents[4]),
            ("Risk Analysis",     self.agents[5]),
            ("Scoring",           self.agents[6]),
        ]

        agent_outputs: Dict[str, Any] = {}
        stage_idx = 1

        for stage_name, agent in stage_mapping:
            stage_idx += 1
            t_agent_start = time.monotonic()
            t_agent_start_iso = datetime.now(timezone.utc).isoformat()

            await self.emit_progress(
                validation_id=validation_id,
                stage=stage_name,
                agent_name=agent.name,
                status="running",
                progress_percentage=((stage_idx - 0.5) / total_stages) * 100,
                message=f"{agent.description}",
                started_at=t_agent_start_iso,
            )
            print(f"{stage_name} ({agent.name})...")

            try:
                out = await agent.run(context)
                agent_outputs[agent.name] = out
                context.update(out)

                d_agent_ms = int((time.monotonic() - t_agent_start) * 1000)
                t_agent_end_iso = datetime.now(timezone.utc).isoformat()
                stage_execution_times[stage_name] = d_agent_ms

                await self.emit_progress(
                    validation_id=validation_id,
                    stage=stage_name,
                    agent_name=agent.name,
                    status="completed",
                    progress_percentage=(stage_idx / total_stages) * 100,
                    message="✔ Complete",
                    started_at=t_agent_start_iso,
                    completed_at=t_agent_end_iso,
                    duration_ms=d_agent_ms,
                )
                print(f"✔ Complete [{d_agent_ms}ms]")

            except Exception as exc:
                logger.exception("Agent %s failed during %s: %s", agent.name, stage_name, exc)
                agent.mark_failed(str(exc))
                d_agent_ms = int((time.monotonic() - t_agent_start) * 1000)
                stage_execution_times[stage_name] = d_agent_ms

                await self.emit_progress(
                    validation_id=validation_id,
                    stage=stage_name,
                    agent_name=agent.name,
                    status="failed",
                    progress_percentage=(stage_idx / total_stages) * 100,
                    message=f"Agent error: {exc}",
                    duration_ms=d_agent_ms,
                )

        # Merge all agent outputs into a single flat dict, then map through the
        # shared ReportMapper — same as V1, ensuring identical report structure.
        merged: Dict[str, Any] = {}
        for agent_out in agent_outputs.values():
            if isinstance(agent_out, dict):
                merged.update(agent_out)

        # Preserve the full agent_outputs for debugging / introspection.
        merged["agent_outputs"] = agent_outputs

        return ReportMapper.from_llm_response(merged)

    # ── Attachment Text Extraction ────────────────────────────────────────────

    def _extract_attachment_text(
        self, attachments: List[Dict[str, Any]]
    ) -> tuple[Optional[str], Optional[List[str]]]:
        """Lightweight attachment text extractor for V1 prompt injection.

        Strategy (no heavy dependencies required):
          .txt / .md  → read directly as UTF-8
          .pdf        → extract via PyPDF2 if available; else filename-only
          other       → filename + mime type as context

        Args:
            attachments: List of attachment dicts with "filename" and "storage_path".

        Returns:
            Tuple of (combined_text | None, filename_list | None).
        """
        if not attachments:
            return None, None

        text_parts: List[str] = []
        filenames: List[str] = []

        for att in attachments:
            if not isinstance(att, dict):
                continue

            filename = str(att.get("filename") or att.get("original_filename") or "unknown")
            storage_path = att.get("storage_path") or ""
            filenames.append(filename)

            ext = Path(filename).suffix.lower()

            # Plain text
            if ext in (".txt", ".md"):
                try:
                    file_path = Path(storage_path)
                    if file_path.exists():
                        content = file_path.read_text(encoding="utf-8", errors="ignore")
                        if content.strip():
                            text_parts.append(f"[File: {filename}]\n{content.strip()}")
                            continue
                except Exception as e:
                    logger.debug("Could not read text file %s: %s", filename, e)

            # PDF
            elif ext == ".pdf":
                try:
                    import PyPDF2  # type: ignore
                    file_path = Path(storage_path)
                    if file_path.exists():
                        with open(file_path, "rb") as pdf_file:
                            reader = PyPDF2.PdfReader(pdf_file)
                            pages = []
                            for page in reader.pages:
                                page_text = page.extract_text() or ""
                                if page_text.strip():
                                    pages.append(page_text.strip())
                            if pages:
                                text_parts.append(
                                    f"[File: {filename}]\n" + "\n\n".join(pages)
                                )
                                continue
                except ImportError:
                    logger.debug("PyPDF2 not installed. Using filename-only for %s.", filename)
                except Exception as e:
                    logger.debug("Could not extract PDF text from %s: %s", filename, e)

            # Fallback: filename + extension as context signal
            text_parts.append(f"[Attachment: {filename} — text extraction unavailable]")

        combined = "\n\n".join(text_parts) if text_parts else None
        return combined, filenames if filenames else None
