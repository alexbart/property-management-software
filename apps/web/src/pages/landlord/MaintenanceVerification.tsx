import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { useResolvedMaintenanceTickets } from "../../hooks/useResolvedMaintenanceTickets";

const currency = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function MaintenanceVerification() {
  const { data, isLoading, isError, error } =
    useResolvedMaintenanceTickets();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-semibold sm:text-2xl">
            Maintenance Expense Verification
          </h1>
          <p className="text-sm text-slate-500">
            Resolved tickets with costs to verify before monthly reconciliation.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
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
          <Card className="p-6 text-slate-500">
            No resolved tickets with costs.
          </Card>
        ) : null}

        {data && data.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Actual Cost</th>
                    <th className="px-4 py-3">Resolved</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className="px-4 py-3 font-medium">
                        {ticket.unit.unitNumber}
                      </td>
                      <td className="px-4 py-3">{ticket.title}</td>
                      <td className="px-4 py-3">{ticket.priority}</td>
                      <td className="px-4 py-3">
                        {currency.format(Number(ticket.actualCost ?? 0))}
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(ticket.resolvedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="warning">
                          Pending Reconciliation
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}
      </main>
    </div>
  );
}