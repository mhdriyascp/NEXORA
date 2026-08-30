import { Module } from "@nestjs/common";
import { CrmModule } from "../crm/crm.module";
import { AiController } from "./ai.controller";
import { AiToolExecutor } from "./ai-tool-executor.service";
import { AiService } from "./ai.service";

/**
 * AI Gateway module. Bridges authenticated CRM users to the internal Python AI
 * service, enforcing RBAC (ai:use) and tenant isolation at the boundary. AI
 * tool calls are executed through the CRM domain (imported here), never by the
 * AI service directly.
 */
@Module({
  imports: [CrmModule],
  controllers: [AiController],
  providers: [AiService, AiToolExecutor],
})
export class AiModule {}
