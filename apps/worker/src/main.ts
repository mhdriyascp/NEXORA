import { createServer } from "node:http";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import pino from "pino";
import { createAiClient } from "./ai-client";
import { DEFAULT_JOB_OPTIONS, QUEUES, loadWorkerConfig } from "./config";
import { buildHealth } from "./health";
import type { EmailJob, NotificationJob } from "./jobs";
import {
  buildProcessors,
  type EmailTransport,
  type NotificationSink,
} from "./processors";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

async function main(): Promise<void> {
  const config = loadWorkerConfig();

  const connection = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
  });

  // Register queues (producers are the API/AI services; this app consumes).
  const queues = Object.fromEntries(
    Object.values(QUEUES).map((name) => [
      name,
      new Queue(name, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
    ]),
  );
  logger.info({ queues: Object.keys(queues) }, "queues registered");

  // Production integrations plug in here; log-only fallbacks keep dev/CI simple.
  const email: EmailTransport = {
    send: async (message: EmailJob) => {
      logger.info({ to: message.to, subject: message.subject }, "email sent");
      return { messageId: `dev-${Date.now()}` };
    },
  };
  const notifications: NotificationSink = {
    deliver: async (notification: NotificationJob) => {
      logger.info({ userId: notification.userId }, "notification delivered");
    },
  };

  const ai = createAiClient({
    baseUrl: config.aiServiceUrl,
    token: config.aiServiceToken,
  });
  const processors = buildProcessors({ ai, email, notifications, logger });

  // One BullMQ worker per queue, each bound to its typed processor.
  const workers = Object.values(QUEUES).map((name) => {
    const worker = new Worker(
      name,
      async (job) => {
        logger.info(
          { queue: name, jobId: job.id, jobName: job.name },
          "processing job",
        );
        const processor = processors[name] as (
          payload: unknown,
        ) => Promise<Record<string, unknown>>;
        return processor(job.data);
      },
      { connection },
    );
    worker.on("failed", (job, err) => {
      logger.error(
        { queue: name, jobId: job?.id, err: err.message },
        "job failed",
      );
    });
    return worker;
  });

  // Lightweight health endpoint for Docker/K8s probes.
  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(buildHealth(config.version)));
      return;
    }
    res.writeHead(404).end();
  });
  server.listen(config.healthPort, "0.0.0.0", () => {
    logger.info({ port: config.healthPort }, "worker health server listening");
  });

  const shutdown = async (): Promise<void> => {
    logger.info("shutting down worker");
    await Promise.all(workers.map((worker) => worker.close()));
    await connection.quit();
    server.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

main().catch((err) => {
  logger.error({ err }, "worker failed to start");
  process.exit(1);
});
