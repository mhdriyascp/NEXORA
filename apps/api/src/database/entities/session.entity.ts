import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";

/**
 * A Session represents a single refresh-token lineage for a user. Only a hash
 * of the refresh token is stored so a database leak cannot be replayed. Tokens
 * are rotated on every refresh; `revokedAt` marks logout or rotation.
 */
@Entity({ name: "sessions" })
@Index("idx_sessions_user", ["userId"])
export class SessionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @Column({ type: "uuid", name: "tenant_id" })
  tenantId!: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: UserEntity;

  /** SHA-256 hash of the refresh token; the raw token is never persisted. */
  @Column({ type: "varchar", length: 128, name: "refresh_token_hash" })
  refreshTokenHash!: string;

  @Column({ type: "timestamptz", name: "expires_at" })
  expiresAt!: Date;

  @Column({ type: "timestamptz", name: "revoked_at", nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;
}
