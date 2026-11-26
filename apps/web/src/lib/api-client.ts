const DEFAULT_API_URL = "http://localhost:4000";
const DEFAULT_PROPERTY_ID = "prop_123";
const DEFAULT_USER_ID = "11111111-1111-1111-1111-111111111111";

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

function resolvePropertyId(): string {
  if (typeof window === "undefined") {
    return DEFAULT_PROPERTY_ID;
  }
  return window.localStorage.getItem("mock-property-id") ?? DEFAULT_PROPERTY_ID;
}

function resolveUserId(): string {
  if (typeof window === "undefined") {
    return DEFAULT_USER_ID;
  }
  return window.localStorage.getItem("mock-user-id") ?? DEFAULT_USER_ID;
}

/**
 * Typed fetch wrapper for the backend.
 *
 * - Prepends `VITE_API_URL`.
 * - Injects the `x-property-id` header (mock property context until ADR-004).
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
    headers: {
      "Content-Type": "application/json",
      "x-property-id": resolvePropertyId(),
      "x-user-id": resolveUserId(),
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