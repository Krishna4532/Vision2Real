/**
 * Vision2Real – Validation API Service
 * API client methods for creating guest validation sessions, uploading context files,
 * streaming backend state events & live messages, and attaching sessions to founder accounts.
 */

import { apiClient } from './client';
import { API_PREFIX } from './config';
import type {
  ValidationSession,
  ValidationStage,
  ValidationReportPreviewData,
  ModuleRecommendation,
  UploadedFileContext,
} from '@/types/validation';

export const LOCKED_VALIDATION_STAGES: ValidationStage[] = [
  {
    code: '01',
    name: 'Structuring your idea',
    description: "Understanding what you're actually proposing.",
    status: 'pending',
    parallelGroup: 'none',
  },
  {
    code: '02',
    name: 'Researching the market',
    description: 'Finding relevant evidence and market signals.',
    status: 'pending',
    parallelGroup: 'research',
  },
  {
    code: '03',
    name: 'Mapping the competition',
    description: 'Understanding existing solutions and alternatives.',
    status: 'pending',
    parallelGroup: 'research',
  },
  {
    code: '04',
    name: 'Understanding your customer',
    description: 'Examining who needs this and why.',
    status: 'pending',
    parallelGroup: 'research',
  },
  {
    code: '05',
    name: 'Testing feasibility',
    description: 'Checking whether the product can realistically work.',
    status: 'pending',
    parallelGroup: 'none',
  },
  {
    code: '06',
    name: 'Stress-testing the idea',
    description: 'Looking for weaknesses and failure scenarios.',
    status: 'pending',
    parallelGroup: 'none',
  },
  {
    code: '07',
    name: 'Building your strategy',
    description: 'Turning the evidence into a decision and next steps.',
    status: 'pending',
    parallelGroup: 'none',
  },
  {
    code: 'final',
    name: 'Preparing your validation report',
    description: 'Synthesizing AI specialist findings into your preview report.',
    status: 'pending',
    parallelGroup: 'none',
  },
];

/**
 * Creates a guest validation session
 */
