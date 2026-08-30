import { buildHealth } from "./health";
import { DEFAULT_JOB_OPTIONS, QUEUES, loadWorkerConfig } from "./config";

describe("worker foundation", () => {
  it("builds an ok health report for the worker service", () => {
    const health = buildHealth("0.1.0");
    expect(health.status).toBe("ok");
    expect(health.service).toBe("worker");
    expect(health.version).toBe("0.1.0");
  });

  it("loads config with a redis url", () => {
    const config = loadWorkerConfig();
    expect(config.redisUrl).toContain("redis://");
  });

  it("enforces retry with exponential backoff on jobs", () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBeGreaterThanOrEqual(3);
    expect(DEFAULT_JOB_OPTIONS.backoff.type).toBe("exponential");
  });

  it("defines the expected queues", () => {
    expect(Object.values(QUEUES)).toContain("document-processing");
    expect(Object.values(QUEUES)).toContain("embeddings");
  });
});
