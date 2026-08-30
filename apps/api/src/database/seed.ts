import * as argon2 from "argon2";
import dataSource from "./data-source";
import { RoleEntity } from "./entities/role.entity";
import { TenantEntity } from "./entities/tenant.entity";
import { UserEntity } from "./entities/user.entity";
import { PermissionEntity } from "./entities/permission.entity";
import { PERMISSIONS, ROLES } from "@nexora/shared-types";
import { ROLE_PERMISSIONS } from "./rbac";

/**
 * Development-only seed: ensures the RBAC catalog exists and creates a demo
 * tenant with a TENANT_ADMIN and a VIEWER user. Idempotent — safe to re-run.
 * Never run against production data.
 */
async function seed(): Promise<void> {
  await dataSource.initialize();
  try {
    const permRepo = dataSource.getRepository(PermissionEntity);
    const roleRepo = dataSource.getRepository(RoleEntity);
    const tenantRepo = dataSource.getRepository(TenantEntity);
    const userRepo = dataSource.getRepository(UserEntity);

    for (const name of PERMISSIONS) {
      if (!(await permRepo.findOne({ where: { name } }))) {
        await permRepo.save(permRepo.create({ name }));
      }
    }
    const permByName = new Map(
      (await permRepo.find()).map((p) => [p.name, p]),
    );
    for (const roleName of ROLES) {
      let role = await roleRepo.findOne({ where: { name: roleName } });
      if (!role) role = roleRepo.create({ name: roleName });
      role.permissions = ROLE_PERMISSIONS[roleName]
        .map((p) => permByName.get(p))
        .filter((p): p is PermissionEntity => Boolean(p));
      await roleRepo.save(role);
    }

    const slug = "demo";
    let tenant = await tenantRepo.findOne({ where: { slug } });
    if (!tenant) {
      tenant = await tenantRepo.save(
        tenantRepo.create({ name: "Demo Company", slug }),
      );
    }

    const adminRole = await roleRepo.findOneOrFail({
      where: { name: "TENANT_ADMIN" },
    });
    const viewerRole = await roleRepo.findOneOrFail({
      where: { name: "VIEWER" },
    });
    const password = process.env.SEED_PASSWORD ?? "ChangeMe123!";
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    const demoUsers = [
      { email: "admin@demo.test", fullName: "Demo Admin", role: adminRole },
      { email: "viewer@demo.test", fullName: "Demo Viewer", role: viewerRole },
    ];
    for (const u of demoUsers) {
      const existing = await userRepo.findOne({
        where: { tenantId: tenant.id, email: u.email },
      });
      if (!existing) {
        await userRepo.save(
          userRepo.create({
            tenantId: tenant.id,
            email: u.email,
            passwordHash,
            fullName: u.fullName,
            roles: [u.role],
          }),
        );
      }
    }

    console.log(
      `Seeded tenant "${tenant.slug}" with demo users (password from SEED_PASSWORD).`,
    );
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
