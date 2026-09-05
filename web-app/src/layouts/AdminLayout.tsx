import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '@/features/admin/components/AdminSidebar';
import { AdminHeader } from '@/features/admin/components/AdminHeader';
import { AlertTriangle } from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AdminErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Admin HQ Layout Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="v2r-admin-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', margin: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444', marginBottom: '0.75rem' }}>
            <AlertTriangle style={{ width: '24px', height: '24px' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Admin Module Error</h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '1rem' }}>
            An unforeseen exception occurred while rendering this Admin HQ view.
          </p>
          <pre style={{ padding: '0.75rem', background: '#050505', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', overflowX: 'auto' }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="v2r-admin-btn-primary"
            style={{ marginTop: '1rem', width: 'auto' }}
          >
            Retry Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AdminLayout() {
  return (
    <div className="v2r-admin-shell">
      {/* Isolated Admin Sidebar */}
      <AdminSidebar />

      {/* Main Admin Control Plane Workspace */}
      <div className="v2r-admin-main">
        <AdminHeader />
        <main className="v2r-admin-content">
          <AdminErrorBoundary>
            <Outlet />
          </AdminErrorBoundary>
        </main>
      </div>
    </div>
  );
}
