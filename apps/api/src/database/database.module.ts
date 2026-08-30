import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import type { AppConfig } from "../config/configuration";
import { buildDataSourceOptions, entities } from "./data-source";
import { RbacSeeder } from "./rbac.seeder";

/**
 * Wires TypeORM into Nest using the typed application config. Migrations are
 * run explicitly (via the migration CLI or on deploy), never auto-synchronized.
 * Also registers the idempotent RBAC seeder.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<AppConfig["databaseUrl"]>("databaseUrl");
        return {
          ...buildDataSourceOptions(databaseUrl),
          autoLoadEntities: true,
        };
      },
    }),
    TypeOrmModule.forFeature(entities),
  ],
  providers: [RbacSeeder],
  exports: [TypeOrmModule, RbacSeeder],
})
export class DatabaseModule {}
