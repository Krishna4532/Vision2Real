import asyncio
import json
import logging
from typing import Any, Dict, Iterable, List, Optional

from app.services.agents.base_agent import BaseAgent
from app.services.llm.base_provider import LLMProvider
from app.services.prompt_builder import PromptBuilder

logger = logging.getLogger(__name__)


class BaseLLMAgent(BaseAgent):
    """Shared agent wrapper for existing LLM provider + prompt builder infrastructure."""

    def __init__(
        self,
        name: str,
        description: str,
        llm_provider: Optional[LLMProvider] = None,
        prompt_builder: Optional[PromptBuilder] = None,
    ):
        super().__init__(name, description)
        self.llm_provider = llm_provider
        self.prompt_builder = prompt_builder or PromptBuilder()

    def _startup_context(self, context: Dict[str, Any]) -> str:
        idea = context.get("idea_description") or "No startup idea provided."
        target_customer = context.get("target_customer") or "Not specified"
        target_market = context.get("target_market") or "Not specified"
        founder_stage = context.get("founder_stage") or "Not specified"
        attachments = context.get("attachments") or []
        attachment_names = ", ".join(
            str(item.get("filename", "unknown")) for item in attachments if isinstance(item, dict)
        ) or "No attachments"
        return (
            f"Idea description: {idea}\n"
            f"Target customer: {target_customer}\n"
            f"Target market: {target_market}\n"
            f"Founder stage: {founder_stage}\n"
            f"Attachments: {attachment_names}"
        )

    def _as_text(self, value: Any, fallback: str = "Analysis unavailable") -> str:
        if isinstance(value, str) and value.strip():
            return value.strip()
        if value is not None:
            return str(value)
        return fallback

    def _as_list(self, value: Any) -> List[str]:
        if isinstance(value, list):
            return [str(item) for item in value if str(item).strip()]
        if isinstance(value, tuple):
            return [str(item) for item in value if str(item).strip()]
        if isinstance(value, set):
            return [str(item) for item in value if str(item).strip()]
        if isinstance(value, str):
            return [value] if value.strip() else []
        return []

    async def _call_llm(self, *, objective: str, context: Dict[str, Any], extra_instruction: str = "") -> Dict[str, Any]:
        if self.llm_provider is None:
            return {}

        startup_context = self._startup_context(context)
        prompt = self.prompt_builder.build_agent_system_prompt(
            agent_name=self.name,
            objective=objective,
            startup_context=startup_context,
        )
        if extra_instruction:
            prompt = f"{prompt}\n\nExtra instructions:\n{extra_instruction}"

        try:
            result = await self.llm_provider.validate_startup(prompt)
            payload = getattr(result, "payload", {}) or {}
            if not isinstance(payload, dict):
                return {}
            return payload
        except Exception as exc:  # pragma: no cover - defensive failure path
            logger.warning("LLM call failed for %s: %s", self.name, exc)
            return {}


class DocumentParserAgent(BaseLLMAgent):
    def __init__(self, llm_provider: Optional[LLMProvider] = None, prompt_builder: Optional[PromptBuilder] = None):
        super().__init__(
            name="Document Parser",
            description="Parses uploaded pitch decks, business plans, and context files into clean structured text.",
            llm_provider=llm_provider,
            prompt_builder=prompt_builder,
        )

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.mark_running()
        attachments = context.get("attachments", [])
        idea_desc = context.get("idea_description", "")

        payload = await self._call_llm(
            objective="Summarize the startup idea into a structured brief and extract the likely problem, customer, and assumptions.",
            context=context,
            extra_instruction="Return JSON with keys: parsed_text, attachment_count, idea_summary, key_questions, customer_profile.",
        )

        parsed_text = self._as_text(payload.get("parsed_text"), f"Idea Description: {idea_desc}\n")
        if attachments and not payload.get("parsed_text"):
            parsed_text = f"{parsed_text}\nProcessed {len(attachments)} attached documents."

        result = {
            "parsed_text": parsed_text,
            "attachment_count": int(payload.get("attachment_count", len(attachments))),
            "idea_summary": self._as_text(payload.get("idea_summary"), idea_desc or "Idea summary unavailable"),
            "key_questions": self._as_list(payload.get("key_questions")),
            "customer_profile": self._as_text(payload.get("customer_profile"), context.get("target_customer") or "Customer profile unavailable"),
        }

        await asyncio.sleep(0.3)
        self.mark_completed()
        return result


