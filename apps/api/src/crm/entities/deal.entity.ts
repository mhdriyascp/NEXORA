import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import type { DealStatus } from "@nexora/shared-types";
import { TenantOwnedEntity } from "../common/tenant-owned.entity";
import { CompanyEntity } from "./company.entity";
import { ContactEntity } from "./contact.entity";
import { PipelineEntity } from "./pipeline.entity";
import { StageEntity } from "./stage.entity";

/** A Deal (opportunity) moving through a pipeline stage toward won/lost. */
@Entity({ name: "deals" })
@Index("idx_deals_tenant", ["tenantId"])
@Index("idx_deals_stage", ["stageId"])
export class DealEntity extends TenantOwnedEntity {
  @Column({ type: "varchar", length: 200 })
  title!: string;

  /** Monetary amount in minor units (e.g. cents) to avoid float rounding. */
  @Column({ type: "bigint", default: 0 })
  amount!: string;

  @Column({ type: "varchar", length: 3, default: "USD" })
  currency!: string;

  @Column({ type: "varchar", length: 10, default: "OPEN" })
  status!: DealStatus;

  @Column({ type: "date", name: "expected_close_date", nullable: true })
  expectedCloseDate!: string | null;

  @Column({ type: "uuid", name: "pipeline_id" })
  pipelineId!: string;

  @ManyToOne(() => PipelineEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "pipeline_id" })
  pipeline!: PipelineEntity;

  @Column({ type: "uuid", name: "stage_id" })
  stageId!: string;

  @ManyToOne(() => StageEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "stage_id" })
  stage!: StageEntity;

  @Column({ type: "uuid", name: "company_id", nullable: true })
  companyId!: string | null;

  @ManyToOne(() => CompanyEntity, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "company_id" })
  company!: CompanyEntity | null;

  @Column({ type: "uuid", name: "contact_id", nullable: true })
  contactId!: string | null;

  @ManyToOne(() => ContactEntity, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "contact_id" })
  contact!: ContactEntity | null;

  @Column({ type: "uuid", name: "owner_id", nullable: true })
  ownerId!: string | null;
}
