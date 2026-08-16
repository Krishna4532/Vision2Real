from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.schemas.analysis import ClassificationResult, StructuredIdea


class BaseLLMProvider(ABC):
    @abstractmethod
    async def generate_structured(self, prompt: str, schema: type[Any], *, system_prompt: str | None = None) -> Any:
        raise NotImplementedError


class MockLLMProvider(BaseLLMProvider):
    def __init__(self, response_payload: dict[str, Any] | None = None):
        self.response_payload = response_payload

    async def generate_structured(self, prompt: str, schema: type[Any], *, system_prompt: str | None = None) -> Any:
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
        if "ai tutor" in prompt_lower:
            if schema is StructuredIdea:
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
            if schema is ClassificationResult:
                return ClassificationResult(labels=["AI", "Education", "B2C", "SaaS"], confidence=0.88)

        if "app idea" in prompt_lower:
            if schema is StructuredIdea:
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
            if schema is ClassificationResult:
                return ClassificationResult(labels=["Unspecified"], confidence=0.1)

        if schema is StructuredIdea:
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
        if schema is ClassificationResult:
            return ClassificationResult(labels=["General"], confidence=0.2)

        raise TypeError(f"Unsupported schema type: {schema}")


def get_llm_provider() -> BaseLLMProvider:
    """Factory selecting the configured LLM provider.

    Previously `settings.llm_provider` was defined but never read anywhere -
    every call site (routes.py, workflow.py, analysis_service.py) hardcoded
    `MockLLMProvider()` directly, and the LLM_PROVIDER env var had no effect.
    This centralizes provider selection so callers get the configured
    provider and adding a real provider later means adding one branch here.
    """
    from app.core.config import get_settings

    settings = get_settings()
    if settings.llm_provider == "mock":
        return MockLLMProvider()
    raise NotImplementedError(
        f"LLM provider '{settings.llm_provider}' is not implemented yet. "
        "Available: 'mock'. Implement a BaseLLMProvider subclass and add it here."
    )