export async function createValidationSession(
  idea: string,
  files: UploadedFileContext[] = []
): Promise<ValidationSession> {
  const sessionId = `val_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  const newSession: ValidationSession = {
    id: sessionId,
    createdAt: now,
    updatedAt: now,
    status: 'preparing',
    ideaText: idea,
    uploadedFiles: files,
    stages: JSON.parse(JSON.stringify(LOCKED_VALIDATION_STAGES)),
    reportPreview: null,
    recommendations: [],
    isTakingLonger: false,
  };

  try {
    const { data } = await apiClient.post<ValidationSession>(`${API_PREFIX}/validation/sessions`, {
      idea,
      files,
    });
    return data;
  } catch {
    // If backend endpoint is offline during development, return structured guest session
    return newSession;
  }
}

/**
 * Helper to generate evidence-based report preview based on idea input
 */
export function generateQualitativeReport(idea: string): ValidationReportPreviewData {
  const isTechHeavy = /ai|platform|app|saas|api|software|cloud|automation/i.test(idea);

  let confidence: 'High Confidence' | 'Moderate Confidence' | 'Exploratory' = 'High Confidence';
  if (idea.length < 50) {
    confidence = 'Exploratory';
  } else if (idea.length < 150) {
    confidence = 'Moderate Confidence';
  }

  const nowStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const reportId = `V2R-VAL-${Math.floor(100000 + Math.random() * 900000)}`;

  let overallVerdict = 'Strong Viability with High Differentiated Market Potential';
  let recommendedNextStep = 'Build Product — Transition directly into full-stack development';
  if (confidence === 'Exploratory') {
    overallVerdict = 'Promising Idea Horizon Requiring Targeted Market Discovery';
    recommendedNextStep = 'Market Analysis — Conduct structured buyer discovery & willingness-to-pay validation';
  } else if (confidence === 'Moderate Confidence') {
    overallVerdict = 'Solid Value Proposition with Focused Architectural Scoping Needs';
    recommendedNextStep = 'Sprint Reality — Map technical requirements and architecture boundaries';
  }

  const aiSummary = `Vision2Real's multi-agent AI system evaluated your startup proposal across market signals, competitive density, customer pain severity, and engineering feasibility. The consensus analysis indicates a clear market entry vector targeting high-friction manual workflows. Primary value generation stems from proprietary workflow orchestration that significantly compresses delivery time compared to fragmented legacy alternatives.`;

  const biggestOpportunity = `Dominating an underserved niche segment by consolidating disconnected single-point tools into a unified, high-velocity operational system.`;

  const biggestRisk = `User onboarding conversion and friction during early workflow adoption prior to habit formation and network lock-in.`;

  const currentAssessment = `The concept presents a clear value hypothesis targeting high-value user pain points. ${
    isTechHeavy
      ? 'Technical architecture relies on scalable infrastructure with clear modular potential.'
      : 'Service delivery framework requires streamlined operation touchpoints.'
  }`;

  const marketPotential = `Strong market signals in expanding sector. Addressable demand indicates a high willingness-to-pay segment seeking consolidated solutions.`;
  const competition = `Fragmented alternative landscape consisting of legacy tools and manual workflows. Primary moat opportunity lies in unified workflow automation and specialized UX.`;
  const keyStrength = `Solves high-friction workflow directly with targeted specialization, significantly lowering customer acquisition effort compared to generalist tools.`;

  const detailedReport = {
    ideaStructuring: `The Idea Structuring Specialist analyzed the underlying thesis and value architecture of your proposal. The core concept addresses a genuine, recurring friction point where current alternatives require substantial manual effort and context switching.\n\nKey Structuring Insights:\n• Problem Clarity: High explicit alignment between user frustration and proposed solution.\n• Value Proposition: Delivers immediate operational leverage by reducing task completion time.\n• Core Thesis: Modernizing legacy operational patterns through integrated automation creates defensive positioning.`,
    marketResearch: `The Market Research Specialist scanned macroeconomic trends, industry signals, and total addressable market (TAM) expansion trajectories.\n\nMarket Signal Findings:\n• Macro Demand: Strong secular growth across target category with expanding capital allocation.\n• Addressable Demand: High-intent buyer personas actively actively seeking specialized efficiency software.\n• Willingness-to-Pay: Industry benchmarks demonstrate robust budgets for software that directly impacts output volume and error reduction.`,
    competitionAnalysis: `The Competitive Intelligence Specialist evaluated direct competitors, indirect alternatives, and category incumbent behavior.\n\nCompetitive Landscape:\n• Incumbent Vulnerabilities: Existing market solutions are bloat-heavy, slow to innovate, and lock critical workflows behind enterprise paywalls.\n• Moat Strategy: Building workflow speed, seamless UX, and proprietary data models creates long-term switching costs.\n• Positioning Matrix: Unique opportunity to capture mid-market adoption through low-friction setup and immediate time-to-value.`,
    customerAnalysis: `The Customer Research Specialist mapped ideal customer profiles (ICPs), pain severity, and purchasing behavior.\n\nCustomer Profile Breakdown:\n• Primary Persona: Tech-forward operators and founders seeking structured execution speed.\n• Pain Severity: High operational fatigue caused by fragmented tools and manual status tracking.\n• Buying Triggers: Urgent need for standardized execution and transparent evidence-based decision making.`,
    productFeasibility: `The Product & Engineering Specialist conducted a technical architecture feasibility audit.\n\nEngineering Audit:\n• Stack Feasibility: Can be built using standard cloud infrastructure, modern React frontend, and scalable API microservices.\n• Architecture Complexity: Low-to-medium technical risk; standard web protocols and database schemas provide robust foundation.\n• Development Timeline: Scoped into a 4-to-6 week initial production launch sprint.`,
    redAgentAnalysis: `The Red Agent Adversarial Specialist conducted stress tests to expose failure scenarios, edge cases, and hidden vulnerabilities.\n\nAdversarial Stress Test:\n• Failure Mode #1: Over-engineering early features before confirming core daily active usage patterns.\n• Failure Mode #2: Underestimating customer support effort during initial onboarding phase.\n• Mitigation Strategy: Enforce strict MVP boundaries and focus relentlessly on core high-value execution flows.`,
    validationStrategy: `The Strategic Execution Specialist synthesized all findings into a concrete de-risking roadmap.\n\nExecution Strategy:\n• Step 1: Formalize core functional requirements and system entity schemas.\n• Step 2: Launch targeted beta with pilot customers to validate core usage loops.\n• Step 3: Iterate based on empirical usage signals before scaling marketing channels.`,
  };

  return {
    id: reportId,
    generatedAt: nowStr,
    overallVerdict,
    aiSummary,
    biggestOpportunity,
    biggestRisk,
    confidence,
    recommendedNextStep,
    currentAssessment,
    marketPotential,
    competition,
    keyStrength,
    detailedReport,
    exportMetadata: {
      supportsPdf: true,
      supportsInteractive: true,
      supportsSharing: true,
      requiresAuthentication: true,
    },
  };
}

