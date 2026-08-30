import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TenantCrudService } from "../common/tenant-crud.service";
import { LeadEntity } from "../entities/lead.entity";

@Injectable()
export class LeadsService extends TenantCrudService<LeadEntity> {
  constructor(@InjectRepository(LeadEntity) repo: Repository<LeadEntity>) {
    super(repo);
  }
}
