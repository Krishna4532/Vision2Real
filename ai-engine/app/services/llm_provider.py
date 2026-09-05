from __future__ import annotations

import asyncio
import json
import time
from abc import ABC, abstractmethod
from contextvars import ContextVar
from typing import Any, get_args, get_origin

from app.core.logging import logger
from app.schemas.analysis import ClassificationResult, StructuredIdea
from app.services.llm.base_provider import LLMProvider, LLMProviderResult


SECTION_METRICS = ContextVar("section_metrics", default=None)


class ProviderError(RuntimeError):
    """Raised when a provider fails after retries or validation."""


class AuthenticationError(ProviderError):
    """Raised when API credentials are invalid or rejected."""


class RateLimitError(ProviderError):
    """Raised when the provider rejects requests due to rate limiting."""


class QuotaExceededError(ProviderError):
    """Raised when the provider quota is exhausted."""


class ModelNotFoundError(ProviderError):
    """Raised when a requested model does not exist or is unavailable."""


class InvalidJSONError(ProviderError):
    """Raised when the provider response cannot be parsed as JSON."""


class MalformedResponseError(ProviderError):
    """Raised when the provider response is not structurally valid for the requested schema."""


class BaseLLMProvider(LLMProvider, ABC):
    name: str = "base"
    timeout_seconds: float = 45.0
    max_retries: int = 3
    fallback_provider: BaseLLMProvider | None = None

    @staticmethod
    def _classify_provider_exception(exc: Exception) -> ProviderError | None:
        message = str(exc).lower()
        if any(token in message for token in ("429", "resource_exhausted", "quota", "rate limit")):
            return QuotaExceededError(str(exc))
        if any(token in message for token in ("401", "403", "authentication", "invalid api key")):
            return AuthenticationError(str(exc))
        if any(token in message for token in ("404", "model_not_found", "does not exist")):
            return ModelNotFoundError(str(exc))
        return None

    @staticmethod
    def _is_retryable_output_error(exc: Exception) -> bool:
        message = str(exc).lower()
        if any(token in message for token in ("finish_reason", "output limit", "exceeded the output limit", "length", "malformed json", "truncated", "incomplete json")):
            return True
        return False

    @staticmethod
    def _append_retry_hint(prompt: str) -> str:
        return f"{prompt.rstrip()}\n\nYou exceeded the output limit. Continue from where you stopped. Return ONLY valid JSON."

    @staticmethod
    def _record_metric(metric_name: str, delta: int = 1) -> None:
        metrics = SECTION_METRICS.get()
        if metrics is None:
            return
        if metric_name not in metrics:
            metrics[metric_name] = 0
        metrics[metric_name] += delta

    @staticmethod
    def _coerce_value_for_field(value: Any, field: Any) -> Any:
        if value is None:
            return None

        annotation = getattr(field, "annotation", None)
        origin = get_origin(annotation)
        args = get_args(annotation)
        accepts_string = annotation is str or (origin is not None and str in args)

        if origin in (list, set, tuple):
            if isinstance(value, str):
                return [value]
            if isinstance(value, (list, tuple, set)):
                return list(value)
            if isinstance(value, dict):
                return [json.dumps(value, ensure_ascii=False)]
            return [str(value)]

        if origin is dict:
            if isinstance(value, dict):
                return value
            if isinstance(value, str):
                try:
                    parsed = json.loads(value)
                    return parsed if isinstance(parsed, dict) else {"value": value}
                except json.JSONDecodeError:
                    return {"value": value}
            return {"value": str(value)}

        if accepts_string and not isinstance(value, str):
            if isinstance(value, dict):
                ordered_keys = (
                    "type",
                    "name",
                    "title",
                    "value",
                    "summary",
                    "description",
                    "text",
                    "problem",
                    "solution",
                    "business_model",
                    "target_customer",
                )
                for key in ordered_keys:
                    candidate = value.get(key)
                    if isinstance(candidate, str) and candidate.strip():
                        if key == "type" and "summary" in value and isinstance(value["summary"], str) and value["summary"].strip():
                            return f"{candidate}: {value['summary'].strip()}"
                        return candidate
                return json.dumps(value, ensure_ascii=False)
            if isinstance(value, (list, tuple, set)):
                items = [str(item) for item in value]
                return ", ".join(items)
            return str(value)

        return value

    @staticmethod
    def _repair_missing_fields(payload: dict[str, Any], schema: type[Any]) -> dict[str, Any]:
        repaired = dict(payload)
        for field_name, field in getattr(schema, "model_fields", {}).items():
            if field_name in repaired:
                repaired[field_name] = BaseLLMProvider._coerce_value_for_field(repaired[field_name], field)
                continue
            if field.is_required():
                continue
            if field.default_factory is not None:
                repaired[field_name] = field.default_factory()
            else:
                repaired[field_name] = field.default
            BaseLLMProvider._record_metric("repair_count")
        return repaired

    @staticmethod
    def _repair_json_text(text: str) -> str:
        candidate = (text or "").strip()
        if not candidate:
            return candidate

        if candidate.startswith("```json"):
            candidate = candidate.split("```json", 1)[1]
        if candidate.startswith("```"):
            candidate = candidate.split("```", 1)[1]
        if candidate.endswith("```"):
            candidate = candidate.rsplit("```", 1)[0]
        candidate = candidate.strip()

        opener_counts = {"{": 0, "[": 0}
        closer_counts = {"}": 0, "]": 0}
        for char in candidate:
            if char in opener_counts:
                opener_counts[char] += 1
            elif char in closer_counts:
                closer_counts[char] += 1

        if opener_counts["["] > closer_counts["]"]:
            candidate += "]" * (opener_counts["["] - closer_counts["]"])
        if opener_counts["{"] > closer_counts["}"]:
            candidate += "}" * (opener_counts["{"] - closer_counts["}"])

        if candidate.endswith(","):
            candidate = candidate[:-1]
        if candidate and candidate[-1] not in ("}", "]"):
            if opener_counts["["] > closer_counts["]"]:
                candidate += "]"
            elif opener_counts["{"] > closer_counts["}"]:
                candidate += "}"

        if candidate != text.strip():
            BaseLLMProvider._record_metric("repair_count")
        return candidate

    @abstractmethod
    async def generate_structured(self, prompt: str, schema: type[Any], *, system_prompt: str | None = None) -> Any:
        raise NotImplementedError

    async def _call_with_retry(self, operation_name: str, fn, *, schema: type[Any], prompt: str, system_prompt: str | None = None) -> Any:
        last_error: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            started = time.monotonic()
            try:
                result = await asyncio.wait_for(fn(), timeout=self.timeout_seconds)
                latency_ms = round((time.monotonic() - started) * 1000, 2)
                metrics = SECTION_METRICS.get()
                if metrics is not None:
                    metrics["provider_latency_ms"] = latency_ms
                logger.info(
                    "LLM provider call succeeded",
                    extra={
                        "provider": self.name,
                        "operation": operation_name,
                        "attempt": attempt,
                        "latency_ms": latency_ms,
                    },
                )
                return result
            except asyncio.TimeoutError as exc:
                last_error = exc
                logger.warning(
                    "LLM provider timeout",
                    extra={"provider": self.name, "operation": operation_name, "attempt": attempt, "timeout_seconds": self.timeout_seconds},
                )
            except (ValueError, TypeError, json.JSONDecodeError, MalformedResponseError, InvalidJSONError) as exc:
                last_error = exc
                logger.warning(
                    "LLM provider schema or parse error",
                    extra={"provider": self.name, "operation": operation_name, "attempt": attempt, "error": str(exc)},
                )
                if self._is_retryable_output_error(exc) and attempt < self.max_retries:
                    if hasattr(fn, "prompt_ref"):
                        fn.prompt_ref["value"] = self._append_retry_hint(fn.prompt_ref["value"])
                    metrics = SECTION_METRICS.get()
                    if metrics is not None:
                        metrics["retry_count"] = metrics.get("retry_count", 0) + 1
                    await asyncio.sleep(1)
                    continue
            except Exception as exc:  # noqa: BLE001
                mapped_error = self._classify_provider_exception(exc)
                if mapped_error is not None:
                    last_error = mapped_error
                    logger.warning(
                        "LLM provider quota/auth/model issue",
                        extra={"provider": self.name, "operation": operation_name, "attempt": attempt, "error": str(exc), "error_type": type(mapped_error).__name__},
                    )
                    break

                last_error = exc
                logger.warning(
                    "LLM provider call failed",
                    extra={"provider": self.name, "operation": operation_name, "attempt": attempt, "error": str(exc)},
                )

            if last_error is not None and not isinstance(last_error, (QuotaExceededError, AuthenticationError, ModelNotFoundError)):
                if attempt < self.max_retries and not self._is_retryable_output_error(last_error):
                    metrics = SECTION_METRICS.get()
                    if metrics is not None:
                        metrics["retry_count"] = metrics.get("retry_count", 0) + 1
                    await asyncio.sleep(min(2 ** (attempt - 1), 8))

        if self.fallback_provider is not None:
            metrics = SECTION_METRICS.get()
            if metrics is not None:
                metrics["fallback_count"] = metrics.get("fallback_count", 0) + 1
            logger.warning("Falling back to provider %s after %s failures", self.fallback_provider.name, self.name)
            try:
                return await self.fallback_provider.generate_structured(prompt, schema, system_prompt=system_prompt)
            except Exception as fallback_error:  # noqa: BLE001
                raise ProviderError(
                    f"Provider {self.name} failed after retries and fallback provider {self.fallback_provider.name} also failed: {fallback_error}"
                ) from last_error

        raise ProviderError(f"Provider {self.name} failed after retries: {last_error}")

    @property
    def metadata(self) -> dict[str, Any]:
        return {"provider": self.name, "timeout_seconds": self.timeout_seconds, "max_retries": self.max_retries}

    def provider_name(self) -> str:
        return getattr(self, "name", "base")

    async def health_check(self) -> bool:
        api_key = getattr(self, "api_key", None)
        if api_key is not None:
            return bool(api_key)
        return True

    async def validate_startup(self, prompt: str) -> LLMProviderResult:
        t_start = time.monotonic()
        from app.schemas.validation import StructuredValidationReport

        try:
            report_obj = await self.generate_structured(
                prompt,
                schema=StructuredValidationReport,
                system_prompt=(
                    "You are Vision2Real's Senior Startup Validation AI. "
                    "Evaluate the startup as a professional venture analyst would. "
                    "Use explicit facts, conservative inferences, and honest uncertainty. "
                    "Do not fabricate numbers, competitors, pricing, traction, market size, or funding. "
                    "Never output markdown, explanations, or non-JSON text. "
                    "Return ONLY valid JSON matching the requested schema exactly."
                ),
            )
            if hasattr(report_obj, "model_dump"):
                payload = report_obj.model_dump()
            elif isinstance(report_obj, dict):
                payload = report_obj
            else:
                payload = dict(report_obj)
        except Exception as exc:
            logger.warning("validate_startup via generate_structured failed for %s: %s", self.provider_name(), exc)
            payload = {}

        latency_ms = int((time.monotonic() - t_start) * 1000)
        return LLMProviderResult(
            payload=payload,
            provider_name=self.provider_name(),
            model=getattr(self, "model", "unknown"),
            provider_latency_ms=latency_ms,
        )

    @staticmethod
    def _ensure_structured_payload(payload: Any, schema: type[Any]) -> Any:
        if payload is None:
            raise ValueError("LLM returned no payload")
        if isinstance(payload, schema):
            return payload
        if hasattr(payload, "model_dump"):
            payload = payload.model_dump()
        if isinstance(payload, dict):
            repaired = BaseLLMProvider._repair_missing_fields(payload, schema)
            try:
                return schema.model_validate(repaired)
            except Exception:
                # Some providers return nested objects for scalar fields (for example
                # StructuredIdea.business_model as a dict instead of a plain string).
                # Repair the raw payload one more time against the declared schema
                # before failing the whole request.
                normalized = {}
                for field_name, field in getattr(schema, "model_fields", {}).items():
                    value = repaired.get(field_name)
                    if value is None and field_name not in repaired:
                        continue
                    normalized[field_name] = BaseLLMProvider._coerce_value_for_field(value, field)
                try:
                    return schema.model_validate(normalized)
                except Exception:
                    BaseLLMProvider._record_metric("validation_failures")
                    raise
        if isinstance(payload, list):
            try:
                return schema.model_validate(BaseLLMProvider._repair_missing_fields({"items": payload}, schema))
            except Exception:
                BaseLLMProvider._record_metric("validation_failures")
                raise
        raise TypeError(f"LLM payload for schema {schema.__name__} was not a supported structured object")

    @staticmethod
    def _repair_and_validate_json(text: str, schema: type[Any]) -> Any:
        repaired_text = BaseLLMProvider._repair_json_text(text)
        payload = json.loads(repaired_text)
        return BaseLLMProvider._ensure_structured_payload(payload, schema)


