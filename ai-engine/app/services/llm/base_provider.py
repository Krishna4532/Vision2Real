from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class LLMProviderResult:
    """Structured result returned by every LLM provider."""

    def __init__(
        self,
        payload: Dict[str, Any],
        provider_name: str,
        model: str,
        provider_latency_ms: Optional[int] = None,
        total_tokens: Optional[int] = None,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        estimated_cost: Optional[float] = None,
    ):
        self.payload = payload
        self.provider = provider_name
        self.model = model
        self.provider_latency_ms = provider_latency_ms
        self.total_tokens = total_tokens
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.estimated_cost = estimated_cost


class LLMProvider(ABC):
    @abstractmethod
    async def validate_startup(self, prompt: str) -> LLMProviderResult:
        """
        Executes the validation prompt against the LLM.
        Returns a LLMProviderResult containing the structured JSON payload
        and usage metadata (tokens, latency, cost).
        """

    @abstractmethod
    async def health_check(self) -> bool:
        """Returns True if the provider is reachable and configured."""

    @abstractmethod
    def provider_name(self) -> str:
        """Returns a stable identifier string, e.g. 'openai'."""
