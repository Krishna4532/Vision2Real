import asyncio
from pydantic import BaseModel

from app.services.llm_provider import get_llm_provider


class TestSchema(BaseModel):
    answer: str


async def main():
    provider = get_llm_provider()

    print("Provider:", type(provider).__name__)
    print("Model:", provider.model)

    result = await provider.generate_structured(
        prompt='Reply only with {"answer":"SUCCESS"}',
        schema=TestSchema,
    )

    print("Result:", result)


if __name__ == "__main__":
    asyncio.run(main())