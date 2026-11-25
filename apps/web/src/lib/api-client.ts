const DEFAULT_API_URL = "http://localhost:4000";

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

interface ApiClientOptions extends RequestInit {
  /** Optional runtime validator (e.g. a shared Zod schema). */
  schema?: { parse(data: unknown): unknown };
}

/**
 * Typed fetch wrapper for the backend.
 *
 * - Prepends `VITE_API_URL`.
 * - Sends cookies (credentials: 'include') for session auth.
 * - Sends JSON.
 * - Throws `ApiError` on non-2xx responses.
 * - Optionally validates the response with a shared contract schema.
 */
export async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL;
  const { schema, headers, ...init } = options;

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const message =
      (details as { error?: { message?: string } } | null)?.error?.message ??
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, details);
  }

  const data: unknown = await response.json();
  return (schema ? schema.parse(data) : data) as T;
}