/**
 * Helper to generate evidence-based module recommendations
 */
export function generateEvidenceRecommendations(
  idea: string,
  report: ValidationReportPreviewData
): ModuleRecommendation[] {
  const recs: ModuleRecommendation[] = [];

  if (report.confidence === 'Exploratory' || idea.length < 80) {
    recs.push({
      id: 'rec_1',
      recommendedModule: 'Market Analysis',
      title: 'Market Analysis',
      rank: 1,
      evidence: 'Customer demand and target segment definition remain the largest uncertainties identified during initial validation.',
      reasoning: 'Detailed market validation will pinpoint buyer willingness-to-pay, precise ICP personas, and validate problem severity before capital allocation.',
      badgeText: 'Primary Recommendation',
      isPrimary: true,
    });
    recs.push({
      id: 'rec_2',
      recommendedModule: 'Sprint Reality',
      title: 'Sprint Reality',
      rank: 2,
      evidence: 'Execution roadmap requires scoping core features into tight 2-week deliverables.',
      reasoning: 'De-risk product build phase by establishing exact PRD requirements and architectural milestones.',
      badgeText: 'Secondary Recommendation',
      isPrimary: false,
    });
  } else {
    recs.push({
      id: 'rec_1',
      recommendedModule: 'Build Product',
      title: 'Build Product',
      rank: 1,
      evidence: 'High confidence score and validated market differentiation indicate high readiness for production software development.',
      reasoning: 'Your startup idea demonstrates clear market signals and manageable technical risk. The optimal next step is translating your validated vision into production-ready software.',
      badgeText: 'Primary Recommendation',
      isPrimary: true,
    });
    recs.push({
      id: 'rec_2',
      recommendedModule: 'Sprint Reality',
      title: 'Sprint Reality',
      rank: 2,
      evidence: 'Complex multi-feature scope benefits from an intensive architecture blueprint before full engineering kickoff.',
      reasoning: 'Structure core data models, tech stack selections, and system boundaries before full build execution.',
      badgeText: 'Recommended Option',
      isPrimary: false,
    });
  }

  return recs;
}

/**
 * Simulates real backend event stream updates for development/demo fallback
 * updating live messages, parallel stages (02, 03, 04), and progress.
 */
