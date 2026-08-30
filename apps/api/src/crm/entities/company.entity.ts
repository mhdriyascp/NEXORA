import { Column, Entity, Index } from "typeorm";
import { TenantOwnedEntity } from "../common/tenant-owned.entity";

/** A Company (account) that contacts and deals can be associated with. */
@Entity({ name: "companies" })
@Index("idx_companies_tenant", ["tenantId"])
export class CompanyEntity extends TenantOwnedEntity {
  @Column({ type: "varchar", length: 200 })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  domain!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  industry!: string | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;
}
