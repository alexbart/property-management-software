import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import {
  useMaintenanceTickets,
  type TicketStatus,
} from "../../hooks/useMaintenanceTickets";

const statusVariant: Record<
  TicketStatus,
  "default" | "success" | "warning" | "danger"
> = {
  OPEN: "warning",
  IN_PROGRESS: "default",
  RESOLVED: "success",
  CANCELLED: "danger",
};

export default function MaintenanceList() {
  const { data, isLoading, isError, error } = useMaintenanceTickets();
  const location = useLocation();
  const created = (location.state as { created?: boolean } | null)?.created;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold sm:text-2xl">Maintenance</h1>
          <Link
            to="/tenant/maintenance/new"
            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Request Repair
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        {created ? (
          <Card className="border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            Repair request submitted.
          </Card>
        ) : null}

        {isLoading ? (
          <Card className="p-6 text-slate-500">Loading tickets…</Card>
        ) : null}

        {isError ? (
          <Card className="border-rose-200 bg-rose-50 p-6 text-rose-700">
            Failed to load tickets:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </Card>
        ) : null}

        {data && data.length === 0 ? (
          <Card className="p-6 text-slate-500">No maintenance tickets yet.</Card>
        ) : null}

        <ul className="space-y-3">
          {data?.map((ticket) => (
            <li key={ticket.id}>
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{ticket.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {ticket.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={statusVariant[ticket.status]}>
                      {ticket.status.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      Priority: {ticket.priority}
                    </span>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}