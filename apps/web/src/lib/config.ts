/**
 * Public runtime configuration. NEXT_PUBLIC_API_URL points at the NestJS API
 * gateway; it falls back to the local dev default.
 */
export const config = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
} as const;
