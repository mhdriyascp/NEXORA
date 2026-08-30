import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { TenantOwnedEntity } from "../common/tenant-owned.entity";
import { PipelineEntity } from "./pipeline.entity";

/** A Stage is an ordered step within a pipeline (e.g. Qualification, Proposal). */
@Entity({ name: "stages" })
@Index("idx_stages_tenant", ["tenantId"])
@Index("idx_stages_pipeline", ["pipelineId"])
export class StageEntity extends TenantOwnedEntity {
  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "integer", name: "sort_order", default: 0 })
  sortOrder!: number;

  /** Probability (0-100) used for weighted pipeline forecasting. */
  @Column({ type: "integer", default: 0 })
  probability!: number;

  @Column({ type: "uuid", name: "pipeline_id" })
  pipelineId!: string;

  @ManyToOne(() => PipelineEntity, (pipeline) => pipeline.stages, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "pipeline_id" })
  pipeline!: PipelineEntity;
}
