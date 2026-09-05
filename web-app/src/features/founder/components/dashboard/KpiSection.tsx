/**
 * Vision2Real – KpiSection (Stage 6.3)
 * Three grouped KPI card sets: Validation · Reality Sprint · Build Requests.
 * Each group has a label header + 3 stat cards with real backend values.
 */

import { memo } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import type { DashboardQuickStats } from '@/services/dashboard/types';

interface KpiCardProps {
  label: string;
  value: number | string;
  subLabel?: string;
  href?: string;
  loading?: boolean;
  index: number;
}

const KpiCard = memo(function KpiCard({ label, value, subLabel, href, loading, index }: KpiCardProps) {
  const navigate = useNavigate();
  return (
    <motion.div
      className={`v2r-kpi-card${href ? ' v2r-kpi-card--link' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.25, 1, 0.5, 1] }}
      onClick={href ? () => navigate(href) : undefined}
      role={href ? 'link' : undefined}
      tabIndex={href ? 0 : undefined}
      onKeyDown={href ? (e) => { if (e.key === 'Enter' || e.key === ' ') navigate(href); } : undefined}
      aria-label={href ? `${label}: ${value}. Click to view.` : undefined}
    >
      <span className="v2r-kpi-card__label">{label}</span>
      <span className="v2r-kpi-card__value">
        {loading ? '—' : value}
      </span>
      {subLabel && <span className="v2r-kpi-card__sublabel">{subLabel}</span>}
    </motion.div>
  );
});

interface KpiSectionProps {
  stats: DashboardQuickStats | null;
  loading?: boolean;
}

export const KpiSection = memo(function KpiSection({ stats, loading = false }: KpiSectionProps) {
  const val = stats?.validation;
  const sprint = stats?.sprint;
  const build = stats?.build;

  const groups = [
    {
      id: 'validation',
      label: 'Validation Reports',
      icon: '🔬',
      cards: [
        { label: 'Total Reports', value: val?.total ?? 0, subLabel: 'All time' },
        { label: 'Completed', value: val?.completed ?? 0, subLabel: 'Reports ready', href: '/founder/validations' },
        { label: 'Processing', value: val?.processing ?? 0, subLabel: 'In progress' },
      ],
    },
    {
      id: 'sprint',
      label: 'Reality Sprint',
      icon: '⚡',
      cards: [
        { label: 'Total Requests', value: sprint?.total ?? 0, subLabel: 'All time' },
        { label: 'Active Sprints', value: sprint?.active ?? 0, subLabel: 'In flight', href: '/founder/sprint' },
        {
          label: 'Latest Status',
          value: sprint?.latestStatus
            ? sprint.latestStatus.replace(/_/g, ' ')
            : sprint?.total === 0
            ? 'None yet'
            : '—',
          subLabel: 'Most recent',
        },
      ],
    },
    {
      id: 'build',
      label: 'Build Requests',
      icon: '🚀',
      cards: [
        { label: 'Total Projects', value: build?.total ?? 0, subLabel: 'All time' },
        { label: 'Active', value: build?.active ?? 0, subLabel: 'In development', href: '/founder/build-requests' },
        {
          label: 'Avg Progress',
          value: build && build.total > 0 ? `${Math.round(build.averageProgress)}%` : '—',
          subLabel: 'Across all projects',
        },
      ],
    },
  ];

  return (
    <section className="v2r-kpi-section" aria-label="Key Performance Metrics">
      {groups.map((group, gi) => (
        <div key={group.id} className="v2r-kpi-group">
          <div className="v2r-kpi-group__header">
            <span className="v2r-kpi-group__icon" aria-hidden="true">{group.icon}</span>
            <h3 className="v2r-kpi-group__label">{group.label}</h3>
          </div>
          <div className="v2r-kpi-group__cards">
            {group.cards.map((card, ci) => (
              <KpiCard
                key={card.label}
                label={card.label}
                value={card.value}
                subLabel={card.subLabel}
                href={card.href}
                loading={loading}
                index={gi * 3 + ci}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
});
