/**
 * Vision2Real – Reality Sprint Future Deliverables Section
 * Production placeholders for Version 2 deliverables.
 * Strictly adheres to Zero Mock Policy: Renders ONLY when actual backend data exists.
 */

import type { RealitySprintRequest } from '@/services/api/realitySprint';

interface RealitySprintDeliverablesProps {
  sprint: RealitySprintRequest;
}

export function RealitySprintDeliverables({ sprint }: RealitySprintDeliverablesProps) {
  const hasPrd = !!sprint.prd && Object.keys(sprint.prd).length > 0;
  const hasArchitecture = !!sprint.architecture && Object.keys(sprint.architecture).length > 0;
  const hasTechnicalPlan = !!sprint.technical_plan && Object.keys(sprint.technical_plan).length > 0;
  const hasDesign = !!sprint.design && Object.keys(sprint.design).length > 0;
  const hasRoadmap = !!sprint.roadmap && Object.keys(sprint.roadmap).length > 0;
  const hasResearch = !!sprint.research && Object.keys(sprint.research).length > 0;
  const hasAssets = !!sprint.generated_assets && sprint.generated_assets.length > 0;
  const hasDeliverablesList = !!sprint.deliverables && sprint.deliverables.length > 0;

  const hasAnyDeliverables =
    hasPrd ||
    hasArchitecture ||
    hasTechnicalPlan ||
    hasDesign ||
    hasRoadmap ||
    hasResearch ||
    hasAssets ||
    hasDeliverablesList;

  // If no backend deliverables exist, hide or display empty state guidance
  if (!hasAnyDeliverables) {
    if (sprint.status === 'COMPLETED') {
      return (
        <div
          style={{
            padding: 'var(--space-xl)',
            textAlign: 'center',
            background: 'rgba(30, 41, 59, 0.3)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <div style={{ fontSize: '1.8rem', marginBottom: 'var(--space-xs)' }}>📦</div>
          <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
            Deliverables in Final Compilation
          </div>
          <p style={{ maxWidth: '460px', margin: 'var(--space-xs) auto 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            This sprint is completed. Automated PRD, technical plans, and asset bundles will attach here once published.
          </p>
        </div>
      );
    }

    // For non-completed sprints, render standard empty state placeholder
    return (
      <div
        style={{
          padding: 'var(--space-lg)',
          textAlign: 'center',
          background: 'rgba(30, 41, 59, 0.2)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed rgba(255, 255, 255, 0.06)',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-xs)',
          fontStyle: 'italic',
        }}
      >
        This section becomes available once your sprint is completed.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {hasPrd && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
          }}
        >
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            📄 Product Requirements Document (PRD)
          </h3>
          <pre
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-xs)',
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(sprint.prd, null, 2)}
          </pre>
        </div>
      )}

      {hasArchitecture && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
          }}
        >
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            🏗️ System Architecture &amp; Technical Plan
          </h3>
          <pre
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-xs)',
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(sprint.architecture, null, 2)}
          </pre>
        </div>
      )}

      {hasTechnicalPlan && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
          }}
        >
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            📐 Engineering &amp; Implementation Plan
          </h3>
          <pre
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-xs)',
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(sprint.technical_plan, null, 2)}
          </pre>
        </div>
      )}

      {hasDesign && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
          }}
        >
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            🎨 UI/UX Design System &amp; Flows
          </h3>
          <pre
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-xs)',
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(sprint.design, null, 2)}
          </pre>
        </div>
      )}

      {hasRoadmap && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
          }}
        >
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            🗺️ Post-Sprint Product Roadmap
          </h3>
          <pre
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-xs)',
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(sprint.roadmap, null, 2)}
          </pre>
        </div>
      )}

      {hasResearch && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
          }}
        >
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            🔬 Target Market &amp; Journey Research
          </h3>
          <pre
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-xs)',
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(sprint.research, null, 2)}
          </pre>
        </div>
      )}

      {hasAssets && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
          }}
        >
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            ✨ Generated Prototype Assets
          </h3>
          <pre
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-xs)',
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(sprint.generated_assets, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
