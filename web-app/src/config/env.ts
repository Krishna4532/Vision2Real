/**
 * Vision2Real – Environment Configuration
 * All environment variables are read from Vite's import.meta.env.
 * Requires VITE_BACKEND_URL to be defined in .env or deployment environment.
 */

interface AppConfig {
  readonly apiUrl: string;
  readonly appName: string;
  readonly appEnv: 'development' | 'staging' | 'production';
  readonly enableAnalytics: boolean;
}

function getRequiredEnvVar(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (value !== undefined && value.trim() !== '') return value.trim();
  throw new Error(`[Vision2Real] Configuration Error: Missing required environment variable '${key}'. Please define '${key}' in your environment or .env file.`);
}

function getOptionalEnvVar(key: string, fallback: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (value !== undefined && value.trim() !== '') return value.trim();
  return fallback;
}

export const env: AppConfig = {
  apiUrl: getRequiredEnvVar('VITE_BACKEND_URL'),
  appName: getOptionalEnvVar('VITE_APP_NAME', 'Vision2Real'),
  appEnv: getOptionalEnvVar('VITE_APP_ENV', 'development') as AppConfig['appEnv'],
  enableAnalytics: getOptionalEnvVar('VITE_ENABLE_ANALYTICS', 'false') === 'true',
} as const;
