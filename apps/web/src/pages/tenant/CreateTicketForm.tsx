import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import {
  useCreateMaintenanceTicket,
  type CreateMaintenanceTicketInput,
} from "../../hooks/useCreateMaintenanceTicket";
import type { TicketPriority } from "../../hooks/useMaintenanceTickets";

const priorities: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function CreateTicketForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const mutation = useCreateMaintenanceTicket();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: CreateMaintenanceTicketInput = {
      title: title.trim(),
      description: description.trim(),
      priority,
    };

    mutation.mutate(input, {
      onSuccess: () => {
        navigate("/tenant/maintenance", { state: { created: true } });
      },
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold sm:text-2xl">Request Repair</h1>
          <Link
            to="/tenant/maintenance"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm">
              <span className="font-medium">Title</span>
              <input
                type="text"
                required
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium">Description</span>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium">Priority</span>
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as TicketPriority)
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              >
                {priorities.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            {mutation.isError ? (
              <p className="text-sm text-rose-600">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Failed to submit request"}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {mutation.isPending ? "Submitting…" : "Submit Request"}
            </button>
          </form>
        </Card>
      </main>
    </div>
  );
}