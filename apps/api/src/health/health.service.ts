import { Injectable } from "@nestjs/common";
import type { HealthResponse } from "@nexora/shared-types";
import { loadConfig } from "../config/configuration";

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  getHealth(): HealthResponse {
    const config = loadConfig();
    return {
      status: "ok",
      service: "api",
      version: config.version,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }
}
