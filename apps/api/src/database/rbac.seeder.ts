import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PERMISSIONS, ROLES } from "@nexora/shared-types";
import { Repository } from "typeorm";
import { PermissionEntity } from "./entities/permission.entity";
import { RoleEntity } from "./entities/role.entity";
import { ROLE_PERMISSIONS } from "./rbac";

/**
 * Idempotently ensures the global permission catalog and role definitions
 * exist and that each role is linked to its permissions. Runs on module init
 * so a freshly migrated database is immediately usable. Safe to run repeatedly.
 */
@Injectable()
export class RbacSeeder implements OnModuleInit {
  private readonly logger = new Logger(RbacSeeder.name);

  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissions: Repository<PermissionEntity>,
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    // Upsert permissions.
    for (const name of PERMISSIONS) {
      const existing = await this.permissions.findOne({ where: { name } });
      if (!existing) {
        await this.permissions.save(this.permissions.create({ name }));
      }
    }
    const allPermissions = await this.permissions.find();
    const permByName = new Map(allPermissions.map((p) => [p.name, p]));

    // Upsert roles and (re)link their permissions.
    for (const roleName of ROLES) {
      let role = await this.roles.findOne({ where: { name: roleName } });
      if (!role) {
        role = this.roles.create({ name: roleName });
      }
      role.permissions = ROLE_PERMISSIONS[roleName]
        .map((p) => permByName.get(p))
        .filter((p): p is PermissionEntity => Boolean(p));
      await this.roles.save(role);
    }
    this.logger.log("RBAC catalog seeded (permissions + roles)");
  }
}
