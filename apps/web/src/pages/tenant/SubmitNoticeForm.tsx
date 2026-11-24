import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CreateTenantNoticeDto } from "@property-platform/contracts";
import { Card } from "../../components/ui/Card";
import {
  MOCK_LEASE_ID,
  MOCK_PROPERTY_ID,
  MOCK_TENANT_ID,
  useCreateNotice,
} from "../../hooks/useCreateNotice";

function todayISO(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const MIN_NOTICE_ERROR = "Must be at least 30 days from notice date.";

export default function SubmitNoticeForm() {
  const [noticeDate, setNoticeDate] = useState(todayISO());
  const [intendedMoveOutDate, setIntendedMoveOutDate] = useState("");
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const mutation = useCreateNotice();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    setSuccess(false);

    const parsed = CreateTenantNoticeDto.safeParse({
      leaseId: MOCK_LEASE_ID,
      propertyId: MOCK_PROPERTY_ID,
      tenantId: MOCK_TENANT_ID,
      noticeDate,
      intendedMoveOutDate,
      reason: reason.trim() === "" ? undefined : reason.trim(),
    });

    if (!parsed.success) {
      setValidationError(MIN_NOTICE_ERROR);
      return;
    }

    mutation.mutate(parsed.data, {
      onSuccess: () => setSuccess(true),
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold sm:text-2xl">Vacation Notice</h1>
          <Link
            to="/tenant"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card className="p-6">
          <p className="mb-4 text-sm text-slate-500">
            Give at least one month&apos;s notice before you move out.
          </p>

          {success ? (
            <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              Notice submitted. Your manager will review it shortly.
            </p>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm">
              <span className="font-medium">Notice date</span>
              <input
                type="date"
                required
                value={noticeDate}
                onChange={(event) => setNoticeDate(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium">Intended move-out date</span>
              <input
                type="date"
                required
                value={intendedMoveOutDate}
                onChange={(event) => {
                  setIntendedMoveOutDate(event.target.value);
                  setValidationError(null);
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
              {validationError ? (
                <span className="mt-1 block text-xs text-rose-600">
                  {validationError}
                </span>
              ) : null}
            </label>

            <label className="block text-sm">
              <span className="font-medium">Reason (optional)</span>
              <textarea
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            {mutation.isError ? (
              <p className="text-sm text-rose-600">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Failed to submit notice"}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {mutation.isPending ? "Submitting…" : "Submit Notice"}
            </button>
          </form>
        </Card>
      </main>
    </div>
  );
}