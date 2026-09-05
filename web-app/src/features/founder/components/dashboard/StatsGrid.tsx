import { memo } from 'react';
import type { DashboardStats } from '@/services/dashboard/types';
import { StatCard } from './StatCard';

interface StatsGridProps {
  stats: DashboardStats;
}

export const StatsGrid = memo(function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="v2r-stats-grid">
      <StatCard label="Ideas" value={stats.ideas_count} variant="ideas" index={0} />
      <StatCard label="Validations" value={stats.validations_count} variant="validations" index={1} />
      <StatCard label="Reports" value={stats.reports_count} variant="reports" index={2} />
      <StatCard label="Projects" value={stats.projects_count} variant="projects" index={3} />
    </div>
  );
});
