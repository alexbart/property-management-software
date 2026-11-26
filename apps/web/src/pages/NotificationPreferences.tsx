import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { usePreferences, useUpdatePreference } from "../hooks/usePreferences";
import type {
  NotificationChannel,
  NotificationType,
} from "../hooks/useNotifications";

const NOTIFICATION_TYPES: NotificationType[] = [
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "MAINTENANCE_CREATED",
  "MAINTENANCE_UPDATED",
  "LEASE_EXPIRING_SOON",
  "NOTICE_RECEIVED",
];

const CHANNELS: NotificationChannel[] = ["IN_APP", "EMAIL", "SMS"];

// Mirrors the backend DEFAULT_PREFERENCES so the UI shows sensible defaults
// before the user has any persisted preference rows.
const DEFAULT_PREFERENCES: Record<
  NotificationType,
  Partial<Record<NotificationChannel, boolean>>
> = {
  PAYMENT_RECEIVED: { IN_APP: true, EMAIL: true, SMS: false },
  PAYMENT_OVERDUE: { IN_APP: true, EMAIL: true, SMS: true },
  MAINTENANCE_CREATED: { IN_APP: true, EMAIL: false, SMS: false },
  MAINTENANCE_UPDATED: { IN_APP: true, EMAIL: false, SMS: false },
  LEASE_EXPIRING_SOON: { IN_APP: true, EMAIL: true, SMS: false },
  NOTICE_RECEIVED: { IN_APP: true, EMAIL: true, SMS: false },
};

function humanizeType(type: NotificationType): string {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function NotificationPreferences() {
  const { data: preferences, isLoading, isError, error } = usePreferences();
  const updatePreference = useUpdatePreference();

  const enabledFor = (
    type: NotificationType,
    channel: NotificationChannel,
  ): boolean => {
    const existing = preferences?.find(
      (p) => p.type === type && p.channel === channel,
    );
    if (existing) return existing.enabled;
    return DEFAULT_PREFERENCES[type]?.[channel] ?? false;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold sm:text-2xl">
            Notification Preferences
          </h1>
          <Link
            to="/dashboard"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        {isLoading ? (
          <Card className="p-6 text-slate-500">Loading preferences…</Card>
        ) : null}

        {isError ? (
          <Card className="border-rose-200 bg-rose-50 p-6 text-rose-700">
            Failed to load preferences:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </Card>
        ) : null}

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Event</th>
                {CHANNELS.map((channel) => (
                  <th
                    key={channel}
                    className="px-2 py-3 text-center font-medium"
                  >
                    {channel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {NOTIFICATION_TYPES.map((type) => (
                <tr key={type}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {humanizeType(type)}
                  </td>
                  {CHANNELS.map((channel) => {
                    const enabled = enabledFor(type, channel);
                    return (
                      <td
                        key={channel}
                        className="px-2 py-3 text-center"
                      >
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          aria-label={`${humanizeType(type)} via ${channel}`}
                          disabled={updatePreference.isPending}
                          onClick={() =>
                            updatePreference.mutate({
                              type,
                              channel,
                              enabled: !enabled,
                            })
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                            enabled ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                              enabled ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {updatePreference.isError ? (
          <Card className="border-rose-200 bg-rose-50 p-4 text-rose-700">
            Failed to update preference. Please try again.
          </Card>
        ) : null}
      </main>
    </div>
  );
}