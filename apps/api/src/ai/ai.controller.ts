import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { AiService } from "./ai.service";
import { ChatRequestDto } from "./dto/chat.dto";
import { IngestDocumentDto, RagQueryDto } from "./dto/rag.dto";

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("chat")
  @RequirePermissions("ai:use")
  chat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChatRequestDto,
  ): Promise<unknown> {
    // tenantId always comes from the JWT principal, isolating conversations.
    return this.ai.chat(user.tenantId, dto);
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