class FailureLLMProvider(BaseLLMProvider):
    name = "failure"

    def __init__(self, message: str, *, provider_name: str = "unknown"):
        self.message = message
        self.name = provider_name

    def provider_name(self) -> str:
        return self.name

    async def generate_structured(self, prompt: str, schema: type[Any], *, system_prompt: str | None = None) -> Any:
        raise ProviderError(f"{self.name}: {self.message}")

    async def health_check(self) -> bool:
        return False

    async def validate_startup(self, prompt: str) -> LLMProviderResult:
        raise ProviderError(f"{self.name}: {self.message}")


class MockLLMProvider(BaseLLMProvider):
    name = "mock"

    def __init__(self, response_payload: dict[str, Any] | None = None):
        self.response_payload = response_payload

    async def generate_structured(self, prompt: str, schema: type[Any], *, system_prompt: str | None = None) -> Any:
        """Mock provider returns deterministic objects for testing."""
        # Import analysis output schemas
        from app.services.agent_services import (
            MarketAnalysisOutput,
            CompetitionAnalysisOutput,
            CompetitorProfile,
            CustomerAnalysisOutput,
            BusinessModelAnalysisOutput,
            FeasibilityAnalysisOutput,
            FinancialAnalysisOutput,
            RiskAnalysisOutput,
            RiskItemOutput,
            RedTeamAnalysisOutput,
            ValidationPlanOutput,
            DecisionAnalysisOutput,
        )

        if self.response_payload is not None:
            payload = self.response_payload
            if schema is StructuredIdea:
                if not {"problem", "solution", "target_customer", "industry_category"}.issubset(payload.keys()):
                    raise ValueError("Malformed LLM output: missing required idea structure fields")
                return StructuredIdea.model_validate(payload)
            if schema is ClassificationResult:
                if "labels" not in payload:
                    raise ValueError("Malformed LLM output: missing labels for classification")
                return ClassificationResult.model_validate(payload)
            return schema.model_validate(payload)

        prompt_lower = prompt.lower()

        # Handle StructuredIdea
        if schema is StructuredIdea:
            if "ai tutor" in prompt_lower:
                return StructuredIdea(
                    problem="Students struggle to get personalized, affordable, on-demand tutoring.",
                    solution="AI-powered tutor that adapts explanations to student needs.",
                    target_customer="College students",
                    industry_category="Education",
                    geography="unknown",
                    business_model="unknown",
                    assumptions=["There is demand for personalized tutoring."],
                    unknowns=["Pricing model", "Primary market", "Customer acquisition strategy"],
                    clarifying_questions=["Which student segment are you targeting?"],
                )
            elif "app idea" in prompt_lower:
                return StructuredIdea(
                    problem="The founder has a broad idea but no defined product or customer problem yet.",
                    solution="A product idea needs more clarity before validation.",
                    target_customer="unknown",
                    industry_category="unknown",
                    geography="unknown",
                    business_model="unknown",
                    assumptions=[],
                    unknowns=["Target customer", "Problem to solve", "Market category", "Business model"],
                    clarifying_questions=["What problem are you solving for whom?"],
                )
            else:
                return StructuredIdea(
                    problem="The founder has a product concept but details are not fully specified.",
                    solution="A product should be refined through structured discovery.",
                    target_customer="unknown",
                    industry_category="unknown",
                    geography="unknown",
                    business_model="unknown",
                    assumptions=[],
                    unknowns=["Target customer", "Problem", "Market", "Business model"],
                    clarifying_questions=["Define the customer and the value proposition."],
                )

        # Handle ClassificationResult
        if schema is ClassificationResult:
            if "ai tutor" in prompt_lower:
                return ClassificationResult(labels=["AI", "Education", "B2C", "SaaS"], confidence=0.88)
            elif "app idea" in prompt_lower:
                return ClassificationResult(labels=["Unspecified"], confidence=0.1)
            else:
                return ClassificationResult(labels=["General"], confidence=0.2)

        # Handle MarketAnalysisOutput
        if schema is MarketAnalysisOutput:
            return MarketAnalysisOutput(
                market_exists=True,
                market_category="Technology" if "tutor" in prompt_lower else "General",
                market_maturity="growing",
                geography="North America",
                demand_signals=["Growing demand for innovative solutions"],
                growth_opportunities=["Expansion to new customer segments"],
                market_constraints=["Competitive landscape"],
                regulatory_considerations=["Standard industry regulations"],
                reasoning="Market analysis based on industry trends and founder insights.",
            )

        # Handle CompetitionAnalysisOutput
        if schema is CompetitionAnalysisOutput:
            competitors = [
                CompetitorProfile(
                    name="Competitor A",
                    website="https://competitora.com",
                    pricing="$99/month",
                    strengths=["Brand recognition", "Large user base"],
                    weaknesses=["Poor UX", "Outdated technology"],
                    market_position="Market leader",
                    differentiation_opportunity="Better user experience and modern tech stack",
                ),
                CompetitorProfile(
                    name="Competitor B",
                    website="https://competitorb.com",
                    pricing="$49/month",
                    strengths=["Established distribution"],
                    weaknesses=["Limited personalization"],
                    market_position="Established alternative",
                    differentiation_opportunity="Offer more personalized learning",
                ),
                CompetitorProfile(
                    name="Competitor C",
                    website="https://competitorc.com",
                    pricing="Freemium",
                    strengths=["Large free user base"],
                    weaknesses=["Basic support"],
                    market_position="Low-cost alternative",
                    differentiation_opportunity="Provide guided support and outcomes",
                ),
            ]
            return CompetitionAnalysisOutput(
                direct_competitors=competitors if "tutor" in prompt_lower else [],
                indirect_competitors=[],
                competitive_landscape="The market includes established direct and low-cost alternatives.",
                market_gaps=["Better onboarding for new users"],
                differentiation_strategy="Focus on user experience and modern technology",
                competitive_risks=["Incumbents may respond with similar features"],
                reasoning="Competition analysis based on available market data.",
            )

        # Handle CustomerAnalysisOutput
        if schema is CustomerAnalysisOutput:
            is_known_customer = "unknown" not in prompt_lower
            return CustomerAnalysisOutput(
                ideal_customer_profile=(
                    "Tech-savvy learners seeking accessible, personalized tutoring."
                    if is_known_customer else "UNKNOWN"
                ),
                customer_personas=[
                    {
                        "title": "Early Adopter Alex",
                        "pain_points": ["Expensive tutoring", "Limited access to help"],
                        "goals": ["Improve academic performance"],
                        "buying_motivation": "Affordable, on-demand support",
                        "willingness_to_pay": "Hypothesis: willing to pay a modest monthly fee",
                        "adoption_friction": ["Trust in AI answers"],
                        "channel_preference": "Campus communities",
                    }
                ] if is_known_customer else [],
                market_segments=["College students", "Adult learners"] if is_known_customer else [],
                customer_acquisition_strategy="Content marketing and campus partnerships",
                retention_drivers=["Continuous feature improvements", "Strong customer support"],
                customer_needs_evidence=(
                    ["Learners need affordable, on-demand tutoring."] if is_known_customer else []
                ),
                reasoning="Customer analysis based on the target customer and stated problem.",
            )

        # Handle BusinessModelAnalysisOutput
        if schema is BusinessModelAnalysisOutput:
            return BusinessModelAnalysisOutput(
                revenue_model="Subscription SaaS",
                pricing_strategy="$99-999/month tiered pricing",
                cost_structure="Infrastructure, customer support, and R&D costs",
                unit_economics_estimate="CLV:CAC ratio requires validation",
                customer_lifetime_value="UNKNOWN",
                customer_acquisition_cost="UNKNOWN",
                monetization_options=["Subscription tiers", "Institutional licensing"],
                scalability="Can scale with efficient model serving",
                business_viability="Potentially viable with strong execution",
                reasoning="Business model analysis based on industry benchmarks and founder goals.",
            )

        # Handle FeasibilityAnalysisOutput
        if schema is FeasibilityAnalysisOutput:
            return FeasibilityAnalysisOutput(
                core_product="Core features and basic integrations",
                mvp_scope=["Core features", "Basic integrations"],
                technical_complexity="Medium",
                technology_stack_recommendation="Web application with managed AI services",
                infrastructure_requirements="Application hosting, database, and model-serving infrastructure",
                development_timeline="6-9 months",
                key_technical_risks=["Third-party API reliability", "Data scalability"],
                integrations_needed=["Identity and payment providers"],
                reasoning="Feasibility assessment based on technical requirements.",
                feasibility_level="medium",
            )

        # Handle FinancialAnalysisOutput
        if schema is FinancialAnalysisOutput:
            return FinancialAnalysisOutput(
                startup_costs="$250,000",
                year1_revenue_estimate="$100,000",
                year3_revenue_estimate="$2,000,000",
                gross_margin_estimate="60%",
                burn_rate_estimate="$30,000/month",
                funding_requirement="$500,000",
                break_even_timeline="18-24 months",
                key_assumptions=["20% month-over-month growth", "$5,000 average contract value"],
                reasoning="Financial projections based on SaaS benchmarks and founder assumptions.",
                runway_months="8 months",
            )

        # Handle RiskAnalysisOutput
        if schema is RiskAnalysisOutput:
            return RiskAnalysisOutput(
                risks=[
                    RiskItemOutput(
                        category="market",
                        risk_statement="Market may adopt competing solutions faster",
                        likelihood="medium",
                        severity="high",
                        impact="Slower adoption could limit growth.",
                        mitigation_strategy="Rapid MVP deployment and early customer feedback",
                    ),
                    RiskItemOutput(
                        category="technical",
                        risk_statement="Third-party API dependencies may change",
                        likelihood="low",
                        severity="medium",
                        impact="Changes could interrupt product functionality.",
                        mitigation_strategy="Build abstraction layer for API integrations",
                    ),
                ],
                most_critical_risk="Market may adopt competing solutions faster",
                risk_mitigation_priorities=["Validate demand", "Test API resilience"],
                overall_risk_profile="Moderate execution risk",
                reasoning="Risk analysis based on industry challenges and technical dependencies.",
            )

        # Handle RedTeamAnalysisOutput
        if schema is RedTeamAnalysisOutput:
            return RedTeamAnalysisOutput(
                objections=[
                    {
                        "assumption_challenged": "Customers will switch from existing solutions",
                        "objection": "Why would customers switch from existing solutions?",
                        "severity": "HIGH",
                        "evidence_supporting_objection": "Incumbent switching costs and customer inertia",
                        "how_to_disprove": "Case studies showing successful customer migration",
                    },
                    {
                        "assumption_challenged": "The business can scale profitably",
                        "objection": "Can the business scale profitably?",
                        "severity": "MEDIUM",
                        "evidence_supporting_objection": "SaaS unit economics are challenging at scale",
                        "how_to_disprove": "Demonstrate sustainable unit economics",
                    },
                ],
                strongest_objection="Why would customers switch from existing solutions?",
                weakest_link="Unproven willingness to pay at the assumed price point.",
                fatal_flaws_identified=False,
                reasons_startup_could_fail=[
                    "Customers may not switch from existing solutions.",
                    "Unit economics may not hold at scale.",
                ],
                reasoning="Red team analysis identifying critical assumptions to test.",
            )

        # Handle ValidationPlanOutput
        if schema is ValidationPlanOutput:
            return ValidationPlanOutput(
                critical_unknowns=["Customer willingness to pay", "Market size", "Product-market fit"],
                experiments=[
                    {
                        "question": "Will target customers pay?",
                        "why_matters": "Pricing determines viability.",
                        "method": "Interview target customers and test paid pilots.",
                        "timeline": "2 weeks",
                        "success_criteria": "Multiple customers commit to a paid pilot.",
                        "resources_needed": "Founder time and prototype",
                        "priority": "high",
                    },
                ],
                validation_roadmap="Validate demand, pricing, and repeat usage in sequence.",
                decision_criteria="Proceed when customers demonstrate willingness to pay.",
                reasoning="Validation plan for de-risking key assumptions.",
            )

        # Handle DecisionAnalysisOutput
        if schema is DecisionAnalysisOutput:
            return DecisionAnalysisOutput(
                proposed_decision="VALIDATE",
                rationale=["Evidence base is directionally supportive but not yet sufficient for a build decision."],
                confidence=0.5,
                missing_evidence=["Direct customer willingness-to-pay signal", "Validated unit economics"],
                assumptions=["Target customer segment remains as described", "No major competitive shift"],
                tradeoffs=["Faster validation vs. more rigorous evidence gathering"],
                milestones=["Complete customer discovery interviews", "Confirm pricing willingness"],
                reasoning="Advisory recommendation based on available evidence; deterministic rules remain authoritative.",
            )

        raise TypeError(f"Unsupported schema type: {schema}")


