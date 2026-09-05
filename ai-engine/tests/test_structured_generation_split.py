import pytest

from app.services.agent_services import (
    DecisionAnalysisOutput,
    FinancialAnalysisOutput,
    RedTeamAnalysisOutput,
    analyze_decision_with_llm,
    analyze_financial_with_llm,
    analyze_red_team_with_llm,
)
from app.services.llm_provider import BaseLLMProvider


class RecordingProvider:
    def __init__(self):
        self.calls = []

    async def generate_structured(self, prompt, schema, *, system_prompt=None):
        self.calls.append({"prompt": prompt, "schema": schema.__name__, "system_prompt": system_prompt})
        if schema.__name__ == "RedTeamObjectionsSection":
            return schema(
                objections=[
                    {
                        "assumption_challenged": "People will switch",
                        "objection": "Switching costs are high",
                        "evidence_supporting_objection": "Users already have tools",
                        "how_to_disprove": "Pilot migration data",
                        "severity": "high",
                    }
                ]
            )
        if schema.__name__ == "RedTeamSummarySection":
            return schema(
                strongest_objection="Switching costs are high",
                weakest_link="Customer migration",
                fatal_flaws_identified=False,
                reasons_startup_could_fail=["No clear migration path"],
            )
        if schema.__name__ == "RedTeamRecommendationsSection":
            return schema(recommendations=["Interview power users", "Test migration friction"])
        if schema.__name__ == "DecisionScoringOutput":
            return schema(
                proposed_decision="VALIDATE",
                rationale=["Too early to build"],
                confidence=0.72,
                missing_evidence=["Customer willingness to pay"],
                assumptions=["Customer pain is real"],
                tradeoffs=["Faster build vs. more evidence"],
                milestones=["Interview 20 customers"],
            )
        if schema.__name__ == "DecisionReasoningOutput":
            return schema(reasoning="The recommendation remains conservative until evidence is gathered.")
        if schema.__name__ == "FinancialOverviewSection":
            return schema(
                startup_costs="$250k",
                year1_revenue_estimate="$100k",
                year3_revenue_estimate="$2M",
                gross_margin_estimate="60%",
            )
        if schema.__name__ == "FinancialFundingSection":
            return schema(
                burn_rate_estimate="$30k/month",
                runway_months="8 months",
                funding_requirement="$500k",
                break_even_timeline="18-24 months",
            )
        if schema.__name__ == "FinancialAssumptionSection":
            return schema(key_assumptions=["Customer retention holds", "CAC remains manageable"])
        raise AssertionError(f"Unexpected schema requested: {schema.__name__}")


@pytest.mark.asyncio
async def test_red_team_analysis_splits_sections_and_merges_results():
    provider = RecordingProvider()
    result = await analyze_red_team_with_llm("AI tutoring app for students", "education", provider)

    assert result["status"] == "success"
    assert isinstance(result["objections"], list)
    assert result["objections"][0].objection == "Switching costs are high"
    assert len(provider.calls) >= 2
    assert any(call["schema"] == "RedTeamObjectionsSection" for call in provider.calls)
    assert any(call["schema"] == "RedTeamSummarySection" for call in provider.calls)


@pytest.mark.asyncio
async def test_decision_analysis_splits_sections_and_merges_results():
    provider = RecordingProvider()
    result = await analyze_decision_with_llm("AI tutoring app", "The market is early but promising.", provider)

    assert result["status"] == "success"
    assert result["decision"] == "VALIDATE"
    assert result["confidence"] == 0.72
    assert result["reasoning"] == "The recommendation remains conservative until evidence is gathered."
    assert len(provider.calls) >= 2
    assert any(call["schema"] == "DecisionScoringOutput" for call in provider.calls)
    assert any(call["schema"] == "DecisionReasoningOutput" for call in provider.calls)


@pytest.mark.asyncio
async def test_financial_analysis_splits_sections_and_merges_results():
    provider = RecordingProvider()
    result = await analyze_financial_with_llm("AI tutoring app", "education", "subscription SaaS", provider)

    assert result["status"] == "success"
    assert result["financial"].startup_costs == "$250k"
    assert result["financial"].runway_months == "8 months"
    assert result["financial"].key_assumptions == ["Customer retention holds", "CAC remains manageable"]
    assert len(provider.calls) >= 3
    assert any(call["schema"] == "FinancialOverviewSection" for call in provider.calls)
    assert any(call["schema"] == "FinancialFundingSection" for call in provider.calls)
    assert any(call["schema"] == "FinancialAssumptionSection" for call in provider.calls)


@pytest.mark.asyncio
async def test_red_team_analysis_keeps_failed_sections_isolated():
    class FailingSummaryProvider(RecordingProvider):
        async def generate_structured(self, prompt, schema, *, system_prompt=None):
            if schema.__name__ == "RedTeamSummarySection":
                raise RuntimeError("summary provider outage")
            return await super().generate_structured(prompt, schema, system_prompt=system_prompt)

    result = await analyze_red_team_with_llm("AI tutoring app", "education", FailingSummaryProvider())

    assert result["status"] == "success"
    assert result["objections"][0].objection == "Switching costs are high"
    assert "summary" in result.get("section_status", {})
    assert result["section_status"]["summary"] == "failed"
    assert result["metrics"]["summary"]["status"] == "failed"


def test_json_repair_closes_truncated_structures():
    repaired = BaseLLMProvider._repair_json_text('{"labels": ["AI", "Education"')
    assert repaired.endswith(']}')
    assert "AI" in repaired
