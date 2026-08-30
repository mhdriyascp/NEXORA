import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { TenantOwnedEntity } from "../common/tenant-owned.entity";
import { CompanyEntity } from "./company.entity";

/** A Contact (person) optionally linked to a company within the tenant. */
@Entity({ name: "contacts" })
@Index("idx_contacts_tenant", ["tenantId"])
export class ContactEntity extends TenantOwnedEntity {
  @Column({ type: "varchar", length: 100, name: "first_name" })
  firstName!: string;

  @Column({ type: "varchar", length: 100, name: "last_name" })
  lastName!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  title!: string | null;

  @Column({ type: "uuid", name: "company_id", nullable: true })
  companyId!: string | null;

  @ManyToOne(() => CompanyEntity, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "company_id" })
  company!: CompanyEntity | null;
}