class OpenAIProvider(BaseLLMProvider):
    """OpenAI LLM provider using the OpenAI API."""

    name = "openai"

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = 45.0
        self.max_retries = 3
        try:
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(api_key=api_key)
        except ImportError:
            raise ImportError("openai library is not installed. Install with: pip install openai")

    async def _generate(self, prompt: str, schema: type[Any], *, system_prompt: str | None = None) -> Any:
        from openai import OpenAI

        schema_json = schema.model_json_schema()
        system_msg = (system_prompt or "You are a helpful assistant that provides structured analysis.")
        system_msg += f"\n\nRespond with ONLY valid JSON matching this schema:\n{json.dumps(schema_json, indent=2)}"

        client = OpenAI(api_key=self.api_key)
        response = client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ],
            response_format=schema,
        )
        parsed = response.choices[0].message.parsed
        if parsed is None:
            raise ValueError("OpenAI returned no parsed JSON payload")
        return schema.model_validate(parsed.model_dump() if hasattr(parsed, "model_dump") else parsed)

    async def generate_structured(self, prompt: str, schema: type[Any], *, system_prompt: str | None = None) -> Any:
        return await self._call_with_retry(
            "generate_structured",
            lambda: self._generate(prompt, schema, system_prompt=system_prompt),
            schema=schema,
            prompt=prompt,
            system_prompt=system_prompt,
        )


