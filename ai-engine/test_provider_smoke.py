import asyncio
from pydantic import BaseModel

from app.services.llm_provider import get_llm_provider


class SmokeResponse(BaseModel):
    answer: str


async def main():
    provider = get_llm_provider()

    print(f"Provider: {type(provider).__name__}")
    print(f"Model: {provider.model}")

    result = await provider.generate_structured(
        prompt='Reply ONLY with JSON: {"answer":"SUCCESS"}',
        schema=SmokeResponse,
        system_prompt="You are a JSON API. Return valid JSON only."
    )

    print("\nResult:")
    print(result)

    if result.answer == "SUCCESS":
        print("\n✅ PROVIDER TEST PASSED")
    else:
        print("\n❌ Unexpected response:", result.answer)


if __name__ == "__main__":
    asyncio.run(main())