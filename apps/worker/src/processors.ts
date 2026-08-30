import type { AiClient } from "./ai-client";
import type { QueueName } from "./config";
import type {
  DocumentProcessingJob,
  EmailJob,
  EmbeddingsJob,
  JobProcessor,
  NotificationJob,
  ReportJob,
} from "./jobs";

/** Transport that actually delivers an email (SES/SMTP in prod, fake in tests). */
export interface EmailTransport {
  send(message: EmailJob): Promise<{ messageId: string }>;
}

/** Sink for user notifications (websocket/push in prod, fake in tests). */
export interface NotificationSink {
  deliver(notification: NotificationJob): Promise<void>;
}

export interface ProcessorDeps {
  ai: AiClient;
  email: EmailTransport;
  notifications: NotificationSink;
  logger: { info: (obj: unknown, msg?: string) => void };
}

/**
 * Build the processor for every queue. Effects are injected, so each processor
 * is a pure orchestration function that can be unit-tested with fakes.
 */
export function buildProcessors(deps: ProcessorDeps): {
  [Q in QueueName]: JobProcessor<Q>;
} {
  const documentProcessing: JobProcessor<"document-processing"> = async (
    payload: DocumentProcessingJob,
  ) => {
    const result = await deps.ai.ingestDocument(payload);
    deps.logger.info(
      { documentId: result.document_id, chunks: result.chunks_indexed },
      "document ingested",
    );
    return { chunksIndexed: result.chunks_indexed };
  };

  const embeddings: JobProcessor<"embeddings"> = async (
    payload: EmbeddingsJob,
  ) => {
    const result = await deps.ai.embed(payload);
    return { count: result.vectors.length, dimensions: result.dimensions };
  };

  const email: JobProcessor<"email"> = async (payload: EmailJob) => {
    const { messageId } = await deps.email.send(payload);
    return { messageId };
  };

  const notifications: JobProcessor<"notifications"> = async (
    payload: NotificationJob,
  ) => {
    await deps.notifications.deliver(payload);
    return { delivered: true };
  };

  const reports: JobProcessor<"reports"> = async (payload: ReportJob) => {
    // Report generation is a placeholder pending Phase 10 analytics.
    deps.logger.info({ reportType: payload.reportType }, "report requested");
    return { generated: true, reportType: payload.reportType };
  };

  return {
    "document-processing": documentProcessing,
    embeddings,
    email,
    notifications,
    reports,
  };
}