class AnthropicProvider(BaseLLMProvider):
    """Anthropic LLM provider using Claude API."""

    name = "anthropic"

    def __init__(self, api_key: str, model: str = "claude-opus-4-1"):
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = 45.0
        self.max_retries = 3
        try:
            from anthropic import Anthropic
            self.client = Anthropic(api_key=api_key)
        except ImportError:
            raise ImportError("anthropic library is not installed. Install with: pip install anthropic")

    async def _generate(self, prompt: str, schema: type[Any], *, system_prompt: str | None = None) -> Any:
        from anthropic import Anthropic

        schema_json = schema.model_json_schema()
        system_msg = (system_prompt or "You are a helpful assistant that provides structured analysis.")
        system_msg += f"\n\nRespond with ONLY valid JSON matching this schema:\n{json.dumps(schema_json, indent=2)}\n\nProvide ONLY the JSON object, no markdown or other text."

        client = Anthropic(api_key=self.api_key)
        response = client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=system_msg,
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.content[0].text
        json_str = ""
        try:
            json_data = json.loads(content)
        except json.JSONDecodeError:
            json_str = content
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                json_str = content.split("```")[1].split("```")[0].strip()
            try:
                json_data = json.loads(json_str)
            except json.JSONDecodeError:
                repaired = BaseLLMProvider._repair_json_text(json_str)
                json_data = json.loads(repaired)
        return BaseLLMProvider._ensure_structured_payload(json_data, schema)

    async def generate_structured(self, prompt: str, schema: type[Any], *, system_prompt: str | None = None) -> Any:
        return await self._call_with_retry(
            "generate_structured",
            lambda: self._generate(prompt, schema, system_prompt=system_prompt),
            schema=schema,
            prompt=prompt,
            system_prompt=system_prompt,
        )


