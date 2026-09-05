import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { FounderLayout } from '../layouts/FounderLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { HomePage } from '../pages/HomePage';

import { ValidationPage } from '../features/validation/pages/ValidationPage';
import { BuildProductPage } from '../features/build-product/BuildProductPage';
import { AboutPage } from '../features/about/AboutPage';

import { LoginPage } from '../features/auth/pages/LoginPage';
import { SignupPage } from '../features/auth/pages/SignupPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';

import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { PlaceholderPage } from '../features/founder/components/PlaceholderPage';
import { DashboardPage } from '../features/founder/pages/DashboardPage';
import { ValidationReportsPage } from '../features/founder/pages/ValidationReportsPage';
import { ValidationReportViewPage } from '../features/founder/pages/ValidationReportViewPage';
import { RealitySprintPage } from '../features/founder/pages/RealitySprintPage';
import { RealitySprintDetailPage } from '../features/founder/pages/RealitySprintDetailPage';
import { BuildRequestsPage } from '../features/founder/pages/BuildRequestsPage';
import { BuildRequestDetailPage } from '../features/founder/pages/BuildRequestDetailPage';
import { NotificationsPage } from '../features/founder/pages/NotificationsPage';
import { SettingsPage } from '../features/founder/pages/SettingsPage';

import { AdminLoginPage } from '../features/admin/pages/AdminLoginPage';
import { AdminProtectedRoute } from '../features/admin/components/AdminProtectedRoute';
import { AdminDashboardPage } from '../features/admin/pages/AdminDashboardPage';
import { AdminFoundersPage } from '../features/admin/pages/AdminFoundersPage';
import { AdminFounderDetailPage } from '../features/admin/pages/AdminFounderDetailPage';
import { AdminValidationsPage } from '../features/admin/pages/AdminValidationsPage';
import { AdminValidationDetailPage } from '../features/admin/pages/AdminValidationDetailPage';
import { AdminRealitySprintsPage } from '../features/admin/pages/AdminRealitySprintsPage';
import { AdminRealitySprintDetailPage } from '../features/admin/pages/AdminRealitySprintDetailPage';
import { AdminBuildRequestsPage } from '../features/admin/pages/AdminBuildRequestsPage';
import { AdminBuildRequestDetailPage } from '../features/admin/pages/AdminBuildRequestDetailPage';
import { AdminNotificationCenterPage } from '../features/admin/pages/AdminNotificationCenterPage';
import { AdminSettingsPage } from '../features/admin/pages/AdminSettingsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'validate', element: <ValidationPage /> },
      { path: 'validate-idea', element: <Navigate to="/validate" replace /> },
      { path: 'build-product', element: <BuildProductPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },

      // Standalone protected shortcuts redirected to Founder Workspace
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <Navigate to="/founder/settings" replace />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute>
            <Navigate to="/founder/validations" replace />
          </ProtectedRoute>
        ),
      },

      { path: '*', element: <PlaceholderPage title="404 Not Found" description="The page you are looking for does not exist or has been moved." icon="dashboard" /> },
    ],
  },
  {
    path: '/founder',
    element: (
      <ProtectedRoute>
        <FounderLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'validations',
        element: <ValidationReportsPage />,
      },
      {
        path: 'validations/:validationId',
        element: <ValidationReportViewPage />,
      },
      {
        path: 'reality-sprints',
        element: <RealitySprintPage />,
      },
      {
        path: 'reality-sprints/:id',
        element: <RealitySprintDetailPage />,
      },
      {
        path: 'sprint',
        element: <RealitySprintPage />,
      },
      {
        path: 'sprint/:id',
        element: <RealitySprintDetailPage />,
      },
      {
        path: 'build-requests',
        element: <BuildRequestsPage />,
      },
      {
        path: 'build-requests/:id',
        element: <BuildRequestDetailPage />,
      },
      {
        path: 'requests',
        element: <BuildRequestsPage />,
      },
      {
        path: 'requests/:id',
        element: <BuildRequestDetailPage />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '/admin/login',
    element: <Navigate to="/admin" replace />,
  },
  {
    path: '/admin',
    children: [
      {
        index: true,
        element: <AdminLoginPage />,
      },
      {
        element: (
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        ),
        children: [
          { path: 'dashboard', element: <AdminDashboardPage /> },
          { path: 'founders', element: <AdminFoundersPage /> },
          { path: 'founders/:founderId', element: <AdminFounderDetailPage /> },
          { path: 'validations', element: <AdminValidationsPage /> },
          { path: 'validations/:validationId', element: <AdminValidationDetailPage /> },
          { path: 'reality-sprints', element: <AdminRealitySprintsPage /> },
          { path: 'reality-sprints/:sprintId', element: <AdminRealitySprintDetailPage /> },
          { path: 'build-requests', element: <AdminBuildRequestsPage /> },
          { path: 'build-requests/:id', element: <AdminBuildRequestDetailPage /> },
          { path: 'notifications', element: <AdminNotificationCenterPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
