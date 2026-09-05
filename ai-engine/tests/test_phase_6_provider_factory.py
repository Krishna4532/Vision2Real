from types import SimpleNamespace

import pytest

from app.core.config import Settings
from app.schemas.analysis import ClassificationResult
from app.services.llm_provider import (
    BaseLLMProvider,
    GeminiProvider,
    GroqProvider,
    OpenRouterProvider,
    get_llm_provider,
)


def _settings(**overrides):
    defaults = {
        "llm_provider": "mock",
        "llm_model": "test-model",
        "openai_api_key": "",
        "anthropic_api_key": "",
        "gemini_api_key": "",
        "groq_api_key": "",
        "openrouter_api_key": "",
        "gemini_model": "gemini-2.5-flash",
        "groq_model": "llama-3.3-70b-versatile",
        "openrouter_model": "google/gemini-2.5-flash",
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def test_explicit_groq_provider_is_selected(monkeypatch):
    monkeypatch.setattr("app.core.config.get_settings", lambda: _settings(llm_provider="groq", groq_api_key="g-key"))
    provider = get_llm_provider()
    assert isinstance(provider, GroqProvider)


def test_explicit_openrouter_provider_is_selected(monkeypatch):
    monkeypatch.setattr("app.core.config.get_settings", lambda: _settings(llm_provider="openrouter", openrouter_api_key="or-key"))
    provider = get_llm_provider()
    assert isinstance(provider, OpenRouterProvider)


def test_auto_mode_prefers_gemini_then_groq_then_openrouter(monkeypatch):
    monkeypatch.setattr("app.core.config.get_settings", lambda: _settings(llm_provider="auto", gemini_api_key="gemini-key"))
    provider = get_llm_provider()
    assert isinstance(provider, GeminiProvider)

    monkeypatch.setattr("app.core.config.get_settings", lambda: _settings(llm_provider="auto", gemini_api_key="", groq_api_key="groq-key"))
    provider = get_llm_provider()
    assert isinstance(provider, GroqProvider)

    monkeypatch.setattr("app.core.config.get_settings", lambda: _settings(llm_provider="auto", gemini_api_key="", groq_api_key="", openrouter_api_key="openrouter-key"))
    provider = get_llm_provider()
    assert isinstance(provider, OpenRouterProvider)


def test_settings_loads_provider_specific_models_and_strips_api_keys():
    settings = Settings(
        llm_provider="openrouter",
        llm_model="google/gemini-2.5-flash",
        gemini_api_key=" gemini-key ",
        groq_api_key=" groq-key ",
        openrouter_api_key=" openrouter-key ",
    )
    assert settings.gemini_model == "gemini-3.6-flash"
    assert settings.groq_model == "openai/gpt-oss-120b"
    assert settings.openrouter_model == "google/gemini-2.5-flash"
    assert settings.gemini_api_key == "gemini-key"
    assert settings.groq_api_key == "groq-key"
    assert settings.openrouter_api_key == "openrouter-key"


@pytest.mark.asyncio
async def test_retry_uses_fallback_immediately_for_quota_exhaustion():
    class FallbackProvider(BaseLLMProvider):
        name = "fallback"

        def __init__(self):
            self.calls = 0

        async def generate_structured(self, prompt, schema, *, system_prompt=None):
            self.calls += 1
            return {"ok": True}

    class PrimaryProvider(BaseLLMProvider):
        name = "primary"
        max_retries = 3

        def __init__(self):
            self.fallback_provider = FallbackProvider()

        async def generate_structured(self, prompt, schema, *, system_prompt=None):
            return await self._call_with_retry(
                "test",
                lambda: (_ for _ in ()).throw(RuntimeError("429 RESOURCE_EXHAUSTED quota exceeded")),
                schema=schema,
                prompt=prompt,
                system_prompt=system_prompt,
            )

    result = await PrimaryProvider().generate_structured("prompt", ClassificationResult)
    assert result == {"ok": True}


@pytest.mark.asyncio
async def test_retry_fallback_is_safe_without_active_section_metrics():
    class FallbackProvider(BaseLLMProvider):
        name = "fallback"

        async def generate_structured(self, prompt, schema, *, system_prompt=None):
            return {"ok": True}

    class PrimaryProvider(BaseLLMProvider):
        name = "primary"
        max_retries = 2

        def __init__(self):
            self.fallback_provider = FallbackProvider()

        async def generate_structured(self, prompt, schema, *, system_prompt=None):
            return await self._call_with_retry(
                "test",
                lambda: (_ for _ in ()).throw(RuntimeError("429 RESOURCE_EXHAUSTED quota exceeded")),
                schema=schema,
                prompt=prompt,
                system_prompt=system_prompt,
            )

    result = await PrimaryProvider().generate_structured("prompt", ClassificationResult)
    assert result == {"ok": True}


def test_schema_repair_coerces_nested_dicts_to_string_fields():
    payload = {
        "problem": "Restaurants waste food because inventory is manual.",
        "solution": "Computer vision predicts waste and restocks smarter.",
        "target_customer": "Restaurant operators",
        "industry_category": "Food Service",
        "business_model": {
            "type": "Subscription SaaS",
            "summary": "Monthly software + implementation and analytics add-ons",
        },
        "assumptions": ["Food waste is a real pain point."],
        "unknowns": ["Primary geography"],
        "clarifying_questions": ["Which restaurant segment are you targeting?"],
    }

    repaired = BaseLLMProvider._repair_missing_fields(payload, __import__("app.schemas.analysis", fromlist=["StructuredIdea"]).StructuredIdea)
    assert isinstance(repaired["business_model"], str)
    assert "Subscription SaaS" in repaired["business_model"]
    validated = BaseLLMProvider._ensure_structured_payload(repaired, __import__("app.schemas.analysis", fromlist=["StructuredIdea"]).StructuredIdea)
    assert validated.business_model == repaired["business_model"]


def test_openrouter_sets_explicit_limit_and_temperature():
    provider = OpenRouterProvider.__new__(OpenRouterProvider)
    provider.model = "test-model"
    provider.api_key = "test-key"
    provider.timeout_seconds = 45.0
    provider.max_retries = 3

    class DummyCompletions:
        def __init__(self):
            self.calls = []

        def create(self, **kwargs):
            self.calls.append(kwargs)
            return SimpleNamespace(
                choices=[
                    SimpleNamespace(
                        message=SimpleNamespace(content='{"labels": ["AI"], "confidence": 0.9}')
                    )
                ]
            )

    provider.client = SimpleNamespace(chat=SimpleNamespace(completions=DummyCompletions()))

    response = __import__("asyncio").run(provider._generate("hello", ClassificationResult, system_prompt="sys"))

    assert isinstance(response, ClassificationResult)
    assert provider.client.chat.completions.calls[0]["max_tokens"] == 4096
    assert provider.client.chat.completions.calls[0]["temperature"] == 0.2