class GeminiProvider(BaseLLMProvider):
    """Google Gemini LLM provider using the official Google GenAI SDK."""

    name = "gemini"

    def __init__(self, api_key: str, model: str = "gemini-3.6-flash"):
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = 45.0
        self.max_retries = 3
        try:
            from google import genai

            self.client = genai.Client(api_key=api_key)
        except ImportError as exc:
            raise ImportError("google-genai library is not installed. Install with: pip install google-genai") from exc

    async def _generate(self, prompt: str, schema: type[Any], *, system_prompt: str | None = None) -> Any:
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=f"{system_prompt or 'You are a helpful assistant.'}\n\n{prompt}",
                config={"response_mime_type": "application/json", "max_output_tokens": 4096},
            )
        except Exception as exc:  # noqa: BLE001
            mapped = self._classify_provider_exception(exc)
            if mapped is not None:
                raise QuotaExceededError(str(exc)) if isinstance(mapped, QuotaExceededError) else mapped
            raise
        finish_reason = getattr(response, "finish_reason", None)
        if finish_reason and "length" in str(finish_reason).lower():
            raise MalformedResponseError(f"Gemini output truncated: finish_reason={finish_reason}")
        text = getattr(response, "text", None)
        if text is None:
            raise MalformedResponseError("Gemini returned no text payload")
        json_data = _coerce_json_from_text(text)
        return BaseLLMProvider._ensure_structured_payload(json_data, schema)

    async def generate_structured(self, prompt: str, schema: type[Any], *, system_prompt: str | None = None) -> Any:
        prompt_ref = {"value": prompt}

        def invoke() -> Any:
            return self._generate(prompt_ref["value"], schema, system_prompt=system_prompt)

        invoke.prompt_ref = prompt_ref
        return await self._call_with_retry(
            "generate_structured",
            invoke,
            schema=schema,
            prompt=prompt,
            system_prompt=system_prompt,
        )


