import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "./auth/guards/permissions.guard";
import { loadConfig } from "./config/configuration";
import { CrmModule } from "./crm/crm.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { TenantContextInterceptor } from "./tenant/tenant-context.interceptor";
import { TenantModule } from "./tenant/tenant.module";
import { UsersModule } from "./users/users.module";

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
    DatabaseModule,
    TenantModule,
    AuthModule,
    UsersModule,
    CrmModule,
    HealthModule,
  ],
  providers: [
    // Global authentication runs first; @Public() opts routes out.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Then authorization enforces @RequirePermissions.
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Populate tenant context from the authenticated principal.
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
