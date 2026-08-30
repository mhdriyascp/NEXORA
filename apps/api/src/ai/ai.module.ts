import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

/**
 * AI Gateway module. Bridges authenticated CRM users to the internal Python AI
 * service, enforcing RBAC (ai:use) and tenant isolation at the boundary.
 */
@Module({
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
