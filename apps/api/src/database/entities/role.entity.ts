import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { PermissionEntity } from "./permission.entity";

/**
 * A Role bundles permissions. Roles are global definitions (SUPER_ADMIN,
 * TENANT_ADMIN, MANAGER, ...) seeded from @nexora/shared-types ROLES and
 * assigned to users. Authorization is always evaluated from the effective
 * permissions of a user's roles, never from the role name alone.
 */
@Entity({ name: "roles" })
export class RoleEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  description!: string | null;

  @ManyToMany(() => PermissionEntity, { eager: true })
  @JoinTable({
    name: "role_permissions",
    joinColumn: { name: "role_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "permission_id", referencedColumnName: "id" },
  })
  permissions!: PermissionEntity[];
}
