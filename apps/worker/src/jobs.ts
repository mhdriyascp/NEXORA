import type { QueueName } from "./config";

/** Strongly-typed payloads for each background job. tenantId scopes every job. */
export interface DocumentProcessingJob {
  tenantId: string;
  documentId: string;
  text: string;
  metadata?: Record<string, string>;
}

export interface EmbeddingsJob {
  tenantId: string;
  inputs: string[];
}

export interface EmailJob {
  tenantId: string;
  to: string;
  subject: string;
  body: string;
}

export interface NotificationJob {
  tenantId: string;
  userId: string;
  message: string;
}

export interface ReportJob {
  tenantId: string;
  reportType: string;
}

export interface JobPayloads {
  "document-processing": DocumentProcessingJob;
  embeddings: EmbeddingsJob;
  email: EmailJob;
  notifications: NotificationJob;
  reports: ReportJob;
}

/** A processor consumes a typed payload and returns a JSON-serialisable result. */
export type JobProcessor<Q extends QueueName> = (
  payload: JobPayloads[Q],
) => Promise<Record<string, unknown>>;
