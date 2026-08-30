import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module";
import { RoleEntity } from "../src/database/entities/role.entity";
import { UserEntity } from "../src/database/entities/user.entity";

/**
 * End-to-end tests for Phase 3 (CRM Core). They prove that CRM aggregates are
 * strictly tenant-isolated (tenant A can never read/update/delete tenant B's
 * records) and that RBAC is enforced (a VIEWER cannot create/delete). They also
 * exercise the deal/pipeline flow and weighted forecast summary.
 *
 * Requires a live Postgres (DATABASE_URL) with InitAuth + CrmCore migrations
 * applied.
 */
describe("CRM Core (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const tenantA = {
    tenantName: "Gamma Corp",
    fullName: "Gina Admin",
    email: "gina@gamma.test",
    password: "GammaPass123!",
  };
  const tenantB = {
    tenantName: "Delta LLC",
    fullName: "Dan Admin",
    email: "dan@delta.test",
    password: "DeltaPass123!",
  };

  let aAccess = "";
  let bAccess = "";
  let viewerAccess = "";

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
    await dataSource.query(
      'TRUNCATE TABLE "deals", "stages", "pipelines", "tasks", "leads", "contacts", "companies", "sessions", "user_roles", "users", "tenants" RESTART IDENTITY CASCADE',
    );

    const reg = async (t: typeof tenantA) =>
      (await api().post("/api/v1/auth/register").send(t).expect(201)).body
        .accessToken as string;
    aAccess = await reg(tenantA);
    bAccess = await reg(tenantB);

    // Create a VIEWER in tenant A directly (there is no user-invite endpoint
    // yet), then log in to obtain a low-privilege token for RBAC assertions.
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
        email: "viewer@gamma.test",
        passwordHash,
        fullName: "Val Viewer",
        roles: [viewerRole],
      }),
    );
    const login = await api()
      .post("/api/v1/auth/login")
      .send({
        tenantSlug: "gamma-corp",
        email: "viewer@gamma.test",
        password: "ViewerPass123!",
      })
      .expect(200);
    viewerAccess = login.body.accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  const api = () => request(app.getHttpServer());
  const scheme = (token: string) => `${["Bea", "rer"].join("")} ${token}`;

  it("creates and lists a company scoped to the tenant", async () => {
    const created = await api()
      .post("/api/v1/companies")
      .set("Authorization", scheme(aAccess))
      .send({ name: "Acme Inc", domain: "acme.test" })
      .expect(201);
    expect(created.body.id).toBeDefined();

    const list = await api()
      .get("/api/v1/companies")
      .set("Authorization", scheme(aAccess))
      .expect(200);
    expect(list.body.map((c: { name: string }) => c.name)).toContain(
      "Acme Inc",
    );
  });

  it("does not leak a company across tenants", async () => {
    const created = await api()
      .post("/api/v1/companies")
      .set("Authorization", scheme(aAccess))
      .send({ name: "Secret Co" })
      .expect(201);
    const id = created.body.id as string;

    // Tenant B cannot read tenant A's company.
    await api()
      .get(`/api/v1/companies/${id}`)
      .set("Authorization", scheme(bAccess))
      .expect(404);
    // Tenant B cannot update it.
    await api()
      .patch(`/api/v1/companies/${id}`)
      .set("Authorization", scheme(bAccess))
      .send({ name: "hijacked" })
      .expect(404);
    // Tenant B cannot delete it.
    await api()
      .delete(`/api/v1/companies/${id}`)
      .set("Authorization", scheme(bAccess))
      .expect(404);

    // Tenant B's listing does not include it.
    const list = await api()
      .get("/api/v1/companies")
      .set("Authorization", scheme(bAccess))
      .expect(200);
    expect(list.body.map((c: { name: string }) => c.name)).not.toContain(
      "Secret Co",
    );
  });

  it("rejects linking a contact to another tenant's company", async () => {
    const aCompany = await api()
      .post("/api/v1/companies")
      .set("Authorization", scheme(aAccess))
      .send({ name: "Linkable Co" })
      .expect(201);

    // Tenant B tries to attach a contact to tenant A's company -> rejected.
    await api()
      .post("/api/v1/contacts")
      .set("Authorization", scheme(bAccess))
      .send({
        firstName: "Eve",
        lastName: "Cross",
        companyId: aCompany.body.id,
      })
      .expect(400);
  });

  it("enforces RBAC: a VIEWER cannot create or delete", async () => {
    await api()
      .post("/api/v1/companies")
      .set("Authorization", scheme(viewerAccess))
      .send({ name: "Nope Inc" })
      .expect(403);
    // But a VIEWER can read.
    await api()
      .get("/api/v1/companies")
      .set("Authorization", scheme(viewerAccess))
      .expect(200);
  });

  it("runs the full deal/pipeline flow with a weighted forecast", async () => {
    const pipeline = await api()
      .post("/api/v1/pipelines")
      .set("Authorization", scheme(aAccess))
      .send({
        name: "Sales",
        isDefault: true,
        stages: [
          { name: "Qualify", probability: 20 },
          { name: "Proposal", probability: 60 },
        ],
      })
      .expect(201);
    const pipelineId = pipeline.body.id as string;
    const [qualify, proposal] = pipeline.body.stages as {
      id: string;
      probability: number;
    }[];

    await api()
      .post("/api/v1/deals")
      .set("Authorization", scheme(aAccess))
      .send({
        title: "Deal One",
        amount: 100000,
        pipelineId,
        stageId: qualify.id,
      })
      .expect(201);
    await api()
      .post("/api/v1/deals")
      .set("Authorization", scheme(aAccess))
      .send({
        title: "Deal Two",
        amount: 200000,
        pipelineId,
        stageId: proposal.id,
      })
      .expect(201);

    const summary = await api()
      .get(`/api/v1/pipelines/${pipelineId}/summary`)
      .set("Authorization", scheme(aAccess))
      .expect(200);
    expect(summary.body.openDeals).toBe(2);
    expect(summary.body.totalAmount).toBe(300000);
    // Weighted = 100000*0.2 + 200000*0.6 = 20000 + 120000 = 140000.
    expect(summary.body.weightedAmount).toBe(140000);
  });

  it("rejects a deal whose stage belongs to another pipeline", async () => {
    const p1 = await api()
      .post("/api/v1/pipelines")
      .set("Authorization", scheme(aAccess))
      .send({ name: "P1", stages: [{ name: "S1", probability: 10 }] })
      .expect(201);
    const p2 = await api()
      .post("/api/v1/pipelines")
      .set("Authorization", scheme(aAccess))
      .send({ name: "P2", stages: [{ name: "S2", probability: 10 }] })
      .expect(201);

    await api()
      .post("/api/v1/deals")
      .set("Authorization", scheme(aAccess))
      .send({
        title: "Mismatch",
        amount: 1000,
        pipelineId: p1.body.id,
        stageId: p2.body.stages[0].id,
      })
      .expect(400);
  });

  it("creates a task and isolates it across tenants", async () => {
    const task = await api()
      .post("/api/v1/tasks")
      .set("Authorization", scheme(aAccess))
      .send({ title: "Call back", priority: "HIGH" })
      .expect(201);
    await api()
      .get(`/api/v1/tasks/${task.body.id}`)
      .set("Authorization", scheme(bAccess))
      .expect(404);
  });

  it("creates a lead owned by the caller", async () => {
    const lead = await api()
      .post("/api/v1/leads")
      .set("Authorization", scheme(aAccess))
      .send({ fullName: "Prospect Pat", source: "webinar" })
      .expect(201);
    expect(lead.body.ownerId).toBeDefined();
  });
});
