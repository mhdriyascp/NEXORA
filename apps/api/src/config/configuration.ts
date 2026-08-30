/**
 * Typed application configuration loaded from environment variables.
 * No secrets are hardcoded; all values come from the environment.
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  version: string;
  databaseUrl: string;
  redisUrl: string;
  aiServiceUrl: string;
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number.parseInt(process.env.API_PORT ?? "4000", 10),
    version: process.env.APP_VERSION ?? "0.1.0",
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    aiServiceUrl: process.env.AI_SERVICE_URL ?? "http://localhost:8000",
  };
}
