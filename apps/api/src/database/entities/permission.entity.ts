import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * A Permission is a fine-grained capability (e.g. "lead:create").
 * Permissions are global (not tenant-scoped); tenants grant them to users
 * through roles. The catalog is seeded from @nexora/shared-types PERMISSIONS.
 */
@Entity({ name: "permissions" })
export class PermissionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  description!: string | null;
}