class ResearchAgent(BaseLLMAgent):
    def __init__(self, llm_provider: Optional[LLMProvider] = None, prompt_builder: Optional[PromptBuilder] = None):
        super().__init__(
            name="Research Agent",
            description="Conducts evidence research on problem validity, market demand, and domain signals.",
            llm_provider=llm_provider,
            prompt_builder=prompt_builder,
        )

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.mark_running()
        payload = await self._call_llm(
            objective="Assess the problem, evidence of demand, and the likely customer pain points using only the startup context and available reasoning signals.",
            context=context,
            extra_instruction="Return JSON with keys: research_summary, problem_analysis, customer_pain_points, market_trends, citations.",
        )

        result = {
            "research_summary": self._as_text(
                payload.get("research_summary") or payload.get("analysis"),
                "Research summary unavailable",
            ),
            "problem_analysis": self._as_text(
                payload.get("problem_analysis") or payload.get("analysis"),
                "Analysis unavailable",
            ),
            "customer_pain_points": self._as_list(payload.get("customer_pain_points") or payload.get("weaknesses")),
            "market_trends": self._as_list(payload.get("market_trends") or payload.get("strengths")),
            "citations": self._as_list(payload.get("citations")),
        }
        await asyncio.sleep(0.4)
        self.mark_completed()
        return result


class MarketAnalysisAgent(BaseLLMAgent):
    def __init__(self, llm_provider: Optional[LLMProvider] = None, prompt_builder: Optional[PromptBuilder] = None):
        super().__init__(
            name="Market Intelligence",
            description="Evaluates market sizing (TAM/SAM/SOM), competitive density, and positioning.",
            llm_provider=llm_provider,
            prompt_builder=prompt_builder,
        )

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.mark_running()
        payload = await self._call_llm(
            objective="Analyze market opportunity, competitive landscape, and likely strengths/weaknesses for the startup idea.",
            context=context,
            extra_instruction="Return JSON with keys: market_opportunity, market_size, competitive_landscape, strengths, weaknesses, opportunities, threats.",
        )

        result = {
            "market_opportunity": self._as_text(
                payload.get("market_opportunity") or payload.get("analysis") or payload.get("market_size"),
                "Analysis unavailable",
            ),
            "market_size": self._as_text(payload.get("market_size"), "Market size unavailable"),
            "competitive_landscape": self._as_text(payload.get("competitive_landscape"), "Analysis unavailable"),
            "strengths": self._as_list(payload.get("strengths")),
            "weaknesses": self._as_list(payload.get("weaknesses")),
            "opportunities": self._as_list(payload.get("opportunities")),
            "threats": self._as_list(payload.get("threats")),
        }
        await asyncio.sleep(0.4)
        self.mark_completed()
        return result


class BusinessModelAgent(BaseLLMAgent):
    def __init__(self, llm_provider: Optional[LLMProvider] = None, prompt_builder: Optional[PromptBuilder] = None):
        super().__init__(
            name="Business Model Agent",
            description="Analyzes monetization strategy, value proposition, and customer acquisition channels.",
            llm_provider=llm_provider,
            prompt_builder=prompt_builder,
        )

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.mark_running()
        payload = await self._call_llm(
            objective="Analyze the business model, monetization, and value proposition for the startup.",
            context=context,
            extra_instruction="Return JSON with keys: solution_analysis, value_proposition, business_model, revenue_model, pricing_strategy.",
        )

        result = {
            "solution_analysis": self._as_text(payload.get("solution_analysis") or payload.get("analysis"), "Analysis unavailable"),
            "value_proposition": self._as_text(payload.get("value_proposition") or payload.get("analysis"), "Analysis unavailable"),
            "business_model": self._as_text(payload.get("business_model"), "Business model unavailable"),
            "revenue_model": self._as_text(payload.get("revenue_model"), "Revenue model unavailable"),
            "pricing_strategy": self._as_text(payload.get("pricing_strategy"), "Pricing strategy unavailable"),
        }
        await asyncio.sleep(0.3)
        self.mark_completed()
        return result


