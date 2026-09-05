import { Bell, Clock } from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';

export function AdminNotificationsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="v2r-admin-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#818cf8', marginBottom: '0.5rem' }}>
          <Bell style={{ width: '20px', height: '20px' }} />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Broadcast & System Notifications</h2>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0, maxWidth: '600px' }}>
          Super Admin module for broadcasting announcements to founders, system alerts, and notification template management.
        </p>
      </div>

      <div className="v2r-admin-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', background: 'rgba(109, 93, 246, 0.15)', border: '1px solid rgba(109, 93, 246, 0.3)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
          <Clock style={{ width: '24px', height: '24px' }} />
        </div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>Scheduled for Stage 7.6</h3>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Broadcast announcements, targeted founder alerts, and notification history analytics will be implemented in Stage 7.6.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', background: '#050505', padding: '0.375rem 0.875rem', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span>Module Namespace:</span>
          <code style={{ color: '#818cf8', fontFamily: 'var(--font-mono)' }}>/admin/notifications</code>
        </div>
      </div>
    </div>
  );
}
