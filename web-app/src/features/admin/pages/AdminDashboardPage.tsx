import { useEffect, useState } from 'react';
import { adminApi, type AdminDashboardSummary } from '@/services/api/adminApi';
import { Users, Zap, Hammer, ShieldAlert, ArrowUpRight, Activity } from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';

export function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true);
        const data = await adminApi.getDashboardSummary();
        setSummary(data);
      } catch (err: any) {
        console.error('Failed to load admin dashboard summary:', err);
        setError('Failed to fetch platform metrics from server.');
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="v2r-admin-card v2r-admin-card--banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            <Activity style={{ width: '16px', height: '16px' }} />
            <span>Operational Overview</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Super Admin Dashboard</h2>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
            Real-time operational statistics across the Vision2Real platform.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.5rem 0.875rem', borderRadius: '0.5rem' }}>
          <ShieldAlert style={{ width: '16px', height: '16px' }} />
          <span>Stage 7.1 Admin Foundation Active</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="v2r-admin-grid-3">
        {/* Total Founders */}
        <div className="v2r-admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)' }}>Total Registered Founders</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: 'rgba(109, 93, 246, 0.15)', border: '1px solid rgba(109, 93, 246, 0.3)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}>
              <Users style={{ width: '18px', height: '18px' }} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
              {isLoading ? '...' : summary?.total_founders ?? 0}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.6875rem', fontWeight: 600, color: '#34d399', marginLeft: 'auto' }}>
              <ArrowUpRight style={{ width: '14px', height: '14px', marginRight: '0.125rem' }} />
              <span>Live DB</span>
            </div>
          </div>
        </div>

        {/* Total Reality Sprints */}
        <div className="v2r-admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)' }}>Total Reality Sprints</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}>
              <Zap style={{ width: '18px', height: '18px' }} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
              {isLoading ? '...' : summary?.total_reality_sprints ?? 0}
            </div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#fbbf24', marginLeft: 'auto' }}>
              <span>Operational</span>
            </div>
          </div>
        </div>

        {/* Total Build Requests */}
        <div className="v2r-admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)' }}>Total Build Requests</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}>
              <Hammer style={{ width: '18px', height: '18px' }} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
              {isLoading ? '...' : summary?.total_build_requests ?? 0}
            </div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#22d3ee', marginLeft: 'auto' }}>
              <span>Operational</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.875rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.75rem' }}>
          {error}
        </div>
      )}

      {/* Stage Roadmap Notice */}
      <div className="v2r-admin-card">
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.375rem' }}>Stage 7 Architecture Roadmap</h3>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '1.25rem' }}>
          Admin HQ modules are scheduled for systematic implementation across Stage 7 sub-sprints:
        </p>
        <div className="v2r-admin-grid-3" style={{ fontSize: '0.75rem' }}>
          <div style={{ padding: '0.75rem', background: '#050505', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.8)' }}>
            <strong style={{ color: '#818cf8' }}>Stage 7.2:</strong> Founder Management
          </div>
          <div style={{ padding: '0.75rem', background: '#050505', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.8)' }}>
            <strong style={{ color: '#818cf8' }}>Stage 7.3:</strong> Validation Management
          </div>
          <div style={{ padding: '0.75rem', background: '#050505', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.8)' }}>
            <strong style={{ color: '#818cf8' }}>Stage 7.4:</strong> Reality Sprint Operations
          </div>
          <div style={{ padding: '0.75rem', background: '#050505', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.8)' }}>
            <strong style={{ color: '#818cf8' }}>Stage 7.5:</strong> Build Request Management
          </div>
          <div style={{ padding: '0.75rem', background: '#050505', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.8)' }}>
            <strong style={{ color: '#818cf8' }}>Stage 7.6:</strong> Broadcast & Notifications
          </div>
          <div style={{ padding: '0.75rem', background: '#050505', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.8)' }}>
            <strong style={{ color: '#818cf8' }}>Stage 7.7:</strong> Platform Settings & Logs
          </div>
        </div>
      </div>
    </div>
  );
}
