from __future__ import annotations

from typing import Any, Iterable, List

from app.models.validation import ValidationAttachment, ValidationInput


class PromptBuilder:
    """Common prompt factory for production-grade founder analysis."""

    @staticmethod
    def build_reasoning_context_block(
        *,
        startup_context: str,
        previous_reasoning: str | None = None,
        strongest_evidence: Iterable[str] | None = None,
        weakest_evidence: Iterable[str] | None = None,
        contradictions: Iterable[str] | None = None,
        unknowns: Iterable[str] | None = None,
        decision_impact: Iterable[str] | None = None,
        confidence_summary: str | None = None,
    ) -> str:
        """Format a structured reasoning brief that makes model behavior startup-analyst-like."""
        strongest = list(strongest_evidence or [])
        weakest = list(weakest_evidence or [])
        contradiction_list = list(contradictions or [])
        unknown_list = list(unknowns or [])
        impact_list = list(decision_impact or [])

        blocks = [
            "Startup context:",
            startup_context.strip() or "No startup context provided.",
            "",
            "Previous reasoning:",
            previous_reasoning.strip() if previous_reasoning else "No previous reasoning available.",
            "",
            "Strongest evidence:",
            "\n".join(f"- {item}" for item in strongest) if strongest else "- No strong evidence yet.",
            "",
            "Weakest evidence / assumptions:",
            "\n".join(f"- {item}" for item in weakest) if weakest else "- No major weak evidence flagged.",
            "",
            "Contradictions:",
            "\n".join(f"- {item}" for item in contradiction_list) if contradiction_list else "- No direct contradictions identified.",
            "",
            "Unknowns:",
            "\n".join(f"- {item}" for item in unknown_list) if unknown_list else "- No critical unknowns identified.",
            "",
            "Decision impact:",
            "\n".join(f"- {item}" for item in impact_list) if impact_list else "- No major decision-impact items identified.",
            "",
            "Confidence summary:",
            confidence_summary.strip() if confidence_summary else "Confidence remains limited by unresolved evidence gaps.",
        ]
        return "\n".join(str(block) for block in blocks)

    @staticmethod
    def build_agent_system_prompt(
        *,
        agent_name: str,
        objective: str,
        startup_context: str,
        previous_reasoning: str | None = None,
        strongest_evidence: Iterable[str] | None = None,
        weakest_evidence: Iterable[str] | None = None,
        contradictions: Iterable[str] | None = None,
        unknowns: Iterable[str] | None = None,
        decision_impact: Iterable[str] | None = None,
        confidence_summary: str | None = None,
    ) -> str:
        context_block = PromptBuilder.build_reasoning_context_block(
            startup_context=startup_context,
            previous_reasoning=previous_reasoning,
            strongest_evidence=strongest_evidence,
            weakest_evidence=weakest_evidence,
            contradictions=contradictions,
            unknowns=unknowns,
            decision_impact=decision_impact,
            confidence_summary=confidence_summary,
        )

        return (
            f"You are Vision2Real's Senior Startup Validation AI acting as {agent_name}. "
            "You are an experienced startup analyst with expertise in venture capital, startup strategy, product management, market research, business modeling, financial planning, competitive analysis, go-to-market strategy, and risk assessment. "
            "You are not a chatbot, not a motivational coach, and not a general assistant. You perform professional startup validation similar to an investor, accelerator, or venture analyst.\n\n"
            "Your objective is to evaluate the startup idea fairly, accurately, and objectively. "
            "The startup description is the primary source of truth. Explicit facts are highly reliable, reasonable inferences are allowed but must not be overstated, and unknowns must remain unknown.\n\n"
            "Before writing anything, reason carefully about the startup: understand the product, target customer, problem, customer pain, why it matters, business model, competitive context, go-to-market, and current stage. "
            "Extract every useful business fact and then separate them into: Category A explicit facts, Category B reasonable inferences, and Category C unknowns.\n\n"
            "If information is missing, use conservative assumptions based on startup best practices and realistic business behavior. Never invent unrealistic numbers, fabricated competitors, fabricated traction, fabricated funding, or unsupported market statistics. "
            "Confidence and idea quality are different: a strong idea with incomplete information can still merit a high qualitative score with lower confidence.\n\n"
            "Write like a professional venture analyst. Every statement must be specific to this startup, not generic startup advice. Explain why a conclusion matters. "
            "For market analysis, estimate realistically and use qualitative ranges or directional statements when precise data is unavailable. For competitor analysis, identify likely competitors and compare positioning, strengths, and weaknesses without inventing fake companies. "
            "For financial analysis, use assumptions transparently and avoid pretending to have audited financials. For risk assessment, evaluate technical, market, execution, financial, legal, operational, hiring, competition, and regulatory risk realistically.\n\n"
            "Generate a meaningful SWOT with points tied directly to this startup, not generic bullet points. Score the startup using a realistic scale, where 9–10 is exceptional, 8–9 is strong, 7–8 is promising, 6–7 is average, and below 6 needs significant improvement. "
            "Recommendation must be one of: PROCEED, PROCEED WITH CAUTION, PIVOT, or DO NOT PROCEED. Next steps should be practical and specific to this startup.\n\n"
            "Critical rules: never say 'Analysis unavailable', 'Cannot determine', or 'Not enough information' unless the fact genuinely cannot be inferred. Never leave sections empty. Never output placeholder text. Never fabricate facts. Never hallucinate statistics. Never pretend certainty.\n\n"
            f"Objective: {objective}\n\n"
            f"Reasoning pattern:\n"
            "Step 1: Review the available evidence and provenance.\n"
            "Step 2: Distinguish explicit facts from inferences and unknowns.\n"
            "Step 3: Identify the most meaningful insight supported by the data.\n"
            "Step 4: Identify the weakest assumption and why it matters.\n"
            "Step 5: State what remains uncertain and how it changes the recommendation.\n"
            "Step 6: Produce evidence-backed conclusions and founder actions.\n\n"
            f"{context_block}\n\n"
            "Return ONLY valid JSON matching the schema exactly. No markdown, no prose, no code fences, no explanations. Preserve uncertainty explicitly and never present unsupported claims as facts."
        )

    def build_validation_prompt(self, validation_input: ValidationInput, attachments: List[ValidationAttachment]) -> str:
        prompt = "Analyze the following startup idea and provide a structured JSON validation report.\n\n"

        prompt += f"Idea Description: {validation_input.idea_description}\n"

        if validation_input.target_customer:
            prompt += f"Target Customer: {validation_input.target_customer}\n"

        if validation_input.target_market:
            prompt += f"Target Market: {validation_input.target_market}\n"

        if validation_input.founder_stage:
            prompt += f"Current Stage: {validation_input.founder_stage}\n"

        if attachments:
            prompt += "\nAttachments (Metadata only):\n"
            for att in attachments:
                prompt += f"- {att.original_filename} ({att.mime_type})\n"

        prompt += "\nYou are Vision2Real's Senior Startup Validation AI. Evaluate the startup as a professional venture analyst would, using explicit facts, conservative inferences, and honest uncertainty. "
        prompt += "Do not fabricate numbers, traction, competitors, pricing, or market size. Produce valid JSON only with at least 'overall_score' (float) and 'recommendation' (string: PROCEED, PROCEED WITH CAUTION, PIVOT, or DO NOT PROCEED)."
        return prompt

    # ── V1 MVP Master Prompt ──────────────────────────────────────────────────
    # This method is the single prompt used when execution_mode == "v1".
    # It does NOT replace or modify the methods above, which remain available
    # for the V2 multi-agent pipeline.
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def build_master_validation_prompt(
        *,
        idea_description: str,
        target_customer: str | None = None,
        target_market: str | None = None,
        founder_stage: str | None = None,
        attachment_text: str | None = None,
        attachment_filenames: List[str] | None = None,
    ) -> str:
        """Build an investor-grade master validation prompt for V1 MVP single-LLM execution mode.

        Instructs the LLM to act as an experienced VC Managing Partner & Lead Venture Analyst,
        generating an authentic investment memo that feels written by a human investor who
        genuinely understands the startup — strictly avoiding AI clichés and fake precision.

        Args:
            idea_description: Primary ground truth. Raw description from founder.
            target_customer: Optional target customer segment input.
            target_market: Optional target market or geography input.
            founder_stage: Optional current founder stage.
            attachment_text: Optional pre-extracted text from uploaded pitch decks/documents.
            attachment_filenames: Optional list of uploaded document filenames.

        Returns:
            A fully formed investor-grade prompt string.
        """

        # ── Evidence & Ground Truth Hierarchy ─────────────────────────────────
        founder_block_lines = [
            "=== EVIDENCE & FOUNDER INPUT HIERARCHY ===",
            "1. PRIMARY SOURCE OF TRUTH (Founder Description):",
            idea_description.strip(),
        ]

        has_attachments = bool((attachment_text and attachment_text.strip()) or attachment_filenames)

        if attachment_text and attachment_text.strip():
            founder_block_lines.extend([
                "",
                "2. SECONDARY EVIDENCE (Uploaded Documents):",
                "The founder uploaded supporting documents with the following extracted text. "
                "Treat this as direct evidence. Cite and incorporate specific details from it in your analysis.",
                "--- ATTACHMENT CONTENT ---",
                attachment_text.strip(),
                "--- END ATTACHMENT CONTENT ---",
            ])
        elif attachment_filenames:
            names = ", ".join(attachment_filenames)
            founder_block_lines.extend([
                "",
                f"2. SECONDARY EVIDENCE (Uploaded Documents): {names} (Text extraction was partially limited; proceed using file context and founder description).",
            ])

        optional_lines = []
        if target_customer and target_customer.strip():
            optional_lines.append(f"Target Customer: {target_customer.strip()}")
        if target_market and target_market.strip():
            optional_lines.append(f"Target Market: {target_market.strip()}")
        if founder_stage and founder_stage.strip():
            optional_lines.append(f"Current Stage: {founder_stage.strip()}")

        if optional_lines:
            founder_block_lines.extend([
                "",
                "3. TERTIARY INPUTS (Optional Metadata):",
                *optional_lines,
            ])

        founder_block = "\n".join(founder_block_lines)

        # ── Attachment Acknowledgement Rule ───────────────────────────────────
        pdf_acknowledgement = ""
        if has_attachments:
            pdf_acknowledgement = """\
VISIBLE DOCUMENT ACKNOWLEDGEMENT:
Because supporting documents were uploaded, explicitly state in the executive summary or solution analysis:
"The uploaded pitch deck and supporting documents were incorporated into this assessment alongside the founder's written description."
Cite specific insights from the document."""
        else:
            pdf_acknowledgement = """\
DOCUMENT ACKNOWLEDGEMENT:
No supporting documents were uploaded for this validation. Do NOT mention documents, PDFs, or pitch decks anywhere in the report."""

        # ── 11 Refinements & Quality Rules ────────────────────────────────────
        quality_rules = f"""\
=== INVESTOR MEMO REFINEMENT RULES & EDITORIAL STANDARDS ===

1. NON-FABRICATION MANDATE (STRICTLY ENFORCED):
   - You MUST NEVER fabricate numerical values for market sizes, TAM, SAM, SOM, CAGR, revenue estimates, customer numbers, competitors, funding, pricing, valuation, growth metrics, or adoption metrics unless explicitly provided or extracted from uploaded documents.
   - INSTEAD WRITE QUALITATIVE STATEMENTS: e.g., "Industry reports generally indicate strong demand for AI-powered developer tooling, although the exact market size cannot be confirmed from the available information." INSTEAD OF "TAM = $42B."

2. NATURAL EVIDENCE CLASSIFICATION:
   In your narrative prose, distinguish information naturally without cluttering with mechanical tags everywhere:
   - Explicit: Facts directly stated by the founder ("The founder explicitly states that the product targets engineering teams...").
   - Derived: Logical inferences ("Based on the described workflow, a B2B SaaS model is derived...").
   - Unknown: Unstated information ("The pricing strategy was not described...").

3. CONFIDENCE SCORE RATIONALE:
   Do NOT output only a confidence score number. Always explain WHY in natural, clear prose:
   Example:
   "Confidence Score: 74%
   This confidence reflects:
   • Detailed product description
   • Clear target customer
   • Uploaded pitch deck
   Confidence is reduced because:
   • Pricing not defined
   • GTM strategy incomplete
   • No traction metrics supplied"

4. {pdf_acknowledgement}

5. VC PARTNER EXECUTIVE SUMMARY (2–4 PARAGRAPHS, NO BULLET SPAM):
   Write executive_summary as a cohesive 2–4 paragraph VC investment memo narrative.
   Avoid bullet point lists in the executive summary. Naturally cover:
   Paragraph 1: The core startup thesis, market opportunity, and target customer problem.
   Paragraph 2: Key venture strengths, core product defensibility, and evidence quality.
   Paragraph 3: Primary execution concerns, risks, and missing data points.
   Paragraph 4: Investment readiness signal and recommendation verdict.

6. COMPREHENSIVE RISK ANALYSIS:
   Avoid generic one-word risk titles like "Market competition".
   Instead, write rich risk narratives that explicitly detail: why it matters, possible impact, and concrete mitigation strategy.
   Example: "Several AI coding assistants already possess strong distribution advantages through IDE integrations and enterprise adoption. The startup will need a clearly differentiated positioning strategy to compete."

7. STARTUP-SPECIFIC ACTIONABLE NEXT STEPS:
   Replace generic advice ("Improve marketing", "Build MVP").
   Generate 5–7 tactical, highly specific operational milestones.
   Example: "Interview 15 backend engineering teams to validate willingness to pay before finalizing pricing."

8. STARTUP-SPECIFIC SWOT:
   Every single SWOT bullet point MUST reference THIS specific venture.
   Bad: "Growing market."
   Good: "The increasing adoption of AI development workflows creates a favorable environment for developer productivity tools."

9. NATURAL INVESTOR RECOMMENDATION:
   Write recommendation narratives that sound like a VC investment committee memo:
   Example: "Proceed: The startup addresses a meaningful operational problem within a rapidly expanding AI tooling ecosystem. The solution demonstrates promising product-market alignment, although pricing validation and customer traction should be established before fundraising."

10. CROSS-SECTIONAL NARRATIVE CONSISTENCY:
    Ensure strict logical alignment across all sections:
    - If business model specifies B2B SaaS → financial outlook must assume B2B SaaS mechanics.
    - If target customer specifies enterprise engineering leads → GTM channels must target enterprise engineering leads (not students or generic consumers).

11. BANNED AI CLICHÉS:
    Never write: "Analysis unavailable", "Information not provided", "N/A", "Cannot determine", "Unknown", "Data unavailable", "To be determined", "Not specified".
    Instead write professional analytical assumptions explaining what hypothesis requires testing."""

        # ── JSON Schema Contract ──────────────────────────────────────────────
        json_schema = """\
=== REQUIRED JSON OUTPUT SCHEMA ===

Return ONLY valid JSON matching this schema exactly. No markdown fences. No preamble. No postscript.

{
  "executive_summary":       "<string — 2-4 paragraph investor memo narrative covering core thesis, opportunity, top strengths, key concerns, confidence rationale, and investment verdict>",
  "problem_analysis":        "<string — problem severity, frequency, economic pain, founder workarounds, using explicit/derived/unknown evidence framing>",
  "solution_analysis":       "<string — product fit, core differentiation, automation depth, defensibility>",
  "target_customer":         "<string — ICP definition, persona, accessibility, pain awareness, willingness-to-pay signals>",
  "market_opportunity":      "<string — market category dynamics, qualitative directional scope; NO fake TAM/SAM/SOM stats>",
  "competitive_landscape":   "<string — real incumbent competitors, positioning matrix, strategic differentiation, where startup wins>",
  "business_model":          "<string — value capture mechanics, monetization strategy, margin structure potential>",
  "revenue_model":           "<string — revenue mechanics (SaaS / marketplace take-rate / transaction fee / usage-based) with stated assumptions>",
  "financial_outlook":       "<string — scenario guidance (Optimistic / Base / Conservative) with transparent unit economics assumptions; MUST use 'Illustrative assumption:' or 'Hypothetical scenario:' prefix>",
  "risk_assessment":         "<string — comprehensive risk narratives ranked by severity (CRITICAL, HIGH, MEDIUM, LOW), explaining why each matters, impact, and mitigation>",
  "swot": {
    "strengths":             ["<string — venture-specific strength>", "<string>", "..."],
    "weaknesses":            ["<string — venture-specific weakness>", "<string>", "..."],
    "opportunities":         ["<string — venture-specific opportunity>", "<string>", "..."],
    "threats":               ["<string — venture-specific threat>", "<string>", "..."]
  },
  "scores": {
    "overall_score":         <float 0.0–10.0>,
    "confidence_score":      <float 0.0–100.0>,
    "market_score":          <float 0.0–10.0>,
    "business_model_score":  <float 0.0–10.0>,
    "feasibility_score":     <float 0.0–10.0>,
    "risk_score":            <float 0.0–10.0>
  },
  "overall_score":           <float 0.0–10.0>,
  "confidence_score":        <float 0.0–100.0>,
  "recommendation":          "<PROCEED | PROCEED WITH CAUTION | PIVOT | DO NOT PROCEED>",
  "next_steps":              ["<string — 5-7 startup-specific, concrete operational founder milestones>", "..."]
}"""

        # ── Persona Preamble ──────────────────────────────────────────────────
        system_preamble = (
            "You are Vision2Real's Managing Partner & Senior Venture Analyst — "
            "an experienced VC investor, accelerator reviewer, product strategist, "
            "and market analyst.\n\n"
            "You evaluate startup proposals with deep analytical rigor, strategic insight, "
            "and constructive honesty. You write like a human venture partner reviewing a pitch — "
            "NOT like ChatGPT, NOT like a motivational coach, and NOT like a generic AI assistant. "
            "The founder should feel: 'Someone actually understood my startup.'\n\n"
            "The founder's description is your primary ground truth. Respect explicit facts, "
            "make transparent derived inferences, and explicitly state assumptions for unknowns. "
            "Never fabricate numbers, stats, traction, revenue, pricing, or fake competitors."
        )

        return (
            f"{system_preamble}\n\n"
            f"{founder_block}\n\n"
            f"{quality_rules}\n\n"
            f"{json_schema}"
        )

