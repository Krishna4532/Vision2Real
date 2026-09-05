import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BarChart3,
  Send,
  History,
  FileText,
  Wifi,
  Settings2,
  Search,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Sparkles,
  Plus,
  Trash2,
  Eye,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  MousePointerClick,
  Zap,
  Package,
} from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';
import { adminApi } from '@/services/api/adminApi';
import type {
  CampaignAnalyticsResponse,
  MarketingCampaignItem,
  CampaignCreatePayload,
  NotificationTemplateItem,
  PushSubscriberItem,
  FounderPreferenceAdminItem,
  CampaignDeliveryLogItem,
} from '@/services/api/adminApi';

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function CampaignStatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  let bg = 'rgba(99,102,241,0.15)';
  let color = '#a5b4fc';
  let icon = <Clock style={{ width: 10, height: 10 }} />;

  if (s === 'SENT') { bg = 'rgba(16,185,129,0.12)'; color = '#34d399'; icon = <CheckCircle2 style={{ width: 10, height: 10 }} />; }
  else if (s === 'SENDING') { bg = 'rgba(245,158,11,0.12)'; color = '#fbbf24'; icon = <Zap style={{ width: 10, height: 10 }} />; }
  else if (s === 'SCHEDULED') { bg = 'rgba(59,130,246,0.12)'; color = '#60a5fa'; icon = <Clock style={{ width: 10, height: 10 }} />; }
  else if (s === 'DRAFT') { bg = 'rgba(107,114,128,0.15)'; color = '#9ca3af'; icon = <FileText style={{ width: 10, height: 10 }} />; }
  else if (s === 'CANCELLED' || s === 'FAILED') { bg = 'rgba(239,68,68,0.12)'; color = '#f87171'; icon = <XCircle style={{ width: 10, height: 10 }} />; }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '0.375rem', background: bg, color, fontSize: '0.7rem', fontWeight: 600 }}>
      {icon} {s}
    </span>
  );
}

function DeliveryLogStatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  let bg = 'rgba(107,114,128,0.15)'; let color = '#9ca3af';
  if (s === 'DELIVERED') { bg = 'rgba(16,185,129,0.12)'; color = '#34d399'; }
  else if (s === 'FAILED') { bg = 'rgba(239,68,68,0.12)'; color = '#f87171'; }
  else if (s === 'PENDING') { bg = 'rgba(245,158,11,0.12)'; color = '#fbbf24'; }
  return (
    <span style={{ padding: '0.15rem 0.45rem', borderRadius: '0.25rem', background: bg, color, fontSize: '0.65rem', fontWeight: 600 }}>
      {s}
    </span>
  );
}

// ── Tab IDs ─────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'builder' | 'history' | 'templates' | 'subscribers' | 'preferences';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 style={{ width: 15, height: 15 }} /> },
  { id: 'builder', label: 'Campaign Builder', icon: <Megaphone style={{ width: 15, height: 15 }} /> },
  { id: 'history', label: 'Campaign History', icon: <History style={{ width: 15, height: 15 }} /> },
  { id: 'templates', label: 'Templates', icon: <FileText style={{ width: 15, height: 15 }} /> },
  { id: 'subscribers', label: 'Push Subscribers', icon: <Wifi style={{ width: 15, height: 15 }} /> },
  { id: 'preferences', label: 'Founder Preferences', icon: <Settings2 style={{ width: 15, height: 15 }} /> },
];

const AUDIENCE_OPTIONS = [
  { value: 'ALL_FOUNDERS', label: 'All Founders' },
  { value: 'ACTIVE_FOUNDERS', label: 'Active Founders' },
  { value: 'INACTIVE_FOUNDERS', label: 'Inactive Founders' },
  { value: 'JOINED_THIS_WEEK', label: 'Joined This Week' },
  { value: 'JOINED_THIS_MONTH', label: 'Joined This Month' },
  { value: 'BUILD_FOUNDERS', label: 'Build Request Founders' },
  { value: 'SPRINT_FOUNDERS', label: 'Reality Sprint Founders' },
  { value: 'VALIDATED_FOUNDERS', label: 'Validated Founders' },
  { value: 'SPECIFIC_FOUNDER', label: 'Specific Founder' },
  { value: 'MULTIPLE_FOUNDERS', label: 'Multiple Founders' },
];

