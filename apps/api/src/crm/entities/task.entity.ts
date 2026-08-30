import { Column, Entity, Index } from "typeorm";
import type { Priority, TaskStatus } from "@nexora/shared-types";
import { TenantOwnedEntity } from "../common/tenant-owned.entity";

/**
 * A Task is a to-do that can optionally reference any CRM record via a
 * polymorphic (relatedType, relatedId) pair kept simple for Phase 3.
 */
@Entity({ name: "tasks" })
@Index("idx_tasks_tenant", ["tenantId"])
export class TaskEntity extends TenantOwnedEntity {
  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 15, default: "OPEN" })
  status!: TaskStatus;

  @Column({ type: "varchar", length: 10, default: "MEDIUM" })
  priority!: Priority;

  @Column({ type: "timestamptz", name: "due_date", nullable: true })
  dueDate!: Date | null;

  @Column({ type: "uuid", name: "assignee_id", nullable: true })
  assigneeId!: string | null;

  @Column({ type: "varchar", length: 20, name: "related_type", nullable: true })
  relatedType!: string | null;

  @Column({ type: "uuid", name: "related_id", nullable: true })
  relatedId!: string | null;
}
