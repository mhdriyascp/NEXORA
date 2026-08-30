import { NextResponse } from "next/server";
import type { HealthResponse } from "@nexora/shared-types";

const startedAt = Date.now();

/** Health probe for the web app (used by Docker/K8s and CI smoke tests). */
export function GET(): NextResponse<HealthResponse> {
  const body: HealthResponse = {
    status: "ok",
    service: "web",
    version: process.env.APP_VERSION ?? "0.1.0",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  };
  return NextResponse.json(body);
}
