import { Link } from "react-router-dom";
import { Banknote, CreditCard, Scale } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { useTenantArrears } from "../../hooks/useTenantArrears";

const currency = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

// Mock tenant context until authentication (ADR-004) supplies the real lease.
const MOCK_LEASE_ID = "lease_123";

function formatCurrency(value: string | undefined): string {
  if (value === undefined) {
    return "—";
  }
  return currency.format(Number(value));
}

export default function TenantDashboard() {
  const { data, isLoading, isError, error } =
    useTenantArrears(MOCK_LEASE_ID);

  const isOverdue = data ? Number(data.currentBalance) > 0 : false;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold sm:text-2xl">My Tenancy</h1>
          {isOverdue ? <Badge variant="danger">Overdue</Badge> : null}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {isLoading ? (
          <Card className="p-6 text-slate-500">Loading your tenancy…</Card>
        ) : null}

        {isError ? (
          <Card className="border-rose-200 bg-rose-50 p-6 text-rose-700">
            Failed to load tenancy:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </Card>
        ) : null}

        {data ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                title="Total Due"
                value={formatCurrency(data.totalDue)}
                icon={Banknote}
              />
              <StatCard
                title="Total Paid"
                value={formatCurrency(data.totalPaid)}
                icon={CreditCard}
              />
              <StatCard
                title="Current Balance"
                value={formatCurrency(data.currentBalance)}
                icon={Scale}
              />
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                to="/tenant/maintenance"
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
              >
                <p className="text-base font-semibold">Maintenance</p>
                <p className="text-sm text-slate-500">
                  View tickets and submit a repair request.
                </p>
              </Link>
              <Link
                to="/tenant/notice"
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
              >
                <p className="text-base font-semibold">Vacation Notice</p>
                <p className="text-sm text-slate-500">
                  Submit a one-month move-out notice.
                </p>
              </Link>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}