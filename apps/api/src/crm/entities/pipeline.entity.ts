import { Column, Entity, Index, OneToMany } from "typeorm";
import { TenantOwnedEntity } from "../common/tenant-owned.entity";
import { StageEntity } from "./stage.entity";

/** A sales Pipeline groups ordered stages that deals move through. */
@Entity({ name: "pipelines" })
@Index("idx_pipelines_tenant", ["tenantId"])
export class PipelineEntity extends TenantOwnedEntity {
  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "boolean", name: "is_default", default: false })
  isDefault!: boolean;

  @OneToMany(() => StageEntity, (stage) => stage.pipeline)
  stages!: StageEntity[];
}
