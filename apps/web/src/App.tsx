import { Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./lib/auth";
import ReconciliationDashboard from "./pages/ReconciliationDashboard";
import AmenitiesPage from "./pages/inventory/AmenitiesPage";
import PoliciesPage from "./pages/inventory/PoliciesPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CreateTicketForm from "./pages/tenant/CreateTicketForm";
import MaintenanceList from "./pages/tenant/MaintenanceList";
import SubmitNoticeForm from "./pages/tenant/SubmitNoticeForm";
import TenantDashboard from "./pages/tenant/TenantDashboard";
import MaintenanceReports from "./pages/MaintenanceReports";
import NotificationPreferences from "./pages/NotificationPreferences";
import { NotificationBell } from "./components/NotificationBell";
import { AppShell } from "./components/layout/AppShell";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell actions={<NotificationBell />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <div className="space-y-4">
                      <h1 className="text-2xl font-bold text-text sm:text-3xl">
                        Welcome
                      </h1>
                      <p className="max-w-2xl text-muted">
                        Foundation for property management, landlord
                        transparency, rent collection, and maintenance
                        operations.
                      </p>
                    </div>
                  }
                />
                <Route path="/dashboard" element={<ReconciliationDashboard />} />
                <Route path="/inventory/amenities" element={<AmenitiesPage />} />
                <Route path="/inventory/policies" element={<PoliciesPage />} />
                <Route path="/tenant/dashboard" element={<TenantDashboard />} />
                <Route path="/tenant/maintenance" element={<MaintenanceList />} />
                <Route
                  path="/tenant/maintenance/new"
                  element={<CreateTicketForm />}
                />
                <Route path="/tenant/notice" element={<SubmitNoticeForm />} />
                <Route
                  path="/maintenance/reports"
                  element={<MaintenanceReports />}
                />
                <Route
                  path="/settings/notifications"
                  element={<NotificationPreferences />}
                />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;