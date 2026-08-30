import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Phase 3 CRM core schema: companies, contacts, leads, pipelines, stages,
 * deals and tasks. All tables are tenant-owned (tenant_id + created/updated
 * timestamps) with UUID PKs via pgcrypto's gen_random_uuid(), consistent with
 * the InitAuth migration. Money is stored as bigint minor units.
 */
export class CrmCore1788200000000 implements MigrationInterface {
  name = "CrmCore1788200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "domain" character varying(255),
        "industry" character varying(100),
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_companies" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_companies_tenant" ON "companies" ("tenant_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "contacts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "email" character varying(255),
        "phone" character varying(50),
        "title" character varying(120),
        "company_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_contacts" PRIMARY KEY ("id"),
        CONSTRAINT "fk_contacts_company" FOREIGN KEY ("company_id")
          REFERENCES "companies"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_contacts_tenant" ON "contacts" ("tenant_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "leads" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "full_name" character varying(150) NOT NULL,
        "email" character varying(255),
        "phone" character varying(50),
        "company" character varying(200),
        "source" character varying(100),
        "status" character varying(20) NOT NULL DEFAULT 'NEW',
        "score" integer NOT NULL DEFAULT 0,
        "owner_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_leads" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_leads_tenant" ON "leads" ("tenant_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "pipelines" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_pipelines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_pipelines_tenant" ON "pipelines" ("tenant_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "stages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "probability" integer NOT NULL DEFAULT 0,
        "pipeline_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_stages" PRIMARY KEY ("id"),
        CONSTRAINT "fk_stages_pipeline" FOREIGN KEY ("pipeline_id")
          REFERENCES "pipelines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_stages_tenant" ON "stages" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_stages_pipeline" ON "stages" ("pipeline_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "deals" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "title" character varying(200) NOT NULL,
        "amount" bigint NOT NULL DEFAULT 0,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "status" character varying(10) NOT NULL DEFAULT 'OPEN',
        "expected_close_date" date,
        "pipeline_id" uuid NOT NULL,
        "stage_id" uuid NOT NULL,
        "company_id" uuid,
        "contact_id" uuid,
        "owner_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_deals" PRIMARY KEY ("id"),
        CONSTRAINT "fk_deals_pipeline" FOREIGN KEY ("pipeline_id")
          REFERENCES "pipelines"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_deals_stage" FOREIGN KEY ("stage_id")
          REFERENCES "stages"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_deals_company" FOREIGN KEY ("company_id")
          REFERENCES "companies"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_deals_contact" FOREIGN KEY ("contact_id")
          REFERENCES "contacts"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_deals_tenant" ON "deals" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_deals_stage" ON "deals" ("stage_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "title" character varying(200) NOT NULL,
        "description" text,
        "status" character varying(15) NOT NULL DEFAULT 'OPEN',
        "priority" character varying(10) NOT NULL DEFAULT 'MEDIUM',
        "due_date" TIMESTAMP WITH TIME ZONE,
        "assignee_id" uuid,
        "related_type" character varying(20),
        "related_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_tasks" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_tenant" ON "tasks" ("tenant_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TABLE "deals"`);
    await queryRunner.query(`DROP TABLE "stages"`);
    await queryRunner.query(`DROP TABLE "pipelines"`);
    await queryRunner.query(`DROP TABLE "leads"`);
    await queryRunner.query(`DROP TABLE "contacts"`);
    await queryRunner.query(`DROP TABLE "companies"`);
  }
}
