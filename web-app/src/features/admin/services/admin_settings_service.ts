import { apiClient as api } from '../../../services/api/client';

export interface AdminUserItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  auth_provider: string;
  last_login_at: string | null;
  created_at: string;
}

export interface AdminUserListResponse {
  items: AdminUserItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminUserCreatePayload {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  role: string;
  is_active: boolean;
}

export interface AdminUserUpdatePayload {
  full_name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
}

export interface AdminPasswordResetPayload {
  password: string;
  confirm_password: string;
}

export interface OrganizationSettings {
  id: string;
  company_name: string;
  platform_name: string;
  support_email: string | null;
  support_phone: string | null;
  website: string | null;
  address: string | null;
  timezone: string;
  social_links: Record<string, string>;
  branding: Record<string, string>;
  updated_at: string;
}

export interface OrganizationUpdatePayload {
  company_name?: string;
  platform_name?: string;
  support_email?: string;
  support_phone?: string;
  website?: string;
  address?: string;
  timezone?: string;
  social_links?: Record<string, string>;
  branding?: Record<string, string>;
}

export interface SecuritySettings {
  jwt_lifetime_minutes: number;
  refresh_token_lifetime_days: number;
  password_policy: {
    minimum_length: number;
    require_uppercase: boolean;
    require_numbers: boolean;
    require_symbols: boolean;
  };
  maximum_login_attempts: number | null;
  account_lock_duration_minutes: number | null;
  session_timeout_minutes: number;
  editable: boolean;
}

export interface AuthProviderStatus {
  name: string;
  enabled: boolean;
  configuration_status: string;
}

export interface AuthSettings {
  providers: AuthProviderStatus[];
}

export interface PushSettings {
  vapid_public_key: string;
  vapid_private_key_configured: boolean;
  subject: string;
  push_service_status: string;
  subscribers_count: number;
  campaign_count: number;
  delivery_success_rate: number;
}

export interface InfrastructureSettings {
  queued_notifications: number;
  scheduled_campaigns: number;
  failed_deliveries: number;
  retry_queue: number;
  notification_templates: number;
  delivery_workers: string;
}

export interface PlatformSettingsInfo {
  backend_version: string;
  frontend_version: string;
  environment: string;
  database: string;
  migration_version: string;
  api_version: string;
  build_number: string;
  deployment_date: string;
  git_commit: string;
  python_version: string;
  node_version: string;
  storage: {
    database_size?: string;
    uploads_size_bytes?: number;
    documents_size_bytes?: number;
    pdf_storage_size_bytes?: number;
    images_size_bytes?: number;
    logs_size_bytes?: number;
  };
}

export interface AdminAuditLogItem {
  id: string;
  admin_id: string | null;
  admin_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  ip_address: string | null;
  result: string;
  created_at: string;
}

export interface AdminAuditLogListResponse {
  items: AdminAuditLogItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SettingsSummary {
  organization: OrganizationSettings;
  auth: AuthSettings;
  security: SecuritySettings;
  push: PushSettings;
  infrastructure: InfrastructureSettings;
  platform: PlatformSettingsInfo;
}

export const adminSettingsApi = {
  getSummary: async (): Promise<SettingsSummary> => {
    const res = await api.get('/admin/settings/summary');
    return res.data;
  },

  listAdminUsers: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    role?: string;
    status?: string;
    provider?: string;
  }): Promise<AdminUserListResponse> => {
    const res = await api.get('/admin/settings/admin-users', { params });
    return res.data;
  },

  createAdminUser: async (data: AdminUserCreatePayload): Promise<AdminUserItem> => {
    const res = await api.post('/admin/settings/admin-users', data);
    return res.data;
  },

  updateAdminUser: async (user_id: string, data: AdminUserUpdatePayload): Promise<AdminUserItem> => {
    const res = await api.patch(`/admin/settings/admin-users/${user_id}`, data);
    return res.data;
  },

  resetAdminPassword: async (user_id: string, data: AdminPasswordResetPayload): Promise<{ status: string }> => {
    const res = await api.patch(`/admin/settings/admin-users/${user_id}/password`, data);
    return res.data;
  },

  updateAdminStatus: async (user_id: string, is_active: boolean): Promise<AdminUserItem> => {
    const res = await api.patch(`/admin/settings/admin-users/${user_id}/status`, { is_active });
    return res.data;
  },

  getOrganization: async (): Promise<OrganizationSettings> => {
    const res = await api.get('/admin/settings/organization');
    return res.data;
  },

  updateOrganization: async (data: OrganizationUpdatePayload): Promise<OrganizationSettings> => {
    const res = await api.patch('/admin/settings/organization', data);
    return res.data;
  },

  getSecurity: async (): Promise<SecuritySettings> => {
    const res = await api.get('/admin/settings/security');
    return res.data;
  },

  getAuth: async (): Promise<AuthSettings> => {
    const res = await api.get('/admin/settings/auth');
    return res.data;
  },

  getPush: async (): Promise<PushSettings> => {
    const res = await api.get('/admin/settings/push');
    return res.data;
  },

  regeneratePushKeys: async (): Promise<PushSettings> => {
    const res = await api.post('/admin/settings/push/regenerate-keys');
    return res.data;
  },

  getInfrastructure: async (): Promise<InfrastructureSettings> => {
    const res = await api.get('/admin/settings/infrastructure');
    return res.data;
  },

  getPlatform: async (): Promise<PlatformSettingsInfo> => {
    const res = await api.get('/admin/settings/platform');
    return res.data;
  },

  listAuditLogs: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    action?: string;
    result?: string;
  }): Promise<AdminAuditLogListResponse> => {
    const res = await api.get('/admin/settings/audit-logs', { params });
    return res.data;
  },
};
