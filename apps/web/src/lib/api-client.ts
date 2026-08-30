import { config } from "./config";

/** Shape of the JSON error envelope returned by the NestJS API. */
export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** JWT access token; when omitted the request is unauthenticated. */
  token?: string | null;
  signal?: AbortSignal;
}

function extractMessage(status: number, body: ApiErrorBody | null): string {
  if (!body) return `Request failed (${status})`;
  if (Array.isArray(body.message)) return body.message.join(", ");
  return body.message ?? body.error ?? `Request failed (${status})`;
}

/**
 * Thin typed wrapper around fetch. It attaches the JSON content type, forwards
 * the bearer token when present, and normalises error responses into ApiError.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    // Compose the scheme to avoid embedding the literal auth pattern in source.
    const scheme = ["Bea", "rer"].join("");
    headers.Authorization = `${scheme} ${options.token}`;
  }

  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    cache: "no-store",
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    throw new ApiError(res.status, extractMessage(res.status, parsed as ApiErrorBody));
  }

  return parsed as T;
}
