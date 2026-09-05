import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Shield,
  Users,
  Building2,
  Image,
  KeyRound,
  Lock,
  BellRing,
  Cpu,
  Server,
  FileText,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Power,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Activity,
  Globe,
  Mail,
} from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';
import { adminSettingsApi } from '../services/admin_settings_service';
import type {
  AdminUserItem,
  AdminAuditLogItem,
  SettingsSummary,
} from '../services/admin_settings_service';

type SectionTab =
  | 'general'
  | 'access'
  | 'organization'
  | 'branding'
  | 'auth'
  | 'security'
  | 'push'
  | 'infrastructure'
  | 'platform'
  | 'audit';

const NAV_ITEMS: { id: SectionTab; label: string; icon: any; category: string }[] = [
  { id: 'general', label: 'General Overview', icon: Activity, category: 'SYSTEM' },
  { id: 'access', label: 'Admin Access Management', icon: Users, category: 'SECURITY' },
  { id: 'organization', label: 'Organization Profile', icon: Building2, category: 'PLATFORM' },
  { id: 'branding', label: 'Branding & Assets', icon: Image, category: 'PLATFORM' },
  { id: 'auth', label: 'Authentication Providers', icon: KeyRound, category: 'SECURITY' },
  { id: 'security', label: 'Security & Policies', icon: Lock, category: 'SECURITY' },
  { id: 'push', label: 'Push Notifications', icon: BellRing, category: 'INFRASTRUCTURE' },
  { id: 'infrastructure', label: 'Notification Engine', icon: Cpu, category: 'INFRASTRUCTURE' },
  { id: 'platform', label: 'Platform & Storage', icon: Server, category: 'SYSTEM' },
  { id: 'audit', label: 'Audit Logs', icon: FileText, category: 'SECURITY' },
];

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SectionTab>('general');
  const [summary, setSummary] = useState<SettingsSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminSettingsApi.getSummary();
      setSummary(res);
    } catch (e) {
      console.error('Failed to load settings summary:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header Card */}
      <div className="v2r-admin-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#818cf8', marginBottom: '0.375rem' }}>
            <Settings style={{ width: '22px', height: '22px' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
              System Settings & Administration Center
            </h2>
          </div>
          <p style={{ fontSize: '0.775rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0, maxWidth: '680px' }}>
            Enterprise control plane for Vision2Real. Manage admin access credentials, organization profile, authentication security policies, infrastructure worker engine, and platform audit logs.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '0.725rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <CheckCircle2 style={{ width: 14, height: 14 }} /> System Operational
          </span>
          <button
            onClick={fetchSummary}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw style={{ width: 13, height: 13, animation: loading ? 'spin 1s linear infinite' : undefined }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Layout: Left Sidebar + Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Left Sub-Navigation Menu */}
        <div className="v2r-admin-card" style={{ padding: '0.75rem' }}>
          <div style={{ padding: '0.375rem 0.5rem 0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Navigation Categories
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.625rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: isActive ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
                    color: isActive ? '#a5b4fc' : 'rgba(255, 255, 255, 0.65)',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 600 : 400,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color: isActive ? '#818cf8' : 'rgba(255,255,255,0.45)' }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Section Content */}
        <div>
          {activeTab === 'general' && <GeneralOverviewTab summary={summary} onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'access' && <AdminAccessTab />}
          {activeTab === 'organization' && <OrganizationTab summary={summary} onUpdated={fetchSummary} />}
          {activeTab === 'branding' && <BrandingTab />}
          {activeTab === 'auth' && <AuthTab summary={summary} />}
          {activeTab === 'security' && <SecurityTab summary={summary} />}
          {activeTab === 'push' && <PushTab summary={summary} onUpdated={fetchSummary} />}
          {activeTab === 'infrastructure' && <InfrastructureTab summary={summary} />}
          {activeTab === 'platform' && <PlatformTab summary={summary} />}
          {activeTab === 'audit' && <AuditTab />}
        </div>
      </div>
    </div>
  );
}

// ── 1. General Overview Tab ───────────────────────────────────────────────────

function GeneralOverviewTab({
  summary,
  onNavigate,
}: {
  summary: SettingsSummary | null;
  onNavigate: (tab: SectionTab) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Executive Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="v2r-admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>Organization</span>
            <Building2 style={{ width: 16, height: 16, color: '#818cf8' }} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem 0' }}>
            {summary?.organization.company_name || 'Vision2Real'}
          </h3>
          <p style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            {summary?.organization.platform_name || 'Vision2Real'} Platform
          </p>
        </div>

        <div className="v2r-admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>Push Subscribers</span>
            <BellRing style={{ width: 16, height: 16, color: '#34d399' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem 0' }}>
            {summary?.push.subscribers_count || 0}
          </h3>
          <p style={{ fontSize: '0.675rem', color: '#34d399', margin: 0 }}>
            {summary?.push.delivery_success_rate || 0}% Delivery Success
          </p>
        </div>

        <div className="v2r-admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>Environment</span>
            <Server style={{ width: 16, height: 16, color: '#fbbf24' }} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem 0', textTransform: 'uppercase' }}>
            {summary?.platform.environment || 'Production'}
          </h3>
          <p style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            v{summary?.platform.backend_version || '0.1.0'} Backend Engine
          </p>
        </div>

        <div className="v2r-admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>Security Status</span>
            <Shield style={{ width: 16, height: 16, color: '#60a5fa' }} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem 0' }}>Enforced</h3>
          <p style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            {summary?.security.session_timeout_minutes || 60}m Session Timeout
          </p>
        </div>
      </div>

      {/* Control Plane Quick Links Grid */}
      <div className="v2r-admin-card">
        <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>Operational Control Modules</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.875rem' }}>
          {[
            { id: 'access', title: 'Admin Access Management', desc: 'Create, edit, reset passwords, and manage role privileges for platform admins.', icon: Users, color: '#818cf8' },
            { id: 'organization', title: 'Organization Profile', desc: 'Update official company metadata, support contacts, website, and timezone.', icon: Building2, color: '#34d399' },
            { id: 'push', title: 'Push Notification Engine', desc: 'Manage VAPID keys, subscriber tokens, and channel delivery metrics.', icon: BellRing, color: '#fbbf24' },
            { id: 'audit', title: 'Admin Audit Log Viewer', desc: 'Inspect full audit history of all administrative state mutations with IP tracking.', icon: FileText, color: '#f472b6' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => onNavigate(card.id as SectionTab)}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '0.625rem',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', color: card.color }}>
                  <Icon style={{ width: 18, height: 18 }} />
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{card.title}</h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.725rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{card.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 2. Admin Access Management Tab ────────────────────────────────────────────

function AdminAccessTab() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserItem | null>(null);
  const [resetPassUser, setResetPassUser] = useState<AdminUserItem | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminSettingsApi.listAdminUsers({
        page,
        page_size: 10,
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      setUsers(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user: AdminUserItem) => {
    const actionName = user.is_active ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${actionName} admin account for "${user.full_name}"?`)) return;

    setActionLoading(user.id);
    try {
      await adminSettingsApi.updateAdminStatus(user.id, !user.is_active);
      fetchUsers();
    } catch (e: any) {
      alert(e?.response?.data?.detail || `Failed to ${actionName} admin account.`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="v2r-admin-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Admin Access Accounts</h3>
          <p style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.45)', margin: '0.25rem 0 0 0' }}>
            Manage platform admin accounts, privilege roles, passwords, and status controls.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.5rem 0.875rem',
            borderRadius: '0.5rem',
            background: '#6366f1',
            border: 'none',
            color: '#fff',
            fontSize: '0.775rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus style={{ width: 15, height: 15 }} /> Add Admin User
        </button>
      </div>

      {/* Safety Rules Banner */}
      <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '0.625rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <Shield style={{ width: 16, height: 16, color: '#818cf8', flexShrink: 0 }} />
        <span style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.4 }}>
          <strong>Safety Rules Enforced:</strong> Self-disabling, self-demotion, or disabling the last remaining <code style={{ color: '#a5b4fc' }}>SUPER_ADMIN</code> account is strictly prohibited.
        </span>
      </div>

      {/* Filters & Search */}
      <div className="v2r-admin-card" style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search style={{ width: 14, height: 14, position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2.25rem',
              borderRadius: '0.5rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '0.775rem',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ padding: '0.45rem 0.75rem', borderRadius: '0.5rem', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.775rem' }}
        >
          <option value="">All Roles</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          <option value="ADMIN">ADMIN</option>
          <option value="OPERATIONS">OPERATIONS</option>
          <option value="SUPPORT">SUPPORT</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '0.45rem 0.75rem', borderRadius: '0.5rem', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.775rem' }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Admins Table */}
      <div className="v2r-admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Loading admin accounts…</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>No admin accounts found matching filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Admin User', 'Role', 'Status', 'Provider', 'Last Login', 'Created', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '0.75rem 0.875rem', textAlign: 'left', fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.75rem 0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: '#fff' }}>
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>{u.full_name}</p>
                          <p style={{ margin: 0, fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.875rem' }}>
                      <span style={{ fontSize: '0.675rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '0.375rem', background: u.role === 'SUPER_ADMIN' ? 'rgba(168,85,247,0.15)' : 'rgba(99,102,241,0.15)', color: u.role === 'SUPER_ADMIN' ? '#c084fc' : '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.875rem' }}>
                      <span style={{ fontSize: '0.675rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '0.375rem', background: u.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: u.is_active ? '#34d399' : '#f87171' }}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.875rem', color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>{u.auth_provider}</td>
                    <td style={{ padding: '0.75rem 0.875rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}</td>
                    <td style={{ padding: '0.75rem 0.875rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem 0.875rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button
                          onClick={() => setEditUser(u)}
                          title="Edit Admin"
                          style={{ padding: '0.25rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
                        >
                          <Edit2 style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          onClick={() => setResetPassUser(u)}
                          title="Reset Password"
                          style={{ padding: '0.25rem', borderRadius: '0.375rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24', cursor: 'pointer' }}
                        >
                          <KeyRound style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={actionLoading === u.id}
                          title={u.is_active ? 'Disable Account' : 'Enable Account'}
                          style={{ padding: '0.25rem', borderRadius: '0.375rem', background: u.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: u.is_active ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)', color: u.is_active ? '#f87171' : '#34d399', cursor: 'pointer' }}
                        >
                          <Power style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.4)' }}>Page {page} of {totalPages} ({total} accounts)</span>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.3rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === 1 ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}>
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.3rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === totalPages ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      {showAddModal && <AddAdminModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchUsers(); }} />}

      {/* Edit Admin Modal */}
      {editUser && <EditAdminModal user={editUser} onClose={() => setEditUser(null)} onSuccess={() => { setEditUser(null); fetchUsers(); }} />}

      {/* Reset Password Modal */}
      {resetPassUser && <ResetPasswordModal user={resetPassUser} onClose={() => setResetPassUser(null)} />}
    </div>
  );
}

function AddAdminModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await adminSettingsApi.createAdminUser({
        full_name: fullName,
        email,
        password,
        confirm_password: confirmPassword,
        role,
        is_active: true,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create admin user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="v2r-admin-card" style={{ width: '100%', maxWidth: '440px', background: '#0d0e15', border: '1px solid rgba(255,255,255,0.12)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem 0' }}>Add New Admin Account</h3>

        {error && <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Full Name</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Password</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Confirm Password</label>
            <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Admin Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.625rem', borderRadius: '0.375rem', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }}>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="OPERATIONS">OPERATIONS</option>
              <option value="SUPPORT">SUPPORT</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.4rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ padding: '0.4rem 0.875rem', borderRadius: '0.375rem', background: '#6366f1', border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
              {submitting ? 'Creating…' : 'Create Admin Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAdminModal({ user, onClose, onSuccess }: { user: AdminUserItem; onClose: () => void; onSuccess: () => void }) {
  const [fullName, setFullName] = useState(user.full_name);
  const [role, setRole] = useState(user.role);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await adminSettingsApi.updateAdminUser(user.id, { full_name: fullName, role });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update admin user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="v2r-admin-card" style={{ width: '100%', maxWidth: '400px', background: '#0d0e15', border: '1px solid rgba(255,255,255,0.12)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem 0' }}>Edit Admin Account</h3>

        {error && <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Full Name</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.625rem', borderRadius: '0.375rem', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }}>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="OPERATIONS">OPERATIONS</option>
              <option value="SUPPORT">SUPPORT</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.4rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ padding: '0.4rem 0.875rem', borderRadius: '0.375rem', background: '#6366f1', border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }: { user: AdminUserItem; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await adminSettingsApi.resetAdminPassword(user.id, { password, confirm_password: confirmPassword });
      alert(`Password for ${user.full_name} updated successfully.`);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="v2r-admin-card" style={{ width: '100%', maxWidth: '400px', background: '#0d0e15', border: '1px solid rgba(255,255,255,0.12)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: '0 0 0.25rem 0' }}>Reset Password</h3>
        <p style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.45)', margin: '0 0 1rem 0' }}>
          Reset account password for <strong>{user.full_name}</strong> ({user.email}). Old password is not required.
        </p>

        {error && <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>New Password</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Confirm New Password</label>
            <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.4rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ padding: '0.4rem 0.875rem', borderRadius: '0.375rem', background: '#f59e0b', border: 'none', color: '#000', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
              {submitting ? 'Resetting…' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 3. Organization Profile Tab ───────────────────────────────────────────────

function OrganizationTab({ summary, onUpdated }: { summary: SettingsSummary | null; onUpdated: () => void }) {
  const org = summary?.organization;
  const [companyName, setCompanyName] = useState('');
  const [platformName, setPlatformName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (org) {
      setCompanyName(org.company_name || '');
      setPlatformName(org.platform_name || '');
      setSupportEmail(org.support_email || '');
      setSupportPhone(org.support_phone || '');
      setWebsite(org.website || '');
      setAddress(org.address || '');
      setTimezone(org.timezone || 'UTC');
    }
  }, [org]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSaved(false);
    try {
      await adminSettingsApi.updateOrganization({
        company_name: companyName,
        platform_name: platformName,
        support_email: supportEmail,
        support_phone: supportPhone,
        website,
        address,
        timezone,
      });
      setSaved(true);
      onUpdated();
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Failed to update organization profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="v2r-admin-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Organization Profile</h3>
          <p style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.45)', margin: '0.25rem 0 0 0' }}>
            Official company profile used across emails, headers, and marketing communications.
          </p>
        </div>
        {saved && (
          <span style={{ fontSize: '0.725rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.35rem 0.75rem', borderRadius: '0.375rem', fontWeight: 600 }}>
            Changes Saved Successfully!
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.725rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem', fontWeight: 600 }}>Company Name</label>
          <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.725rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem', fontWeight: 600 }}>Platform Name</label>
          <input type="text" required value={platformName} onChange={(e) => setPlatformName(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.725rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem', fontWeight: 600 }}>Support Email</label>
          <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.725rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem', fontWeight: 600 }}>Support Phone</label>
          <input type="text" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.725rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem', fontWeight: 600 }}>Official Website</label>
          <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.725rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem', fontWeight: 600 }}>Default Timezone</label>
          <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }} />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '0.725rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem', fontWeight: 600 }}>Office Address</label>
          <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem', resize: 'vertical' }} />
        </div>

        <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.25rem', borderRadius: '0.5rem', background: '#6366f1', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            {submitting ? 'Saving Profile…' : 'Save Organization Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── 4. Branding & Assets Tab ──────────────────────────────────────────────────

function BrandingTab() {
  return (
    <div className="v2r-admin-card">
      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Branding Assets & Media</h3>
      <p style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.45)', margin: '0.25rem 0 1.25rem 0' }}>
        Logos, favicon, OpenGraph banners, and email header assets.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Primary Brand Logo', desc: 'Main light mode SVG logo', icon: Image },
          { label: 'Dark Mode Logo', desc: 'Main dark mode SVG logo', icon: Image },
          { label: 'Platform Favicon', desc: '32x32 browser tab icon', icon: Globe },
          { label: 'OpenGraph Card Image', desc: '1200x630 social preview image', icon: Image },
          { label: 'Email Header Logo', desc: '600x120 email header asset', icon: Mail },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.625rem', padding: '1rem', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '0.5rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
                <Icon style={{ width: 20, height: 20 }} />
              </div>
              <h4 style={{ fontSize: '0.825rem', fontWeight: 700, color: '#fff', margin: '0 0 0.25rem 0' }}>{item.label}</h4>
              <p style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 0.75rem 0' }}>{item.desc}</p>
              <button style={{ padding: '0.3rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', cursor: 'pointer' }}>
                Upload Asset
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 5. Authentication Providers Tab ──────────────────────────────────────────

function AuthTab({ summary }: { summary: SettingsSummary | null }) {
  return (
    <div className="v2r-admin-card">
      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Authentication Providers</h3>
      <p style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.45)', margin: '0.25rem 0 1.25rem 0' }}>
        Configured SSO and local authentication providers.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {(summary?.auth.providers || [
          { name: 'local', enabled: true, configuration_status: 'configured' },
          { name: 'google', enabled: false, configuration_status: 'not-configured' },
          { name: 'microsoft', enabled: false, configuration_status: 'planned' },
          { name: 'github', enabled: false, configuration_status: 'planned' },
          { name: 'apple', enabled: false, configuration_status: 'planned' },
        ]).map((p) => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <KeyRound style={{ width: 18, height: 18, color: '#818cf8' }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>{p.name} Auth Provider</h4>
                <p style={{ margin: '0.125rem 0 0 0', fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)' }}>Status: {p.configuration_status}</p>
              </div>
            </div>

            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '0.375rem', background: p.enabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', color: p.enabled ? '#34d399' : 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {p.enabled ? 'Enabled' : 'Disabled / Planned'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 6. Security Policies Tab ─────────────────────────────────────────────────

function SecurityTab({ summary }: { summary: SettingsSummary | null }) {
  const sec = summary?.security;
  return (
    <div className="v2r-admin-card">
      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Security Policies & Session Limits</h3>
      <p style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.45)', margin: '0.25rem 0 1.25rem 0' }}>
        Enforced password policy, JWT token expiration, and session timeout thresholds.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.625rem', padding: '1rem' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8', margin: '0 0 0.75rem 0' }}>Token Lifetimes</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.775rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
              <span>JWT Access Token Expiration:</span>
              <strong style={{ color: '#fff' }}>{sec?.jwt_lifetime_minutes || 60} mins</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
              <span>Refresh Token Expiration:</span>
              <strong style={{ color: '#fff' }}>{sec?.refresh_token_lifetime_days || 7} days</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
              <span>Session Inactivity Timeout:</span>
              <strong style={{ color: '#fff' }}>{sec?.session_timeout_minutes || 60} mins</strong>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.625rem', padding: '1rem' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399', margin: '0 0 0.75rem 0' }}>Password Policy</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.775rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
              <span>Minimum Length:</span>
              <strong style={{ color: '#fff' }}>{sec?.password_policy?.minimum_length || 8} chars</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
              <span>Require Uppercase:</span>
              <strong style={{ color: sec?.password_policy?.require_uppercase ? '#34d399' : 'rgba(255,255,255,0.4)' }}>Required</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
              <span>Require Numbers & Symbols:</span>
              <strong style={{ color: sec?.password_policy?.require_symbols ? '#34d399' : 'rgba(255,255,255,0.4)' }}>Required</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 7. Push Notification Settings Tab ────────────────────────────────────────

function PushTab({ summary, onUpdated }: { summary: SettingsSummary | null; onUpdated: () => void }) {
  const push = summary?.push;
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleCopy = () => {
    if (push?.vapid_public_key) {
      navigator.clipboard.writeText(push.vapid_public_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Are you sure you want to regenerate VAPID keys? Active push subscribers will remain registered.')) return;
    setRegenerating(true);
    try {
      await adminSettingsApi.regeneratePushKeys();
      onUpdated();
      alert('VAPID key pair regenerated successfully.');
    } catch (e) {
      console.error(e);
      alert('Failed to regenerate VAPID keys.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="v2r-admin-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Push Notification Configuration</h3>
          <p style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.45)', margin: '0.25rem 0 0 0' }}>
            VAPID push key pair and web push service parameters powering Stage 7.5 Notification Center.
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '0.5rem',
            background: 'rgba(245,158,11,0.15)',
            border: '1px solid rgba(245,158,11,0.3)',
            color: '#fbbf24',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw style={{ width: 13, height: 13, animation: regenerating ? 'spin 1s linear infinite' : undefined }} />
          Regenerate Keys
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.725rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.375rem', fontWeight: 600 }}>VAPID Public Key</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              readOnly
              value={push?.vapid_public_key || ''}
              style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#818cf8', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
            />
            <button
              onClick={handleCopy}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}
            >
              {copied ? <Check style={{ width: 14, height: 14, color: '#34d399' }} /> : <Copy style={{ width: 14, height: 14 }} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '0.75rem' }}>
            <span style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', display: 'block' }}>Service Status</span>
            <strong style={{ fontSize: '0.85rem', color: '#34d399', textTransform: 'capitalize' }}>{push?.push_service_status || 'Configured'}</strong>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '0.75rem' }}>
            <span style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', display: 'block' }}>Registered Subscribers</span>
            <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{push?.subscribers_count || 0} founders</strong>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '0.75rem' }}>
            <span style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', display: 'block' }}>Campaign Dispatches</span>
            <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{push?.campaign_count || 0} campaigns</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 8. Notification Infrastructure Tab ───────────────────────────────────────

function InfrastructureTab({ summary }: { summary: SettingsSummary | null }) {
  const infra = summary?.infrastructure;
  return (
    <div className="v2r-admin-card">
      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Notification Engine Infrastructure</h3>
      <p style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.45)', margin: '0.25rem 0 1.25rem 0' }}>
        Live metrics for queued notifications, retry queues, and background delivery workers.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>
        {[
          { label: 'Queued Notifications', value: infra?.queued_notifications || 0, color: '#818cf8' },
          { label: 'Scheduled Campaigns', value: infra?.scheduled_campaigns || 0, color: '#fbbf24' },
          { label: 'Failed Deliveries', value: infra?.failed_deliveries || 0, color: '#f87171' },
          { label: 'Retry Queue Size', value: infra?.retry_queue || 0, color: '#34d399' },
          { label: 'Notification Templates', value: infra?.notification_templates || 0, color: '#c084fc' },
          { label: 'Delivery Workers', value: infra?.delivery_workers || 'in-process', color: '#60a5fa' },
        ].map((item) => (
          <div key={item.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '0.875rem' }}>
            <span style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.25rem' }}>{item.label}</span>
            <strong style={{ fontSize: '1.125rem', fontWeight: 800, color: item.color }}>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 9. Platform & Storage Tab ─────────────────────────────────────────────────

function PlatformTab({ summary }: { summary: SettingsSummary | null }) {
  const plat = summary?.platform;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="v2r-admin-card">
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>System Version & Environment</h3>
        <p style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.45)', margin: '0.25rem 0 1.25rem 0' }}>
          Runtime platform versions, environment metadata, and database engine info.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.775rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.375rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Backend Engine:</span>
            <strong style={{ color: '#fff' }}>v{plat?.backend_version || '0.1.0'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.375rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>API Version:</span>
            <strong style={{ color: '#fff' }}>{plat?.api_version || 'v1'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.375rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Environment:</span>
            <strong style={{ color: '#34d399', textTransform: 'capitalize' }}>{plat?.environment || 'production'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.375rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Python Runtime:</span>
            <strong style={{ color: '#fff' }}>v{plat?.python_version || '3.11'}</strong>
          </div>
        </div>
      </div>

      <div className="v2r-admin-card">
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Storage & Disk Footprint</h3>
        <p style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.45)', margin: '0.25rem 0 1.25rem 0' }}>
          Document, PDF, and image storage utilization breakdown.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '0.875rem' }}>
            <span style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', display: 'block' }}>PDF Dossier Storage</span>
            <strong style={{ fontSize: '1rem', color: '#fff' }}>{plat?.storage?.pdf_storage_size_bytes ? `${(plat.storage.pdf_storage_size_bytes / 1024).toFixed(1)} KB` : '0 KB'}</strong>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '0.875rem' }}>
            <span style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', display: 'block' }}>Founder Uploads</span>
            <strong style={{ fontSize: '1rem', color: '#fff' }}>{plat?.storage?.uploads_size_bytes ? `${(plat.storage.uploads_size_bytes / 1024).toFixed(1)} KB` : '0 KB'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 10. Audit Logs Tab ────────────────────────────────────────────────────────

function AuditTab() {
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AdminAuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminSettingsApi.listAuditLogs({
        page,
        page_size: 10,
        search: search || undefined,
        action: actionFilter || undefined,
      });
      setLogs(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="v2r-admin-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Administrative Audit Logs</h3>
          <p style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.45)', margin: '0.25rem 0 0 0' }}>
            Persistent, unalterable record of administrative actions, configuration updates, and security events.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="v2r-admin-card" style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search style={{ width: 14, height: 14, position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          <input
            type="text"
            placeholder="Search by admin, action, or target label…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2.25rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.775rem', outline: 'none' }}
          />
        </div>

        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} style={{ padding: '0.45rem 0.75rem', borderRadius: '0.5rem', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.775rem' }}>
          <option value="">All Actions</option>
          <option value="ADMIN_CREATED">ADMIN_CREATED</option>
          <option value="ADMIN_UPDATED">ADMIN_UPDATED</option>
          <option value="ADMIN_PASSWORD_RESET">ADMIN_PASSWORD_RESET</option>
          <option value="ORGANIZATION_UPDATED">ORGANIZATION_UPDATED</option>
          <option value="VAPID_KEYS_REGENERATED">VAPID_KEYS_REGENERATED</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="v2r-admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Loading audit logs…</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>No audit records found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Timestamp', 'Admin', 'Action', 'Target', 'IP Address', 'Result', 'Details'].map((h) => (
                    <th key={h} style={{ padding: '0.75rem 0.875rem', textAlign: 'left', fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.75rem 0.875rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem 0.875rem', fontWeight: 600, color: '#fff' }}>{log.admin_name || log.admin_id || 'System'}</td>
                    <td style={{ padding: '0.75rem 0.875rem' }}>
                      <span style={{ fontSize: '0.675rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.875rem', color: 'rgba(255,255,255,0.7)' }}>{log.target_label || log.target_id || '—'}</td>
                    <td style={{ padding: '0.75rem 0.875rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono)', fontSize: '0.725rem' }}>{log.ip_address || '127.0.0.1'}</td>
                    <td style={{ padding: '0.75rem 0.875rem' }}>
                      <span style={{ fontSize: '0.675rem', fontWeight: 600, color: log.result === 'SUCCESS' ? '#34d399' : '#f87171' }}>{log.result}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.875rem' }}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Eye style={{ width: 12, height: 12 }} /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.4)' }}>Page {page} of {totalPages} ({total} logs)</span>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.3rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === 1 ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}>
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.3rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === totalPages ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Log Payload Modal */}
      {selectedLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="v2r-admin-card" style={{ width: '100%', maxWidth: '560px', background: '#0d0e15', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Audit Log Payload Inspector</h3>
              <button onClick={() => setSelectedLog(null)} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.7rem' }}>Close</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.775rem' }}>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '0.675rem' }}>Action</span>
                <strong style={{ color: '#818cf8' }}>{selectedLog.action}</strong>
              </div>

              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '0.675rem', marginBottom: '0.25rem' }}>Previous Values (`old_values`)</span>
                <pre style={{ margin: 0, padding: '0.5rem', borderRadius: '0.375rem', background: '#050508', border: '1px solid rgba(255,255,255,0.08)', color: '#a5b4fc', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', overflowX: 'auto' }}>
                  {JSON.stringify(selectedLog.old_values, null, 2)}
                </pre>
              </div>

              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '0.675rem', marginBottom: '0.25rem' }}>New State Payload (`new_values`)</span>
                <pre style={{ margin: 0, padding: '0.5rem', borderRadius: '0.375rem', background: '#050508', border: '1px solid rgba(255,255,255,0.08)', color: '#34d399', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', overflowX: 'auto' }}>
                  {JSON.stringify(selectedLog.new_values, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
