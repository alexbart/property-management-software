import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const ROUTE_LABELS: Record<string, string> = {
  "/": "Home",
  "/dashboard": "Dashboard",
  "/maintenance/reports": "Maintenance Reports",
  "/settings/notifications": "Notification Settings",
  "/tenant/dashboard": "My Tenancy",
  "/tenant/maintenance": "Maintenance",
  "/tenant/maintenance/new": "New Repair Request",
  "/tenant/notice": "Vacation Notice",
};

function crumbsForPath(pathname: string): Array<{ label: string; to?: string }> {
  const label = ROUTE_LABELS[pathname] ?? "Property Insider";
  if (pathname === "/") return [{ label }];
  return [{ label: "Home", to: "/" }, { label }];
}

export interface AppShellProps {
  children: ReactNode;
  actions?: ReactNode;
}

export function AppShell({ children, actions }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen bg-background text-text">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          breadcrumbs={crumbsForPath(pathname)}
          onOpenMobile={() => setMobileOpen(true)}
          actions={actions}
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}