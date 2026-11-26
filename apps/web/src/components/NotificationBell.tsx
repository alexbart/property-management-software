import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import { useUnreadCount } from "../hooks/useUnreadCount";
import { useMarkAsRead } from "../hooks/useMarkAsRead";
import { useMarkAllAsRead } from "../hooks/useMarkAllAsRead";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data: unreadCount } = useUnreadCount();
  const { data, isLoading, isError, error } = useNotifications({ limit: 20 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.notifications ?? [];
  const count = unreadCount ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[0.65rem] font-semibold leading-5 text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">
              Notifications
            </span>
            <button
              type="button"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending || count === 0}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              Mark all as read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-6 text-sm text-slate-500">Loading…</p>
            ) : null}

            {isError ? (
              <p className="px-4 py-6 text-sm text-rose-700">
                Failed to load notifications:{" "}
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            ) : null}

            {!isLoading && !isError && notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">
                No notifications yet.
              </p>
            ) : null}

            <ul className="divide-y divide-slate-100">
              {notifications.map((notification) => {
                const unread = notification.status === "UNREAD";
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (unread) markAsRead.mutate(notification.id);
                      }}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-slate-50 ${
                        unread ? "bg-slate-50/60" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {unread ? (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-rose-600"
                            aria-label="Unread"
                          />
                        ) : null}
                        <span className="text-sm font-medium text-slate-900">
                          {notification.title}
                        </span>
                      </span>
                      <span className="text-sm text-slate-600">
                        {notification.message}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatTimestamp(notification.createdAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}