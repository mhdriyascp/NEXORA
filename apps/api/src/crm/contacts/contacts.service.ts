import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TenantCrudService } from "../common/tenant-crud.service";
import { CompanyEntity } from "../entities/company.entity";
import { ContactEntity } from "../entities/contact.entity";

@Injectable()
export class ContactsService extends TenantCrudService<ContactEntity> {
  constructor(
    @InjectRepository(ContactEntity) repo: Repository<ContactEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companies: Repository<CompanyEntity>,
  ) {
    super(repo);
  }

  /** Ensures a referenced company belongs to the same tenant before linking. */
  private async assertCompany(
    tenantId: string,
    companyId?: string | null,
  ): Promise<void> {
    if (!companyId) return;
    const company = await this.companies.findOne({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new BadRequestException("companyId does not exist in this tenant");
    }
  }

  override async create(
    tenantId: string,
    data: Partial<ContactEntity>,
  ): Promise<ContactEntity> {
    await this.assertCompany(tenantId, data.companyId ?? null);
    return super.create(tenantId, data);
  }

  override async update(
    tenantId: string,
    id: string,
    data: Partial<ContactEntity>,
  ): Promise<ContactEntity> {
    if (data.companyId !== undefined) {
      await this.assertCompany(tenantId, data.companyId);
    }
    return super.update(tenantId, id, data);
  }
}
