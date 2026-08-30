import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * A Tenant is the top-level isolation boundary for the multi-tenant CRM.
 * Every tenant-owned row carries a `tenant_id` that references this table
 * (shared-schema multi-tenancy — see docs/ARCHITECTURE.md ADR-0003).
 */
@Entity({ name: "tenants" })
export class TenantEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 200 })
  name!: string;

  /** URL-safe unique identifier used for tenant lookup during login. */
  @Column({ type: "varchar", length: 100, unique: true })
  slug!: string;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;
}
