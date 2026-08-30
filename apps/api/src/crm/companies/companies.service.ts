import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TenantCrudService } from "../common/tenant-crud.service";
import { CompanyEntity } from "../entities/company.entity";

@Injectable()
export class CompaniesService extends TenantCrudService<CompanyEntity> {
  constructor(
    @InjectRepository(CompanyEntity) repo: Repository<CompanyEntity>,
  ) {
    super(repo);
  }
}
