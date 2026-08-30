import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";
import { loadConfig } from "./config/configuration";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  // Security headers (CSP, HSTS, etc.) applied to every response.
  app.use(helmet());

  // Global API prefix + versioning: all routes live under /api/v1.
  app.setGlobalPrefix("api/v1");

  // Strict validation: strip unknown properties, reject unexpected payloads.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // Consistent error envelope; internal errors never leak stack traces.
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS restricted to the configured web origin.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });

  // Swagger / OpenAPI at /api/docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle("NEXORA CRM API")
    .setDescription("Multi-tenant AI CRM — REST API")
    .setVersion(config.version)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  // Flush connections/queues cleanly on SIGTERM/SIGINT (K8s rolling updates).
  app.enableShutdownHooks();

  await app.listen(config.port, "0.0.0.0");
}

void bootstrap();
