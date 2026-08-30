import {
  BadGatewayException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "../config/configuration";
import type { ChatRequestDto } from "./dto/chat.dto";

/**
 * AI Gateway: the single trusted boundary between the CRM domain and the Python
 * AI service. It injects the tenant id (from the authenticated principal, never
 * the client) and the internal service token, so the AI service can stay
 * private and never has to trust end-user input directly.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  async chat(
    tenantId: string,
    dto: ChatRequestDto,
  ): Promise<unknown> {
    return this.post("/v1/ai/chat", {
      tenant_id: tenantId,
      conversation_id: dto.conversationId ?? null,
      messages: dto.messages,
    });
  }

  async ragQuery(
    tenantId: string,
    query: string,
    topK: number,
  ): Promise<unknown> {
    return this.post("/v1/ai/rag/query", {
      tenant_id: tenantId,
      query,
      top_k: topK,
    });
  }

  async ingestDocument(
    tenantId: string,
    documentId: string,
    text: string,
    metadata: Record<string, string>,
  ): Promise<unknown> {
    return this.post("/v1/ai/documents", {
      tenant_id: tenantId,
      document_id: documentId,
      text,
      metadata,
    });
  }

  /** Forward a request to the AI service with the internal service token. */
  private async post(path: string, payload: unknown): Promise<unknown> {
    const baseUrl = this.config.get("aiServiceUrl", { infer: true });
    const token = this.config.get("aiServiceToken", { infer: true });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["X-Service-Token"] = token;
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    } catch (error) {
      this.logger.error(`AI service unreachable: ${String(error)}`);
      throw new BadGatewayException("AI service is unavailable");
    }

    if (!response.ok) {
      this.logger.warn(`AI service returned ${response.status}`);
      throw new BadGatewayException("AI service request failed");
    }

    return response.json();
  }
}
