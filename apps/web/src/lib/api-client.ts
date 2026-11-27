// Empty base => same-origin relative requests (proxied to the API in dev by
// Vite). Set VITE_API_URL to target the API directly in other environments.
const DEFAULT_API_URL = "";
const DEFAULT_PROPERTY_ID = "prop_123";
const DEFAULT_USER_ID = "usr_123";

/**
 * Resolve the property the current view is scoped to.
 *
 * TODO(ADR-004): once the UI exposes the session user's property memberships,
 * this should be derived from the authenticated user rather than localStorage.
 */
export function resolvePropertyId(): string {
  if (typeof window === "undefined") {
    return DEFAULT_PROPERTY_ID;
  }
  return window.localStorage.getItem("mock-property-id") ?? DEFAULT_PROPERTY_ID;
}

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

function resolveUserId(): string {
  if (typeof window === "undefined") {
    return DEFAULT_USER_ID;
  }
  return window.localStorage.getItem("mock-user-id") ?? DEFAULT_USER_ID;
}

function authHeaders(extra?: HeadersInit): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-property-id": resolvePropertyId(),
    "x-user-id": resolveUserId(),
    ...(extra as Record<string, string> | undefined),
  };
}

/**
 * Typed fetch wrapper for the backend.
 *
 * - Prepends `VITE_API_URL`.
 * - Sends cookies (credentials: 'include') for session auth.
 * - Injects the `x-property-id` and `x-user-id` headers (mock context until ADR-004).
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
    headers: authHeaders(headers),
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const message =
      (details as { error?: { message?: string } } | null)?.error?.message ??
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data: unknown = await response.json();
  return (schema ? schema.parse(data) : data) as T;
}

/**
 * Download a binary/text file from the API and save it via a hidden anchor.
 *
 * Session cookies are attached (credentials: 'include'), the response is read
 * as a Blob, and an object URL is used to trigger the browser download with
 * the given filename.
 * Auth headers are attached (so header-based auth works for downloads), the
 * response is read as a Blob, and an object URL is used to trigger the browser
 * download with the given filename.
 */
export async function downloadFile(
  endpoint: string,
  filename: string,
): Promise<void> {
  const baseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL;

  const response = await fetch(`${baseUrl}${endpoint}`, {
    credentials: "include",
    headers: authHeaders(),
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const message =
      (details as { error?: { message?: string } } | null)?.error?.message ??
      `Download failed with status ${response.status}`;
    throw new ApiError(response.status, message, details);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}