class GroqProvider(BaseLLMProvider):
    """Groq-hosted LLM provider using the official Groq SDK."""

    name = "groq"

    def __init__(self, api_key: str, model: str = "openai/gpt-oss-120b"):
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = 45.0
        self.max_retries = 3

        try:
            from groq import Groq

            self.client = Groq(api_key=api_key)
        except ImportError as exc:
            raise ImportError(
                "groq library is not installed. Install with: pip install groq"
            ) from exc

    async def _generate(
        self,
        prompt: str,
        schema: type[Any],
        *,
        system_prompt: str | None = None,
    ) -> Any:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt or "You are a helpful assistant that provides structured analysis.",
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            max_completion_tokens=6000,
            temperature=0.2,
        )

        choice = response.choices[0]
        finish_reason = getattr(choice, "finish_reason", None)
        if finish_reason and "length" in str(finish_reason).lower():
            raise MalformedResponseError(f"Groq output truncated: finish_reason={finish_reason}")

        content = choice.message.content
        if not content:
            raise MalformedResponseError(
                f"Groq returned empty content. Finish reason: {choice.finish_reason}"
            )

        json_data = _coerce_json_from_text(content)
        return BaseLLMProvider._ensure_structured_payload(json_data, schema)

    async def generate_structured(
        self,
        prompt: str,
        schema: type[Any],
        *,
        system_prompt: str | None = None,
    ) -> Any:
        prompt_ref = {"value": prompt}

        def invoke() -> Any:
            return self._generate(prompt_ref["value"], schema, system_prompt=system_prompt)

        invoke.prompt_ref = prompt_ref
        return await self._call_with_retry(
            "generate_structured",
            invoke,
            schema=schema,
            prompt=prompt,
            system_prompt=system_prompt,
        )

