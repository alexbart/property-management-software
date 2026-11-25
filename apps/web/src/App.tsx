import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth, useAuth } from "./lib/auth";
import ReconciliationDashboard from "./pages/ReconciliationDashboard";
import CreateTicketForm from "./pages/tenant/CreateTicketForm";
import LoginPage from "./pages/LoginPage";
import MaintenanceList from "./pages/tenant/MaintenanceList";
import SubmitNoticeForm from "./pages/tenant/SubmitNoticeForm";
import TenantDashboard from "./pages/tenant/TenantDashboard";

function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="text-lg font-semibold">
          Property Management Platform
        </span>
        <nav className="flex items-center gap-4 text-sm">
          <Link className="text-slate-600 hover:text-slate-900" to="/">
            Home
          </Link>
          <Link className="text-slate-600 hover:text-slate-900" to="/dashboard">
            Dashboard
          </Link>
          {user && (
            <>
              <span className="text-slate-500">
                {user.email} ({user.role})
              </span>
              <button
                onClick={async () => {
                  await logout();
                  window.location.href = "/login";
                }}
                className="text-slate-600 hover:text-slate-900"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <ReconciliationDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/tenant/dashboard"
        element={
          <PrivateRoute>
            <TenantDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/tenant/maintenance"
        element={
          <PrivateRoute>
            <MaintenanceList />
          </PrivateRoute>
        }
      />
      <Route
        path="/tenant/maintenance/new"
        element={
          <PrivateRoute>
            <CreateTicketForm />
          </PrivateRoute>
        }
      />
      <Route
        path="/tenant/notice"
        element={
          <PrivateRoute>
            <SubmitNoticeForm />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
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