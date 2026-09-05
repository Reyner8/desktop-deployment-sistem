import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { Layout } from '@/components/layout/Layout';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DevicesPage } from '@/features/devices/DevicesPage';
import { DeviceDetailPage } from '@/features/devices/DeviceDetailPage';
import { ReleasesPage } from '@/features/releases/ReleasesPage';
import { ReleaseDetailPage } from '@/features/releases/ReleaseDetailPage';
import { NewReleasePage } from '@/features/releases/NewReleasePage';
import { DeploymentsPage } from '@/features/deployments/DeploymentsPage';
import { DeploymentDetailPage } from '@/features/deployments/DeploymentDetailPage';
import { NewDeploymentPage } from '@/features/deployments/NewDeploymentPage';
import { AuditPage } from '@/features/audit/AuditPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="devices/:id" element={<DeviceDetailPage />} />
        <Route path="releases" element={<ReleasesPage />} />
        <Route path="releases/new" element={<NewReleasePage />} />
        <Route path="releases/:id" element={<ReleaseDetailPage />} />
        <Route path="deployments" element={<DeploymentsPage />} />
        <Route path="deployments/new" element={<NewDeploymentPage />} />
        <Route path="deployments/:id" element={<DeploymentDetailPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}