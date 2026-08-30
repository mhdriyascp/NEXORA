import { Global, Module } from "@nestjs/common";
import { TenantContextService } from "./tenant-context.service";

/**
 * Provides the tenant context globally so any module can inject the active
 * tenant without re-importing. The context itself is populated per request by
 * the TenantContextInterceptor after JWT authentication.
 */
@Global()
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenantModule {}