class FinancialAgent(BaseLLMAgent):
    def __init__(self, llm_provider: Optional[LLMProvider] = None, prompt_builder: Optional[PromptBuilder] = None):
        super().__init__(
            name="Financial Agent",
            description="Projects revenue growth, margin structure, unit economics, and capital efficiency.",
            llm_provider=llm_provider,
            prompt_builder=prompt_builder,
        )

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.mark_running()
        payload = await self._call_llm(
            objective="Estimate revenue potential, operating model, and investment needs for the startup idea.",
            context=context,
            extra_instruction="Return JSON with keys: financial_outlook, estimated_revenue, estimated_costs, unit_economics, funding_requirements.",
        )

        result = {
            "financial_outlook": self._as_text(payload.get("financial_outlook") or payload.get("analysis"), "Analysis unavailable"),
            "estimated_revenue": self._as_text(payload.get("estimated_revenue"), "Revenue estimate unavailable"),
            "estimated_costs": self._as_text(payload.get("estimated_costs"), "Cost estimate unavailable"),
            "unit_economics": self._as_text(payload.get("unit_economics"), "Unit economics unavailable"),
            "funding_requirements": self._as_text(payload.get("funding_requirements"), "Funding requirement unavailable"),
        }
        await asyncio.sleep(0.3)
        self.mark_completed()
        return result


class RiskAnalysisAgent(BaseLLMAgent):
    def __init__(self, llm_provider: Optional[LLMProvider] = None, prompt_builder: Optional[PromptBuilder] = None):
        super().__init__(
            name="Risk Analysis Agent",
            description="Stress-tests technical feasibility, market adoption risks, and competitive threats.",
            llm_provider=llm_provider,
            prompt_builder=prompt_builder,
        )

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.mark_running()
        payload = await self._call_llm(
            objective="Identify and prioritize the most likely startup risks by category and explain how they could affect the venture.",
            context=context,
            extra_instruction="Return JSON with keys: risk_assessment, technical_risks, market_risks, execution_risks, legal_risks.",
        )

        result = {
            "risk_assessment": self._as_text(payload.get("risk_assessment") or payload.get("analysis"), "Analysis unavailable"),
            "technical_risks": self._as_list(payload.get("technical_risks")),
            "market_risks": self._as_list(payload.get("market_risks")),
            "execution_risks": self._as_list(payload.get("execution_risks")),
            "legal_risks": self._as_list(payload.get("legal_risks")),
        }
        await asyncio.sleep(0.4)
        self.mark_completed()
        return result


class ScoringAgent(BaseLLMAgent):
    def __init__(self, llm_provider: Optional[LLMProvider] = None, prompt_builder: Optional[PromptBuilder] = None):
        super().__init__(
            name="Scoring Agent",
            description="Calculates dimensional scorecards, confidence metrics, and deterministic verdict.",
            llm_provider=llm_provider,
            prompt_builder=prompt_builder,
        )

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.mark_running()
        payload = await self._call_llm(
            objective="Score the venture across market, business model, feasibility, and risk using the upstream agent outcomes.",
            context=context,
            extra_instruction="Return JSON with keys: overall_score, market_score, business_model_score, feasibility_score, risk_score, confidence_score, recommendation.",
        )

        result = {
            "overall_score": float(payload.get("overall_score", 0.0)),
            "market_score": float(payload.get("market_score", 0.0)),
            "business_model_score": float(payload.get("business_model_score", 0.0)),
            "feasibility_score": float(payload.get("feasibility_score", 0.0)),
            "risk_score": float(payload.get("risk_score", 0.0)),
            "confidence_score": float(payload.get("confidence_score", 0.0)),
            "recommendation": self._as_text(payload.get("recommendation"), "PROCEED").upper(),
        }
        await asyncio.sleep(0.3)
        self.mark_completed()
        return result


class ReportGenerationAgent(BaseLLMAgent):
    def __init__(self, llm_provider: Optional[LLMProvider] = None, prompt_builder: Optional[PromptBuilder] = None):
        super().__init__(
            name="Report Generator",
            description="Synthesizes all agent outputs into structured executive report data.",
            llm_provider=llm_provider,
            prompt_builder=prompt_builder,
        )

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.mark_running()
        payload = await self._call_llm(
            objective="Write the final executive summary and identify the key findings to include in the validation report.",
            context=context,
            extra_instruction="Return JSON with keys: executive_summary, next_steps, key_findings.",
        )

        result = {
            "executive_summary": self._as_text(payload.get("executive_summary") or payload.get("analysis"), "Executive summary unavailable"),
            "next_steps": self._as_list(payload.get("next_steps")),
            "key_findings": self._as_list(payload.get("key_findings") or payload.get("strengths")),
        }
        await asyncio.sleep(0.3)
        self.mark_completed()
        return result