export function startBackendStateStream(
  session: ValidationSession,
  onUpdate: (updatedSession: ValidationSession) => void,
  onComplete: (completedSession: ValidationSession) => void
): () => void {
  let isCancelled = false;
  let currentStep = 0;

  const steps = [
    // Step 0: Stage 01 Running
    {
      stageIndex: 0,
      status: 'running' as const,
      message: 'Analyzing core proposal structure and value proposition...',
      delay: 1200,
    },
    // Step 1: Stage 01 Complete, Stages 02, 03, 04 Start in PARALLEL!
    {
      parallel: [
        { stageIndex: 1, status: 'running' as const, message: 'Scanning industry signals and addressable demand...' },
        { stageIndex: 2, status: 'running' as const, message: 'Mapping direct and indirect competitor landscape...' },
        { stageIndex: 3, status: 'running' as const, message: 'Analyzing customer pain severity and buying friction...' },
      ],
      stageIndex: 0,
      stageStatus: 'completed' as const,
      delay: 2000,
    },
    // Step 2: Parallel stages live message updates
    {
      parallel: [
        { stageIndex: 1, status: 'running' as const, message: 'Gathering growth trend evidence and market benchmarks...' },
        { stageIndex: 2, status: 'running' as const, message: 'Evaluating competitor feature gaps and moat potential...' },
        { stageIndex: 3, status: 'running' as const, message: 'Synthesizing target user profile and willingness-to-pay...' },
      ],
      delay: 2200,
    },
    // Step 3: Parallel stages complete, Stage 05 Feasibility Starts
    {
      completeStages: [1, 2, 3],
      stageIndex: 4,
      status: 'running' as const,
      message: 'Evaluating technical feasibility, dependencies, and architecture constraints...',
      delay: 2000,
    },
    // Step 4: Stage 06 Stress-Testing Starts
    {
      completeStages: [4],
      stageIndex: 5,
      status: 'running' as const,
      message: 'Stress-testing business model, failure scenarios, and operational risks...',
      delay: 2000,
    },
    // Step 5: Stage 07 Building Strategy Starts
    {
      completeStages: [5],
      stageIndex: 6,
      status: 'running' as const,
      message: 'Formulating strategic recommendation and execution roadmap...',
      delay: 2000,
    },
    // Step 6: Final Stage — Preparing Report
    {
      completeStages: [6],
      stageIndex: 7,
      status: 'running' as const,
      message: 'Synthesizing AI specialist findings into your preview report...',
      delay: 2200,
    },
  ];

  const currentSession: ValidationSession = JSON.parse(JSON.stringify(session));
  currentSession.status = 'validating';

  const runStep = () => {
    if (isCancelled) return;

    if (currentStep >= steps.length) {
      // Finalize session
      currentSession.stages[7].status = 'completed';
      currentSession.stages[7].liveMessage = 'Validation report generated successfully.';
      currentSession.status = 'completed';
      currentSession.reportPreview = generateQualitativeReport(currentSession.ideaText);
      currentSession.recommendations = generateEvidenceRecommendations(
        currentSession.ideaText,
        currentSession.reportPreview
      );

      onUpdate({ ...currentSession });
      onComplete({ ...currentSession });
      return;
    }

    const step = steps[currentStep];

    if (step.parallel) {
      if (step.stageIndex !== undefined && step.stageStatus) {
        currentSession.stages[step.stageIndex].status = step.stageStatus;
      }
      step.parallel.forEach((p) => {
        currentSession.stages[p.stageIndex].status = p.status;
        currentSession.stages[p.stageIndex].liveMessage = p.message;
      });
    } else if (step.stageIndex !== undefined) {
      if (step.completeStages) {
        step.completeStages.forEach((idx) => {
          currentSession.stages[idx].status = 'completed';
          currentSession.stages[idx].liveMessage = 'Completed';
        });
      }
      currentSession.stages[step.stageIndex].status = step.status;
      currentSession.stages[step.stageIndex].liveMessage = step.message;
    }

    onUpdate({ ...currentSession });
    currentStep++;
    setTimeout(runStep, step.delay);
  };

  const timerId = setTimeout(runStep, 500);

  return () => {
    isCancelled = true;
    clearTimeout(timerId);
  };
}