class OpenRouterProvider(BaseLLMProvider):
    """OpenRouter-hosted LLM provider using the OpenAI-compatible client."""

    name = "openrouter"

    def __init__(self, api_key: str, model: str = "openai/gpt-4o-mini"):
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = 45.0
        self.max_retries = 3
        try:
            from openai import OpenAI

            self.client = OpenAI(api_key=api_key, base_url="https://openrouter.ai/api/v1")
        except ImportError as exc:
            raise ImportError("openai library is not installed. Install with: pip install openai") from exc

    async def _generate(self, prompt: str, schema: type[Any], *, system_prompt: str | None = None) -> Any:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt or "You are a helpful assistant that provides structured analysis.",
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            max_tokens=4096,
            temperature=0.2,
        )
        choice = response.choices[0]
        finish_reason = getattr(choice, "finish_reason", None)
        if finish_reason and "length" in str(finish_reason).lower():
            raise MalformedResponseError(f"OpenRouter output truncated: finish_reason={finish_reason}")
        content = choice.message.content
        if not content:
            raise MalformedResponseError("OpenRouter returned an empty response")
        json_data = _coerce_json_from_text(content)
        return BaseLLMProvider._ensure_structured_payload(json_data, schema)

    async def generate_structured(self, prompt: str, schema: type[Any], *, system_prompt: str | None = None) -> Any:
        prompt_ref = {"value": prompt}

        def invoke() -> Any:
            return self._generate(prompt_ref["value"], schema, system_prompt=system_prompt)

        invoke.prompt_ref = prompt_ref
        return await self._call_with_retry(
            "generate_structured",
            invoke,
            schema=schema,
            prompt=prompt,
            system_prompt=system_prompt,
        )


