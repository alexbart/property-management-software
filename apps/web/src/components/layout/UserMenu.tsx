import { useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { Dropdown } from "../ui/Dropdown";

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <Dropdown
      trigger={
        <button
          type="button"
          className="flex items-center justify-center rounded-full border border-border bg-surface p-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
          aria-label="Account menu"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-muted dark:bg-slate-600 dark:text-slate-200">
            <UserIcon className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      }
    >
      <div className="border-b border-border px-3 py-2">
        <p className="truncate text-sm font-medium text-text">{user.email}</p>
        <p className="text-xs text-muted">{user.role}</p>
      </div>
      <button
        type="button"
        onClick={() => navigate("/profile")}
        className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-text hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <UserIcon className="h-4 w-4" /> Profile
      </button>
      <button
        type="button"
        onClick={() => void handleLogout()}
        className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-error hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </Dropdown>
  );
}