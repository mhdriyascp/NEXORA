/** Worker configuration loaded from the environment. No secrets hardcoded. */
export interface WorkerConfig {
  nodeEnv: string;
  redisUrl: string;
  healthPort: number;
  version: string;
  aiServiceUrl: string;
  aiServiceToken: string;
}

export function loadWorkerConfig(): WorkerConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    healthPort: Number.parseInt(process.env.WORKER_HEALTH_PORT ?? "4100", 10),
    version: process.env.APP_VERSION ?? "0.1.0",
    aiServiceUrl: process.env.AI_SERVICE_URL ?? "http://localhost:8000",
    aiServiceToken: process.env.AI_SERVICE_TOKEN ?? "",
  };
}

/**
 * Queue names for background processing (see docs/ARCHITECTURE.md §10).
 * Each job type gets its own queue so it can be scaled/tuned independently.
 */
export const QUEUES = {
  documentProcessing: "document-processing",
  embeddings: "embeddings",
  email: "email",
  notifications: "notifications",
  reports: "reports",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/**
 * Default job options enforcing the Phase 1 reliability conventions:
 * retries with exponential backoff, and bounded retention.
 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 1000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};
