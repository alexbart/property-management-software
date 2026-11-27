import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { useTenantsRisk } from "../../hooks/useTenantsRisk";

const HIGH_RISK_THRESHOLD = 50;

export default function TenantRiskRegister() {
  const { data, isLoading, isError, error } = useTenantsRisk();

  const tenants = [...(data ?? [])].sort(
    (a, b) => b.riskScore - a.riskScore,
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-semibold sm:text-2xl">
            Tenant Risk Register
          </h1>
          <p className="text-sm text-slate-500">
            Tenants ranked by payment risk, highest first.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {isLoading ? (
          <Card className="p-6 text-slate-500">Loading tenants…</Card>
        ) : null}

        {isError ? (
          <Card className="border-rose-200 bg-rose-50 p-6 text-rose-700">
            Failed to load tenants:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </Card>
        ) : null}

        {data && data.length === 0 ? (
          <Card className="p-6 text-slate-500">No tenants found.</Card>
        ) : null}

        {tenants.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Risk Score</th>
                    <th className="px-4 py-3">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className={
                        tenant.riskScore >= HIGH_RISK_THRESHOLD
                          ? "bg-rose-50"
                          : undefined
                      }
                    >
                      <td className="px-4 py-3 font-medium">
                        {tenant.firstName} {tenant.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {tenant.phone}
                      </td>
                      <td className="px-4 py-3">{tenant.riskScore}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {tenant.riskFlags.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            tenant.riskFlags.map((flag) => (
                              <Badge
                                key={flag}
                                variant={
                                  flag === "HIGH_RISK" ? "danger" : "warning"
                                }
                              >
                                {flag}
                              </Badge>
                            ))
                          )}
                        </div>
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