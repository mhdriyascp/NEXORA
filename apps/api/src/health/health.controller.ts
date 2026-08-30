import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { HealthResponse } from "@nexora/shared-types";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness + readiness probe consumed by Docker/K8s and CI smoke tests. */
  @Get()
  @ApiOkResponse({ description: "Service health report" })
  check(): HealthResponse {
    return this.health.getHealth();
  }
}
