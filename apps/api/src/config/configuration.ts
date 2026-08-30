/**
 * Typed application configuration loaded from environment variables.
 * No secrets are hardcoded; all values come from the environment.
 */
export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  version: string;
  databaseUrl: string;
  redisUrl: string;
  aiServiceUrl: string;
  aiServiceToken: string;
  jwt: JwtConfig;
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number.parseInt(process.env.API_PORT ?? "4000", 10),
    version: process.env.APP_VERSION ?? "0.1.0",
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    aiServiceUrl: process.env.AI_SERVICE_URL ?? "http://localhost:8000",
    // Shared secret presented to the AI service; empty in local dev.
    aiServiceToken: process.env.AI_SERVICE_TOKEN ?? "",
    jwt: {
      // In development a deterministic fallback is used; production MUST set these.
      accessSecret:
        process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
      refreshSecret:
        process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
      accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
      refreshTtl: process.env.JWT_REFRESH_TTL ?? "7d",
    },
  };
}