def _coerce_json_from_text(text: str) -> dict[str, Any]:
    cleaned = (text or "").strip()
    if not cleaned:
        raise ValueError("LLM provider returned empty content")

    repaired = BaseLLMProvider._repair_json_text(cleaned)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        for marker in ("```json", "```"):
            if marker in cleaned:
                candidate = cleaned.split(marker, 1)[-1]
                if "```" in candidate:
                    candidate = candidate.split("```", 1)[0]
                candidate = candidate.strip()
                repaired_candidate = BaseLLMProvider._repair_json_text(candidate)
                try:
                    return json.loads(repaired_candidate)
                except json.JSONDecodeError:
                    continue
        raise ValueError(f"Malformed JSON response from LLM provider: {cleaned[:200]}")


def _build_provider_fallback_chain(settings) -> BaseLLMProvider | None:
    chain: list[tuple[str, BaseLLMProvider | None]] = []
    if settings.gemini_api_key:
        chain.append(("gemini", GeminiProvider(settings.gemini_api_key, getattr(settings, "gemini_model", settings.llm_model))))
    if settings.groq_api_key:
        chain.append(("groq", GroqProvider(settings.groq_api_key, getattr(settings, "groq_model", settings.llm_model))))
    if settings.openrouter_api_key:
        chain.append(("openrouter", OpenRouterProvider(settings.openrouter_api_key, getattr(settings, "openrouter_model", settings.llm_model))))

    for idx, (_, provider) in enumerate(chain):
        if idx + 1 < len(chain):
            provider.fallback_provider = chain[idx + 1][1]
        else:
            provider.fallback_provider = None
    return chain[0][1] if chain else None


def get_llm_provider() -> BaseLLMProvider:
    """Factory selecting the configured LLM provider."""
    from app.core.config import get_settings

    settings = get_settings()
    provider_name = (settings.llm_provider or "auto").lower()

    if provider_name == "mock":
        return MockLLMProvider()

    if provider_name == "openai":
        if not settings.openai_api_key:
            return FailureLLMProvider("OpenAI API key not configured. Set VISION2REAL_OPENAI_API_KEY", provider_name="openai")
        return OpenAIProvider(settings.openai_api_key, settings.llm_model)

    if provider_name == "anthropic":
        if not settings.anthropic_api_key:
            return FailureLLMProvider("Anthropic API key not configured. Set VISION2REAL_ANTHROPIC_API_KEY", provider_name="anthropic")
        return AnthropicProvider(settings.anthropic_api_key, settings.llm_model)

    if provider_name == "gemini":
        if not settings.gemini_api_key:
            return FailureLLMProvider("Gemini API key not configured. Set VISION2REAL_GEMINI_API_KEY", provider_name="gemini")
        return GeminiProvider(settings.gemini_api_key, settings.gemini_model if hasattr(settings, "gemini_model") else settings.llm_model)

    if provider_name == "groq":
        if not settings.groq_api_key:
            return FailureLLMProvider("Groq API key not configured. Set VISION2REAL_GROQ_API_KEY", provider_name="groq")
        return GroqProvider(settings.groq_api_key, getattr(settings, "groq_model", settings.llm_model))

    if provider_name == "openrouter":
        if not settings.openrouter_api_key:
            return FailureLLMProvider("OpenRouter API key not configured. Set VISION2REAL_OPENROUTER_API_KEY", provider_name="openrouter")
        return OpenRouterProvider(settings.openrouter_api_key, getattr(settings, "openrouter_model", settings.llm_model))

    if provider_name == "auto":
        fallback_provider = _build_provider_fallback_chain(settings)
        if fallback_provider is not None:
            return fallback_provider
        return FailureLLMProvider(
            "No working provider available in auto mode. Configure one of: Gemini, Groq, or OpenRouter.",
            provider_name="auto",
        )

    return FailureLLMProvider(
        f"LLM provider '{settings.llm_provider}' is not implemented. Available: 'auto', 'mock', 'openai', 'anthropic', 'gemini', 'groq', 'openrouter'.",
        provider_name=str(settings.llm_provider),
    )
