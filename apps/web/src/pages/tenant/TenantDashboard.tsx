import { Link } from "react-router-dom";
import { Banknote, CreditCard, Download, Scale } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { useTenantArrears } from "../../hooks/useTenantArrears";
import { useDownloadReceipt } from "../../hooks/useDownloadReceipt";

const currency = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

// Mock tenant context until authentication (ADR-004) supplies the real lease.
const MOCK_LEASE_ID = "lease_123";
// Mock completed payment until a payment history view exists (ADR-004).
const MOCK_PAYMENT_ID = "payment_123";

function formatCurrency(value: string | undefined): string {
  if (value === undefined) {
    return "—";
  }
  return currency.format(Number(value));
}

export default function TenantDashboard() {
  const { data, isLoading, isError, error } =
    useTenantArrears(MOCK_LEASE_ID);
  const { download: downloadReceipt, isDownloading } = useDownloadReceipt();

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

            <section>
              <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold">Payment Receipt</p>
                  <p className="text-sm text-slate-500">
                    Download a PDF receipt for your latest completed payment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void downloadReceipt(MOCK_PAYMENT_ID)}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-1 self-start rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 sm:self-auto"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {isDownloading ? "Downloading…" : "Download Receipt"}
                </button>
              </Card>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}