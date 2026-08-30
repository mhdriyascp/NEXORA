import { DataSource, DataSourceOptions } from "typeorm";
import { CompanyEntity } from "../crm/entities/company.entity";
import { ContactEntity } from "../crm/entities/contact.entity";
import { DealEntity } from "../crm/entities/deal.entity";
import { LeadEntity } from "../crm/entities/lead.entity";
import { PipelineEntity } from "../crm/entities/pipeline.entity";
import { StageEntity } from "../crm/entities/stage.entity";
import { TaskEntity } from "../crm/entities/task.entity";
import { PermissionEntity } from "./entities/permission.entity";
import { RoleEntity } from "./entities/role.entity";
import { SessionEntity } from "./entities/session.entity";
import { TenantEntity } from "./entities/tenant.entity";
import { UserEntity } from "./entities/user.entity";

/**
 * Shared TypeORM options used both by the NestJS runtime and the migration CLI.
 * `synchronize` is always false — schema changes flow exclusively through
 * migrations (see docs/ARCHITECTURE.md ADR-0008).
 */
export const entities = [
  TenantEntity,
  UserEntity,
  RoleEntity,
  PermissionEntity,
  SessionEntity,
  CompanyEntity,
  ContactEntity,
  LeadEntity,
  PipelineEntity,
  StageEntity,
  DealEntity,
  TaskEntity,
];

export function buildDataSourceOptions(
  databaseUrl = process.env.DATABASE_URL ?? "",
): DataSourceOptions {
  return {
    type: "postgres",
    url: databaseUrl,
    entities,
    migrations: [__dirname + "/migrations/*.{ts,js}"],
    synchronize: false,
    migrationsRun: false,
    logging: false,
  };
}

/** Used by the TypeORM CLI (`typeorm migration:run`, etc.). */
const dataSource = new DataSource(buildDataSourceOptions());
export default dataSource;
