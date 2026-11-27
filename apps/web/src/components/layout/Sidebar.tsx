import { NavLink } from "react-router-dom";
import {
  Building2,
  Images,
  LayoutDashboard,
  ListChecks,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils/cn";

interface NavItem {
  label: string;
  to?: string;
  icon: LucideIcon;
  disabled?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { label: "Properties", icon: Building2, disabled: true },
      { label: "Buildings", icon: Building2, disabled: true },
      { label: "Units", icon: Building2, disabled: true },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Amenities", to: "/inventory/amenities", icon: ListChecks },
      { label: "Policies", to: "/inventory/policies", icon: ListChecks },
    ],
  },
  {
    label: "Media",
    items: [{ label: "Photos", icon: Images, disabled: true }],
  },
];

export interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface transition-transform",
          "lg:sticky lg:inset-y-auto lg:top-20 lg:h-fit lg:max-h-[calc(100vh-6rem)] lg:self-start lg:translate-x-0 lg:rounded-md",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <span className="text-base font-semibold text-text">
            Property Insiders
          </span>
          <button
            type="button"
            className="rounded-md p-1 text-muted hover:bg-slate-100 lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                if (item.disabled || !item.to) {
                  return (
                    <span
                      key={item.label}
                      className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-2 text-sm text-muted/70"
                      title="Not yet available"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                      <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-medium text-muted">
                        Soon
                      </span>
                    </span>
                  );
                }
                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-md px-2 py-2 text-sm",
                        isActive
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-text hover:bg-slate-100",
                      )
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}