const VARIABLE_TAGS = [
  '{{founder_name}}', '{{founder_email}}', '{{role}}', '{{founder_stage}}', '{{startup_name}}', '{{progress}}',
];

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [analytics, setAnalytics] = useState<CampaignAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.getCampaignAnalytics()
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statCards = analytics ? [
    { label: 'Total Campaigns', value: analytics.total_campaigns, icon: <Package style={{ width: 20, height: 20 }} />, accent: '#818cf8' },
    { label: 'Total Sent', value: formatNumber(analytics.total_sent), icon: <Send style={{ width: 20, height: 20 }} />, accent: '#34d399' },
    { label: 'Total Delivered', value: formatNumber(analytics.total_delivered), icon: <CheckCircle2 style={{ width: 20, height: 20 }} />, accent: '#34d399' },
    { label: 'Total Failed', value: formatNumber(analytics.total_failed), icon: <AlertCircle style={{ width: 20, height: 20 }} />, accent: '#f87171' },
    { label: 'Total Read', value: formatNumber(analytics.total_read), icon: <Eye style={{ width: 20, height: 20 }} />, accent: '#60a5fa' },
    { label: 'Total Clicked', value: formatNumber(analytics.total_clicked), icon: <MousePointerClick style={{ width: 20, height: 20 }} />, accent: '#fbbf24' },
    { label: 'Avg Delivery Rate', value: `${analytics.avg_delivery_rate}%`, icon: <TrendingUp style={{ width: 20, height: 20 }} />, accent: '#34d399' },
    { label: 'Avg CTR', value: `${analytics.avg_ctr}%`, icon: <MousePointerClick style={{ width: 20, height: 20 }} />, accent: '#a78bfa' },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="v2r-admin-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: '#818cf8' }}>
          <BarChart3 style={{ width: 20, height: 20 }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Campaign Performance Overview</h3>
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
          Aggregate delivery metrics across all marketing campaigns from real database records.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>Loading analytics…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {statCards.map(card => (
            <div key={card.label} className="v2r-admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</span>
                <span style={{ color: card.accent }}>{card.icon}</span>
              </div>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: card.accent, lineHeight: 1 }}>{card.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Campaign Builder Tab ──────────────────────────────────────────────────────

function CampaignBuilderTab({ onCampaignCreated }: { onCampaignCreated: () => void }) {
  const [form, setForm] = useState<CampaignCreatePayload>({
    name: '',
    audience: 'ALL_FOUNDERS',
    channels: ['IN_APP'],
    title: '',
    body: '',
    deep_link: '/founder/dashboard',
    action_label: 'View Details',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewBody, setPreviewBody] = useState('');

  const updateForm = (key: keyof CampaignCreatePayload, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSuccess(''); setError('');
  };

  const injectVariable = (tag: string, field: 'title' | 'body') => {
    if (field === 'title') updateForm('title', form.title + tag);
    else updateForm('body', form.body + tag);
  };

  const updatePreview = () => {
    const sampleVars: Record<string, string> = {
      '{{founder_name}}': 'Jane Doe',
      '{{founder_email}}': 'jane@example.com',
      '{{role}}': 'FOUNDER',
      '{{founder_stage}}': 'MVP_STAGE',
      '{{startup_name}}': 'AcmeCorp',
      '{{progress}}': '65',
    };
    let title = form.title;
    let body = form.body;
    Object.entries(sampleVars).forEach(([k, v]) => {
      title = title.replace(new RegExp(k.replace(/[{}]/g, '\\$&'), 'g'), v);
      body = body.replace(new RegExp(k.replace(/[{}]/g, '\\$&'), 'g'), v);
    });
    setPreviewTitle(title);
    setPreviewBody(body);
  };

  const toggleChannel = (ch: string) => {
    const chs = form.channels || [];
    if (chs.includes(ch)) {
      updateForm('channels', chs.filter(c => c !== ch));
    } else {
      updateForm('channels', [...chs, ch]);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.title.trim() || !form.body.trim()) {
      setError('Name, Title, and Body are required.');
      return;
    }
    setLoading(true); setError(''); setSuccess('');
    try {
      await adminApi.createCampaign(form);
      setSuccess('Campaign draft created successfully!');
      setForm({ name: '', audience: 'ALL_FOUNDERS', channels: ['IN_APP'], title: '', body: '', deep_link: '/founder/dashboard', action_label: 'View Details' });
      onCampaignCreated();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create campaign.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem',
    color: '#fff', fontSize: '0.8125rem', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem', fontWeight: 600 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="v2r-admin-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: '#818cf8' }}>
            <Megaphone style={{ width: 18, height: 18 }} />
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>New Campaign</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>Campaign Name *</label>
              <input style={inputStyle} placeholder="e.g. September Founder Re-engagement" value={form.name} onChange={e => updateForm('name', e.target.value)} />
            </div>

            {/* Audience */}
            <div>
              <label style={labelStyle}>Target Audience *</label>
              <select style={{ ...inputStyle }} value={form.audience} onChange={e => updateForm('audience', e.target.value)}>
                {AUDIENCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            {/* Channels */}
            <div>
              <label style={labelStyle}>Delivery Channels *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['IN_APP', 'BROWSER_PUSH'].map(ch => (
                  <button
                    key={ch}
                    onClick={() => toggleChannel(ch)}
                    style={{
                      padding: '0.4rem 0.875rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      background: (form.channels || []).includes(ch) ? 'rgba(109,93,246,0.25)' : 'rgba(255,255,255,0.04)',
                      border: (form.channels || []).includes(ch) ? '1px solid rgba(109,93,246,0.6)' : '1px solid rgba(255,255,255,0.1)',
                      color: (form.channels || []).includes(ch) ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {ch === 'IN_APP' ? '📩 In-App' : '🔔 Browser Push'}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle}>Notification Title * <span style={{ color: '#818cf8', fontStyle: 'normal' }}>— supports variables</span></label>
              <input style={inputStyle} placeholder="e.g. Hey {{founder_name}}, your sprint is ready!" value={form.title} onChange={e => updateForm('title', e.target.value)} />
              <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {VARIABLE_TAGS.slice(0, 4).map(tag => (
                  <button key={tag} onClick={() => injectVariable(tag, 'title')} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '0.25rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', cursor: 'pointer' }}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div>
              <label style={labelStyle}>Notification Body * <span style={{ color: '#818cf8', fontStyle: 'normal' }}>— supports variables</span></label>
              <textarea
                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Write your notification message here. Use {{founder_name}}, {{startup_name}}, etc."
                value={form.body}
                onChange={e => updateForm('body', e.target.value)}
              />
              <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {VARIABLE_TAGS.map(tag => (
                  <button key={tag} onClick={() => injectVariable(tag, 'body')} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '0.25rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', cursor: 'pointer' }}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Deep Link & CTA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>CTA Deep Link</label>
                <input style={inputStyle} placeholder="/founder/dashboard" value={form.deep_link} onChange={e => updateForm('deep_link', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>CTA Button Label</label>
                <input style={inputStyle} placeholder="View Details" value={form.action_label} onChange={e => updateForm('action_label', e.target.value)} />
              </div>
            </div>
          </div>

          {error && <div style={{ marginTop: '0.875rem', padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: '0.775rem' }}>{error}</div>}
          {success && <div style={{ marginTop: '0.875rem', padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7', fontSize: '0.775rem' }}>{success}</div>}

          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', background: loading ? 'rgba(109,93,246,0.3)' : 'rgba(109,93,246,0.85)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.8125rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating…' : '+ Save as Draft'}
            </button>
            <button onClick={updatePreview} style={{ padding: '0.625rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}>
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div style={{ position: 'sticky', top: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="v2r-admin-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#a78bfa' }}>
            <Eye style={{ width: 15, height: 15 }} />
            <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>Live Preview</h4>
          </div>
          <div style={{ padding: '1rem', borderRadius: '0.625rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: 'rgba(109,93,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell style={{ width: 16, height: 16, color: '#818cf8' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>{previewTitle || form.title || 'Your notification title…'}</p>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{previewBody || form.body || 'Your notification body message will appear here.'}</p>
                <div style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', borderRadius: '0.3rem', background: 'rgba(109,93,246,0.2)', border: '1px solid rgba(109,93,246,0.3)', color: '#a5b4fc', fontSize: '0.65rem', fontWeight: 600 }}>
                  {form.action_label || 'View Details'}
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.3rem' }}>AUDIENCE</div>
            <div style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 600 }}>
              {AUDIENCE_OPTIONS.find(o => o.value === form.audience)?.label || 'All Founders'}
            </div>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.3rem' }}>CHANNELS</div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {(form.channels || []).map(ch => (
                <span key={ch} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '0.25rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>{ch}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="v2r-admin-card">
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Variable Reference</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {VARIABLE_TAGS.map(tag => (
              <div key={tag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <code style={{ fontSize: '0.7rem', color: '#818cf8', background: 'rgba(99,102,241,0.08)', padding: '0.1rem 0.35rem', borderRadius: '0.25rem' }}>{tag}</code>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                  {tag === '{{founder_name}}' ? 'Full name' : tag === '{{founder_email}}' ? 'Email' : tag === '{{role}}' ? 'User role' : tag === '{{founder_stage}}' ? 'Stage' : tag === '{{startup_name}}' ? 'Startup' : 'Progress %'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Campaign History Tab ──────────────────────────────────────────────────────

function CampaignHistoryTab() {
  const [campaigns, setCampaigns] = useState<MarketingCampaignItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<CampaignDeliveryLogItem[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsCampaignId, setLogsCampaignId] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  const PAGE_SIZE = 10;

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listCampaigns({ page, page_size: PAGE_SIZE, search: search || undefined, status: statusFilter || undefined });
      setCampaigns(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const fetchLogs = async (campaignId: string, pageNum = 1) => {
    setLogsLoading(true);
    setLogsCampaignId(campaignId);
    setLogsPage(pageNum);
    try {
      const res = await adminApi.listDeliveryLogs({ campaign_id: campaignId, page: pageNum, page_size: 10 });
      setLogs(res.items);
      setLogsTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSend = async (campaignId: string) => {
    if (!confirm('Send this campaign to all targeted founders now?')) return;
    setActionLoading(campaignId);
    try {
      await adminApi.sendCampaign(campaignId);
      fetchCampaigns();
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to send campaign.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Delete this campaign? This action cannot be undone.')) return;
    setActionLoading(campaignId);
    try {
      await adminApi.deleteCampaign(campaignId);
      fetchCampaigns();
      if (logsCampaignId === campaignId) { setLogs([]); setLogsCampaignId(null); }
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to delete campaign.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filters */}
      <div className="v2r-admin-card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'rgba(255,255,255,0.35)' }} />
          <input
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
            placeholder="Search campaigns…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED', 'FAILED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{total} campaigns</span>
      </div>

      {/* Table */}
      <div className="v2r-admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading…</div>
        ) : campaigns.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Megaphone style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.15)', margin: '0 auto 0.75rem auto', display: 'block' }} />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8125rem' }}>No campaigns found. Create one in the Campaign Builder tab.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Campaign', 'Audience', 'Status', 'Sent', 'Delivered', 'Read', 'CTR', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '0.75rem 0.875rem', maxWidth: '200px' }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                  </td>
                  <td style={{ padding: '0.75rem 0.875rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {AUDIENCE_OPTIONS.find(o => o.value === c.audience)?.label || c.audience}
                  </td>
                  <td style={{ padding: '0.75rem 0.875rem' }}><CampaignStatusBadge status={c.status} /></td>
                  <td style={{ padding: '0.75rem 0.875rem', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>{c.stats_sent}</td>
                  <td style={{ padding: '0.75rem 0.875rem', color: '#34d399', textAlign: 'right' }}>{c.stats_delivered}</td>
                  <td style={{ padding: '0.75rem 0.875rem', color: '#60a5fa', textAlign: 'right' }}>{c.stats_read}</td>
                  <td style={{ padding: '0.75rem 0.875rem', color: '#fbbf24', textAlign: 'right' }}>
                    {c.stats_delivered > 0 ? `${((c.stats_clicked / c.stats_delivered) * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 0.875rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{formatDate(c.created_at)}</td>
                  <td style={{ padding: '0.75rem 0.875rem' }}>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        onClick={() => fetchLogs(c.id)}
                        title="View delivery logs"
                        style={{ padding: '0.25rem', borderRadius: '0.375rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', cursor: 'pointer' }}
                      >
                        <Eye style={{ width: 13, height: 13 }} />
                      </button>
                      {c.status === 'DRAFT' && (
                        <button
                          onClick={() => handleSend(c.id)}
                          disabled={actionLoading === c.id}
                          title="Send campaign now"
                          style={{ padding: '0.25rem', borderRadius: '0.375rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', cursor: 'pointer' }}
                        >
                          <PlayCircle style={{ width: 13, height: 13 }} />
                        </button>
                      )}
                      {['DRAFT', 'CANCELLED', 'FAILED'].includes(c.status) && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={actionLoading === c.id}
                          title="Delete campaign"
                          style={{ padding: '0.25rem', borderRadius: '0.375rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer' }}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.3rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === 1 ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}>
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.3rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === totalPages ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delivery Logs Panel */}
      {logsCampaignId && (
        <div className="v2r-admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8' }}>
              <History style={{ width: 15, height: 15 }} />
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>Delivery Logs <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, fontSize: '0.75rem' }}>({logsTotal} records)</span></h4>
            </div>
            <button onClick={() => { setLogsCampaignId(null); setLogs([]); }} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.7rem' }}>Close</button>
          </div>

          {logsLoading ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '1rem' }}>Loading logs…</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', padding: '1rem' }}>No delivery logs yet for this campaign.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Founder', 'Channel', 'Status', 'Delivered At', 'Read At'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>{log.founder_name || log.founder_id.slice(0, 8) + '…'}</p>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{log.founder_email}</p>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'rgba(255,255,255,0.6)' }}>{log.channel}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}><DeliveryLogStatusBadge status={log.status} /></td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{log.delivered_at ? formatDateTime(log.delivered_at) : '—'}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{log.read_at ? formatDateTime(log.read_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {logsTotal > 10 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Page {logsPage} of {Math.ceil(logsTotal / 10)}</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => fetchLogs(logsCampaignId, Math.max(1, logsPage - 1))} disabled={logsPage === 1} style={{ padding: '0.2rem 0.5rem', borderRadius: '0.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: logsPage === 1 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: logsPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.7rem' }}>Prev</button>
                    <button onClick={() => fetchLogs(logsCampaignId, logsPage + 1)} disabled={logsPage >= Math.ceil(logsTotal / 10)} style={{ padding: '0.2rem 0.5rem', borderRadius: '0.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: logsPage >= Math.ceil(logsTotal / 10) ? 'rgba(255,255,255,0.2)' : '#fff', cursor: logsPage >= Math.ceil(logsTotal / 10) ? 'not-allowed' : 'pointer', fontSize: '0.7rem' }}>Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Templates Tab ─────────────────────────────────────────────────────────────

function TemplatesTab() {
  const [templates, setTemplates] = useState<NotificationTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'MARKETING', subject: '', body: '', variables: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      setTemplates(await adminApi.listNotificationTemplates());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.subject || !form.body) { setFormError('Name, Subject and Body are required.'); return; }
    setFormLoading(true); setFormError('');
    try {
      await adminApi.createNotificationTemplate({
        name: form.name,
        category: form.category,
        subject: form.subject,
        body: form.body,
        variables: form.variables.split(',').map(v => v.trim()).filter(Boolean),
      });
      setShowForm(false);
      setForm({ name: '', category: 'MARKETING', subject: '', body: '', variables: '' });
      fetchTemplates();
    } catch (e: any) {
      setFormError(e?.response?.data?.detail || 'Failed to create template.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await adminApi.deleteNotificationTemplate(id);
    fetchTemplates();
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.55rem 0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.3rem', fontWeight: 600 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="v2r-admin-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8' }}>
          <FileText style={{ width: 18, height: 18 }} />
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>Notification Templates</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.45rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(109,93,246,0.2)', border: '1px solid rgba(109,93,246,0.4)', color: '#a5b4fc', fontWeight: 600, fontSize: '0.775rem', cursor: 'pointer' }}
        >
          <Plus style={{ width: 14, height: 14 }} /> New Template
        </button>
      </div>

      {showForm && (
        <div className="v2r-admin-card">
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>Create Template</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div><label style={labelStyle}>Name *</label><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Welcome Email" /></div>
            <div>
              <label style={labelStyle}>Category</label>
              <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {['MARKETING', 'VALIDATION', 'REALITY_SPRINT', 'BUILD_REQUEST', 'SYSTEM'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}><label style={labelStyle}>Subject *</label><input style={inputStyle} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Welcome to Vision2Real, {{founder_name}}!" /></div>
          <div style={{ marginBottom: '0.75rem' }}><label style={labelStyle}>Body *</label><textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Your message body with {{variables}}" /></div>
          <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>Variables (comma-separated)</label><input style={inputStyle} value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))} placeholder="founder_name, startup_name" /></div>
          {formError && <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: '0.75rem' }}>{formError}</div>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleCreate} disabled={formLoading} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'rgba(109,93,246,0.8)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.775rem', cursor: 'pointer' }}>{formLoading ? 'Creating…' : 'Create'}</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.775rem', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '2rem' }}>Loading templates…</div>
        ) : templates.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: '2rem', fontSize: '0.8rem' }}>No templates yet. Create one above.</div>
        ) : templates.map(t => (
          <div key={t.id} className="v2r-admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>{t.name}</p>
                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: 'rgba(109,93,246,0.12)', color: '#a5b4fc' }}>{t.category}</span>
              </div>
              <button onClick={() => handleDelete(t.id)} style={{ padding: '0.25rem', borderRadius: '0.375rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer' }}>
                <Trash2 style={{ width: 12, height: 12 }} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{t.subject}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.body}</p>
            {t.variables.length > 0 && (
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {t.variables.map(v => <span key={v} style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: '0.2rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{`{{${v}}}`}</span>)}
              </div>
            )}
            <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>Created {formatDate(t.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Push Subscribers Tab ──────────────────────────────────────────────────────

function PushSubscribersTab() {
  const [subs, setSubs] = useState<PushSubscriberItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 20;

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listPushSubscribers({ page, page_size: PAGE_SIZE, search: search || undefined });
      setSubs(res.items); setTotal(res.total); setTotalPages(res.total_pages);
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="v2r-admin-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8' }}>
          <Wifi style={{ width: 18, height: 18 }} />
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>Web Push Subscribers</h3>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{total} total</span>
        </div>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'rgba(255,255,255,0.35)' }} />
          <input
            style={{ padding: '0.45rem 0.75rem 0.45rem 1.875rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff', fontSize: '0.775rem', outline: 'none', width: '240px' }}
            placeholder="Search subscribers…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="v2r-admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading…</div>
        ) : subs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Wifi style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.15)', margin: '0 auto 0.75rem auto', display: 'block' }} />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8125rem' }}>No push subscribers found.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Founder', 'User Agent', 'Subscribed', 'Last Used'].map(h => (
                  <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.625rem 1rem' }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>{s.founder_name || '—'}</p>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{s.founder_email}</p>
                  </td>
                  <td style={{ padding: '0.625rem 1rem', color: 'rgba(255,255,255,0.5)', maxWidth: '280px' }}>
                    <span style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{s.user_agent || '—'}</span>
                  </td>
                  <td style={{ padding: '0.625rem 1rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{formatDate(s.created_at)}</td>
                  <td style={{ padding: '0.625rem 1rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{s.last_used_at ? formatDate(s.last_used_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.3rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === 1 ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}><ChevronLeft style={{ width: 14, height: 14 }} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.3rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === totalPages ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}><ChevronRight style={{ width: 14, height: 14 }} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Founder Preferences Tab ───────────────────────────────────────────────────

function FounderPreferencesTab() {
  const [prefs, setPrefs] = useState<FounderPreferenceAdminItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 20;

  const fetchPrefs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listFounderPreferences({ page, page_size: PAGE_SIZE, search: search || undefined });
      setPrefs(res.items); setTotal(res.total); setTotalPages(res.total_pages);
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const BoolBadge = ({ val, label }: { val: boolean; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: val ? '#34d399' : '#6b7280' }} />
      <span style={{ fontSize: '0.65rem', color: val ? '#34d399' : 'rgba(255,255,255,0.35)' }}>{label}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="v2r-admin-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8', marginBottom: '0.25rem' }}>
            <Settings2 style={{ width: 18, height: 18 }} />
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>Founder Notification Preferences</h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Read-only view of founder preferences and quiet hours. {total} founders.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'rgba(255,255,255,0.35)' }} />
          <input
            style={{ padding: '0.45rem 0.75rem 0.45rem 1.875rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff', fontSize: '0.775rem', outline: 'none', width: '220px' }}
            placeholder="Search founders…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '2rem' }}>Loading…</div>
        ) : prefs.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: '2rem', fontSize: '0.8rem' }}>No founder preferences found.</div>
        ) : prefs.map(pref => (
          <div key={pref.founder_id} className="v2r-admin-card" style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: '0.8125rem' }}>{pref.founder_name || '—'}</p>
              <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{pref.founder_email}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <BoolBadge val={pref.browser_push_enabled} label="Browser Push" />
              <BoolBadge val={pref.email_enabled} label="Email" />
              <BoolBadge val={pref.marketing_notifications} label="Marketing" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <BoolBadge val={pref.validation_notifications} label="Validation" />
              <BoolBadge val={pref.sprint_notifications} label="Sprint" />
              <BoolBadge val={pref.build_notifications} label="Build" />
            </div>
            <div>
              {pref.quiet_hours_enabled ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: '#fbbf24' }}>
                  <Clock style={{ width: 11, height: 11 }} />
                  Quiet {pref.quiet_hours_start}–{pref.quiet_hours_end}
                </div>
              ) : (
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>No quiet hours</span>
              )}
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>{pref.notification_frequency}</p>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.3rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === 1 ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}><ChevronLeft style={{ width: 14, height: 14 }} /></button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.3rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === totalPages ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}><ChevronRight style={{ width: 14, height: 14 }} /></button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminNotificationCenterPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [historyKey, setHistoryKey] = useState(0); // force re-render when campaign created

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="v2r-admin-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.5rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '0.625rem', background: 'rgba(109,93,246,0.2)', border: '1px solid rgba(109,93,246,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell style={{ width: 20, height: 20, color: '#818cf8' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>Notification & Campaign Center</h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '0.3rem', background: 'rgba(109,93,246,0.15)', border: '1px solid rgba(109,93,246,0.3)', color: '#a5b4fc', fontWeight: 700 }}>
                <Sparkles style={{ width: 9, height: 9 }} /> Stage 7.5
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.775rem', color: 'rgba(255,255,255,0.5)' }}>
              Central communication control plane — build, target, schedule, and deliver campaigns to founders.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.25rem', padding: '0.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.625rem', border: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.45rem 0.875rem', borderRadius: '0.5rem',
              background: activeTab === tab.id ? 'rgba(109,93,246,0.25)' : 'transparent',
              border: activeTab === tab.id ? '1px solid rgba(109,93,246,0.45)' : '1px solid transparent',
              color: activeTab === tab.id ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.775rem', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'builder' && (
        <CampaignBuilderTab onCampaignCreated={() => setHistoryKey(k => k + 1)} />
      )}
      {activeTab === 'history' && <CampaignHistoryTab key={historyKey} />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'subscribers' && <PushSubscribersTab />}
      {activeTab === 'preferences' && <FounderPreferencesTab />}
    </div>
  );
}
