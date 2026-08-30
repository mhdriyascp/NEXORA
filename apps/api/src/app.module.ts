import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { loadConfig } from "./config/configuration";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        // Structured JSON logs in production; pretty logs in development.
        transport:
          process.env.NODE_ENV === "production"
            ? undefined
            : { target: "pino-pretty", options: { singleLine: true } },
        // PII-aware: redact common sensitive fields from request logs.
        redact: [
          "req.headers.authorization",
          "req.headers.cookie",
          'req.headers["set-cookie"]',
        ],
      },
    }),
    HealthModule,
  ],
})
export class AppModule {}
