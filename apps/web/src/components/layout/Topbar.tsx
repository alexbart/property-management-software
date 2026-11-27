import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { Breadcrumbs } from "./Breadcrumbs";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export interface TopbarProps {
  breadcrumbs: Array<{ label: string; to?: string }>;
  onOpenMobile: () => void;
  actions?: ReactNode;
}

export function Topbar({ breadcrumbs, onOpenMobile, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex w-full items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
      <button
        type="button"
        className="rounded-md p-1 text-muted hover:bg-slate-100 lg:hidden"
        onClick={onOpenMobile}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden flex-1 md:block">
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <div className="flex flex-1 justify-end md:flex-none md:justify-start">
        <SearchBar />
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}