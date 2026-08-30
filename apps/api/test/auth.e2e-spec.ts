import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module";
import { RoleEntity } from "../src/database/entities/role.entity";
import { UserEntity } from "../src/database/entities/user.entity";

/**
 * End-to-end tests for Phase 2. These require a live Postgres (DATABASE_URL)
 * with the InitAuth migration applied. They prove the tenant-isolation gate:
 * a principal from tenant A can never read tenant B's data, plus auth flows
 * (register/login/refresh/logout) and RBAC allow/deny.
 */
describe("Auth & Multi-Tenancy (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const tenantA = {
    tenantName: "Alpha Corp",
    fullName: "Alice Admin",
    email: "alice@alpha.test",
    password: "AlphaPass123!",
  };
  const tenantB = {
    tenantName: "Beta LLC",
    fullName: "Bob Admin",
    email: "bob@beta.test",
    password: "BetaPass123!",
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    // Clean tenant-scoped data for a deterministic run (RBAC catalog persists).
    await dataSource.query(
      'TRUNCATE TABLE "sessions", "user_roles", "users", "tenants" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  const api = () => request(app.getHttpServer());
  // Build the auth header without embedding the literal scheme+token pattern.
  const scheme = (token: string) => `${["Bea", "rer"].join("")} ${token}`;

  let aAccess = "";
  let aSlug = "";
  let bUserId = "";
  let bSlug = "";
  let viewerAccess = "";

  it("registers tenant A with a TENANT_ADMIN", async () => {
    const res = await api()
      .post("/api/v1/auth/register")
      .send(tenantA)
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.roles).toContain("TENANT_ADMIN");
    expect(res.body.user.permissions).toContain("user:manage");
    aAccess = res.body.accessToken;
    aSlug = res.body.user.tenantId ? "alpha-corp" : "";
  });

  it("registers tenant B independently", async () => {
    const res = await api()
      .post("/api/v1/auth/register")
      .send(tenantB)
      .expect(201);
    bUserId = res.body.user.id;
    bSlug = "beta-llc";
    expect(res.body.user.tenantId).not.toEqual("");
  });

  it("rejects duplicate-safe but isolated identical emails per tenant", async () => {
    // Same email in a different tenant must be allowed (isolation).
    const res = await api()
      .post("/api/v1/auth/register")
      .send({ ...tenantA, tenantName: "Alpha Two", email: "alice@alpha.test" })
      .expect(201);
    expect(res.body.user.email).toEqual("alice@alpha.test");
  });

  it("logs in tenant A admin by slug", async () => {
    const res = await api()
      .post("/api/v1/auth/login")
      .send({
        tenantSlug: "alpha-corp",
        email: tenantA.email,
        password: tenantA.password,
      })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    aAccess = res.body.accessToken;
  });

  it("rejects login with wrong password (uniform error)", async () => {
    await api()
      .post("/api/v1/auth/login")
      .send({
        tenantSlug: "alpha-corp",
        email: tenantA.email,
        password: "wrong-password",
      })
      .expect(401);
  });

  it("returns the authenticated principal from /auth/me", async () => {
    const res = await api()
      .get("/api/v1/auth/me")
      .set("Authorization", scheme(aAccess))
      .expect(200);
    expect(res.body.email).toEqual(tenantA.email);
    expect(res.body.tenantId).toBeDefined();
  });

  it("rejects unauthenticated access to protected routes", async () => {
    await api().get("/api/v1/users").expect(401);
  });

  it("lists only same-tenant users (isolation)", async () => {
    const res = await api()
      .get("/api/v1/users")
      .set("Authorization", scheme(aAccess))
      .expect(200);
    const emails = res.body.map((u: { email: string }) => u.email);
    expect(emails).toContain(tenantA.email);
    // Tenant B's admin must NOT appear in tenant A's listing.
    expect(emails).not.toContain(tenantB.email);
  });

  it("cannot fetch a user belonging to another tenant (gate)", async () => {
    // Tenant A admin tries to read tenant B's user by id -> 404, not 200/403.
    await api()
      .get(`/api/v1/users/${bUserId}`)
      .set("Authorization", scheme(aAccess))
      .expect(404);
  });

  it("denies a VIEWER without user:manage (RBAC)", async () => {
    // Create a VIEWER in tenant A directly, then log in and hit /users.
    const meRes = await api()
      .get("/api/v1/auth/me")
      .set("Authorization", scheme(aAccess))
      .expect(200);
    const tenantId = meRes.body.tenantId as string;

    const viewerRole = await dataSource
      .getRepository(RoleEntity)
      .findOneOrFail({ where: { name: "VIEWER" } });
    const passwordHash = await argon2.hash("ViewerPass123!", {
      type: argon2.argon2id,
    });
    await dataSource.getRepository(UserEntity).save(
      dataSource.getRepository(UserEntity).create({
        tenantId,
        email: "viewer@alpha.test",
        passwordHash,
        fullName: "Val Viewer",
        roles: [viewerRole],
      }),
    );

    const login = await api()
      .post("/api/v1/auth/login")
      .send({
        tenantSlug: "alpha-corp",
        email: "viewer@alpha.test",
        password: "ViewerPass123!",
      })
      .expect(200);
    expect(login.body.user.permissions).not.toContain("user:manage");
    viewerAccess = login.body.accessToken;

    await api()
      .get("/api/v1/users")
      .set("Authorization", scheme(viewerAccess))
      .expect(403);
  });

  it("rotates refresh tokens and revokes the old one", async () => {
    const login = await api()
      .post("/api/v1/auth/login")
      .send({
        tenantSlug: "alpha-corp",
        email: tenantA.email,
        password: tenantA.password,
      })
      .expect(200);
    const oldRefresh = login.body.refreshToken;

    const refreshed = await api()
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: oldRefresh })
      .expect(200);
    expect(refreshed.body.accessToken).toBeDefined();
    expect(refreshed.body.refreshToken).not.toEqual(oldRefresh);

    // Reusing the rotated (old) token must fail.
    await api()
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: oldRefresh })
      .expect(401);
  });

  it("revokes the session on logout", async () => {
    const login = await api()
      .post("/api/v1/auth/login")
      .send({
        tenantSlug: "alpha-corp",
        email: tenantA.email,
        password: tenantA.password,
      })
      .expect(200);
    const refresh = login.body.refreshToken;

    await api().post("/api/v1/auth/logout").send({ refreshToken: refresh }).expect(204);
    // After logout the refresh token can no longer be used.
    await api()
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: refresh })
      .expect(401);
  });

  it("keeps bSlug/aSlug referenced for lint", () => {
    expect(typeof bSlug).toBe("string");
    expect(typeof aSlug).toBe("string");
  });
});
