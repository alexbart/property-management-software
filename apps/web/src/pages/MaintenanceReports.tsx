import { useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { Card } from "../components/ui/Card";
import { useExportMaintenanceCsv } from "../hooks/useExportMaintenanceCsv";

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

export default function MaintenanceReports() {
  const initial = currentMonthRange();
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const { download, isDownloading } = useExportMaintenanceCsv();

  const invalidRange = startDate > endDate;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold sm:text-2xl">
            Maintenance Reports
          </h1>
          <Link
            to="/dashboard"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Card className="p-5">
          <h2 className="text-base font-semibold">Export Maintenance Summary</h2>
          <p className="mt-1 text-sm text-slate-500">
            Download a CSV of maintenance tickets and their costs within the
            selected date range.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
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
              onClick={() => void download(startDate, endDate)}
              disabled={isDownloading || invalidRange}
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {isDownloading ? "Exporting…" : "Export Maintenance Summary (CSV)"}
            </button>
          </div>

          {invalidRange ? (
            <p className="mt-3 text-sm text-rose-700">
              The start date must be on or before the end date.
            </p>
          ) : null}
        </Card>
      </main>
    </div>
  );
}