import { Column, Entity, Index } from "typeorm";
import type { LeadStatus } from "@nexora/shared-types";
import { TenantOwnedEntity } from "../common/tenant-owned.entity";

/** A Lead (unqualified/early prospect) tracked through a simple lifecycle. */
@Entity({ name: "leads" })
@Index("idx_leads_tenant", ["tenantId"])
export class LeadEntity extends TenantOwnedEntity {
  @Column({ type: "varchar", length: 150, name: "full_name" })
  fullName!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  company!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  source!: string | null;

  @Column({ type: "varchar", length: 20, default: "NEW" })
  status!: LeadStatus;

  @Column({ type: "integer", default: 0 })
  score!: number;

  @Column({ type: "uuid", name: "owner_id", nullable: true })
  ownerId!: string | null;
}
