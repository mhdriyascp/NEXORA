import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { loadConfig } from "./config/configuration";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  // Global API prefix + versioning: all routes live under /api/v1.
  app.setGlobalPrefix("api/v1");

  // Strict validation: strip unknown properties, reject unexpected payloads.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

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

  await app.listen(config.port, "0.0.0.0");
}

void bootstrap();
