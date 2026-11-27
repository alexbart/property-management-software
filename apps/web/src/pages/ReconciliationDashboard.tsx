import { useState } from "react";
import {
  Download,
  LineChart,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";
import { useReconciliation } from "../hooks/useReconciliation";
import { useExportRentRoll } from "../hooks/useExportRentRoll";

const currency = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  return {
    startDate: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

// Placeholder weekly breakdown until the API exposes a time series.
const weeklyMock = [
  { week: "Week 1", collected: 42000, expenses: 8000 },
  { week: "Week 2", collected: 68000, expenses: 12000 },
  { week: "Week 3", collected: 51000, expenses: 5000 },
  { week: "Week 4", collected: 74000, expenses: 15000 },
];

const maintenanceMock = [
  { id: "1", title: "Burst pipe in Block A", status: "IN_PROGRESS" },
  { id: "2", title: "Gate motor repair", status: "OPEN" },
  { id: "3", title: " repaint stairwell", status: "RESOLVED" },
];

function formatCurrency(value: string | undefined): string {
  if (value === undefined) {
    return "—";
  }
  return currency.format(Number(value));
}

export default function ReconciliationDashboard() {
  const initial = currentMonthRange();
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const { data, isLoading, isError, error } = useReconciliation(
    startDate,
    endDate,
  );
  const { download: exportRentRoll, isDownloading } = useExportRentRoll();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">
              Financial Reconciliation
            </h1>
            <p className="text-sm text-slate-500">
              Property income, expenses and estimated net operating income.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="block text-slate-500">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="block text-slate-500">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => void exportRentRoll()}
              disabled={isDownloading}
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {isDownloading ? "Exporting…" : "Export Rent Roll (CSV)"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {isLoading ? (
          <Card className="p-6 text-slate-500">Loading reconciliation…</Card>
        ) : null}

        {isError ? (
          <Card className="border-rose-200 bg-rose-50 p-6 text-rose-700">
            Failed to load reconciliation:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </Card>
        ) : null}

        {data ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Rent Due"
                value={formatCurrency(data.totalRentDue)}
                icon={Wallet}
              />
              <StatCard
                title="Total Collected"
                value={formatCurrency(data.totalCollected)}
                icon={TrendingUp}
              />
              <StatCard
                title="Maintenance Expenses"
                value={formatCurrency(data.totalMaintenanceExpenses)}
                icon={Wrench}
              />
              <StatCard
                title="Estimated NOI"
                value={formatCurrency(data.estimatedNOI)}
                icon={LineChart}
              />
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <h2 className="text-base font-semibold">
                  Collected vs. Expenses
                </h2>
                <p className="text-xs text-slate-500">
                  Illustrative weekly breakdown (placeholder data).
                </p>
                <div className="mt-4 h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyMock}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="week" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        formatter={(value) => currency.format(Number(value))}
                      />
                      <Legend />
                      <Bar
                        dataKey="collected"
                        name="Collected"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Expenses"
                        fill="#f43f5e"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="text-base font-semibold">
                  Recent Maintenance
                </h2>
                <p className="text-xs text-slate-500">
                  Placeholder activity list.
                </p>
                <ul className="mt-4 space-y-3">
                  {maintenanceMock.map((ticket) => (
                    <li
                      key={ticket.id}
                      className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                    >
                      <span className="text-sm text-slate-700">
                        {ticket.title}
                      </span>
                      <Badge
                        variant={
                          ticket.status === "RESOLVED"
                            ? "success"
                            : ticket.status === "IN_PROGRESS"
                              ? "warning"
                              : "default"
                        }
                      >
                        {ticket.status.replace("_", " ")}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}