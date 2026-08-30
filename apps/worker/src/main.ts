import { createServer } from "node:http";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import pino from "pino";
import { DEFAULT_JOB_OPTIONS, QUEUES, loadWorkerConfig } from "./config";
import { buildHealth } from "./health";

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

  // A representative worker. Real processors are implemented in Phase 9.
  const worker = new Worker(
    QUEUES.notifications,
    async (job) => {
      logger.info({ jobId: job.id, name: job.name }, "processing job");
      return { processed: true };
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "job failed");
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
    await worker.close();
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
