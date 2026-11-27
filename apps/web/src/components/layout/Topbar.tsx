import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { Breadcrumbs } from "./Breadcrumbs";

export interface TopbarProps {
  breadcrumbs: Array<{ label: string; to?: string }>;
  onOpenMobile: () => void;
  actions?: ReactNode;
}

export function Topbar({ breadcrumbs, onOpenMobile, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface px-4">
      <button
        type="button"
        className="rounded-md p-1 text-muted hover:bg-slate-100 lg:hidden"
        onClick={onOpenMobile}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <Breadcrumbs items={breadcrumbs} />
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}