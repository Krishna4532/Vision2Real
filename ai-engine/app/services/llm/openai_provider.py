import os
import json
import time
import httpx
from typing import Any, Dict

from app.services.llm.base_provider import LLMProvider, LLMProviderResult

# GPT-4o pricing ($ per 1k tokens, as of mid-2024) — used to estimate cost
_COST_PER_1K_PROMPT = 0.005
_COST_PER_1K_COMPLETION = 0.015


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str | None = None, model: str = "gpt-4o"):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.model = model
        self.base_url = "https://api.openai.com/v1"

    async def validate_startup(self, prompt: str) -> LLMProviderResult:
        """Call OpenAI and return a LLMProviderResult with token accounting."""
        if not self.api_key:
            # Deterministic fallback when no key is configured (dev / CI)
            return LLMProviderResult(
                payload={
                    "overall_score": 7.5,
                    "recommendation": "PROCEED",
                    "analysis": "Fallback validation: no OpenAI API key configured.",
                    "strengths": ["Clear problem statement"],
                    "weaknesses": ["Validation not performed against real market data"],
                },
                provider_name=self.provider_name(),
                model=self.model,
                provider_latency_ms=0,
                total_tokens=0,
                prompt_tokens=0,
                completion_tokens=0,
                estimated_cost=0.0,
            )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are Vision2Real's Senior Startup Validation AI. "
                        "Evaluate the startup as a professional venture analyst would. "
                        "Use explicit facts, conservative inferences, and honest uncertainty. "
                        "Do not fabricate numbers, competitors, pricing, traction, market size, or funding. "
                        "Never output markdown, explanations, or non-JSON text. "
                        "Return ONLY valid JSON matching the requested schema exactly."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
        }

        t_start = time.monotonic()
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=90.0,
            )
            response.raise_for_status()

        latency_ms = int((time.monotonic() - t_start) * 1000)
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)

        usage = data.get("usage", {})
        p_tokens = usage.get("prompt_tokens", 0)
        c_tokens = usage.get("completion_tokens", 0)
        t_tokens = usage.get("total_tokens", 0)
        cost = (p_tokens / 1000 * _COST_PER_1K_PROMPT) + (c_tokens / 1000 * _COST_PER_1K_COMPLETION)

        return LLMProviderResult(
            payload=parsed,
            provider_name=self.provider_name(),
            model=self.model,
            provider_latency_ms=latency_ms,
            total_tokens=t_tokens,
            prompt_tokens=p_tokens,
            completion_tokens=c_tokens,
            estimated_cost=round(cost, 6),
        )

    async def health_check(self) -> bool:
        return bool(self.api_key)

    def provider_name(self) -> str:
        return "openai"
