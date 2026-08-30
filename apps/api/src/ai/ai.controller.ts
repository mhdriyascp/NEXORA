import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { AiService } from "./ai.service";
import { AiToolExecutor, type ToolResult } from "./ai-tool-executor.service";
import { AssistantMessageDto } from "./dto/assistant.dto";
import { ChatRequestDto } from "./dto/chat.dto";
import { IngestDocumentDto, RagQueryDto } from "./dto/rag.dto";

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai")
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly tools: AiToolExecutor,
  ) {}

  @Post("chat")
  @RequirePermissions("ai:use")
  chat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChatRequestDto,
  ): Promise<unknown> {
    // tenantId always comes from the JWT principal, isolating conversations.
    return this.ai.chat(user.tenantId, dto);
  }

  @Post("assistant")
  @RequirePermissions("ai:use")
  async assistant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssistantMessageDto,
  ): Promise<{ answer: string; executedTool: ToolResult | null }> {
    const plan = await this.ai.plan(user.tenantId, dto.message);

    if (plan.action === "tool_call" && plan.tool_call) {
      // Execute through the CRM domain layer; RBAC is enforced per tool.
      const result = await this.tools.execute(
        user.tenantId,
        user.permissions,
        plan.tool_call,
      );
      return { answer: result.summary, executedTool: result };
    }

    return { answer: plan.message ?? "", executedTool: null };
  }

  @Post("rag/query")
  @RequirePermissions("ai:use")
  ragQuery(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RagQueryDto,
  ): Promise<unknown> {
    return this.ai.ragQuery(user.tenantId, dto.query, dto.topK ?? 4);
  }

  @Post("documents")
  @RequirePermissions("ai:admin")
  ingestDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: IngestDocumentDto,
  ): Promise<unknown> {
    return this.ai.ingestDocument(
      user.tenantId,
      dto.documentId,
      dto.text,
      dto.metadata ?? {},
    );
  }
}
