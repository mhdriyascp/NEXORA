import type { HealthResponse } from "@nexora/shared-types";

const startedAt = Date.now();

/** Build the worker's health report (pure — safe to unit test). */
export function buildHealth(version: string): HealthResponse {
  return {
    status: "ok",
    service: "worker",
    version,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  };
}
