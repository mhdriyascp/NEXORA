import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Abstract base for every tenant-owned CRM record. Provides a UUID primary key,
 * the mandatory `tenant_id` isolation column, and audit timestamps. Concrete
 * entities extend this so tenant scoping is consistent across the domain.
 */
export abstract class TenantOwnedEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "tenant_id" })
  tenantId!: string;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;
}
