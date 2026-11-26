import { Link, Route, Routes } from "react-router-dom";
import ReconciliationDashboard from "./pages/ReconciliationDashboard";
import MaintenanceVerification from "./pages/landlord/MaintenanceVerification";
import TenantRiskRegister from "./pages/landlord/TenantRiskRegister";
import CreateTicketForm from "./pages/tenant/CreateTicketForm";
import MaintenanceList from "./pages/tenant/MaintenanceList";
import SubmitNoticeForm from "./pages/tenant/SubmitNoticeForm";
import TenantDashboard from "./pages/tenant/TenantDashboard";
import MaintenanceReports from "./pages/MaintenanceReports";
import NotificationPreferences from "./pages/NotificationPreferences";
import { NotificationBell } from "./components/NotificationBell";

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <span className="text-lg font-semibold">
              Property Management Platform
            </span>
            <nav className="flex items-center gap-4 text-sm">
              <Link className="text-slate-600 hover:text-slate-900" to="/">
                Home
              </Link>
              <Link
                className="text-slate-600 hover:text-slate-900"
                to="/dashboard"
              >
                Dashboard
              </Link>
              <Link
                className="text-slate-600 hover:text-slate-900"
                to="/settings/notifications"
              >
                Settings
              </Link>
              <NotificationBell />
            </nav>
          </div>
        </header>

        <Routes>
          <Route
            path="/"
            element={
              <main className="mx-auto max-w-6xl px-4 py-10">
                <h1 className="text-2xl font-bold sm:text-3xl">Welcome</h1>
                <p className="mt-3 max-w-2xl text-slate-600">
                  Foundation for property management, landlord transparency, rent
                  collection, and maintenance operations.
                </p>
              </main>
            }
          />
          <Route path="/dashboard" element={<ReconciliationDashboard />} />
          <Route
            path="/landlord/risk-register"
            element={<TenantRiskRegister />}
          />
          <Route
            path="/landlord/maintenance-verification"
            element={<MaintenanceVerification />}
          />
          <Route path="/tenant/dashboard" element={<TenantDashboard />} />
          <Route path="/tenant/maintenance" element={<MaintenanceList />} />
          <Route
            path="/tenant/maintenance/new"
            element={<CreateTicketForm />}
          />
          <Route path="/tenant/notice" element={<SubmitNoticeForm />} />
          <Route path="/maintenance/reports" element={<MaintenanceReports />} />
          <Route
            path="/settings/notifications"
            element={<NotificationPreferences />}
          />
        </Routes>
    </div>
  );
}

export default App;