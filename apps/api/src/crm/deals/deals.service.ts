import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TenantCrudService } from "../common/tenant-crud.service";
import { CompanyEntity } from "../entities/company.entity";
import { ContactEntity } from "../entities/contact.entity";
import { DealEntity } from "../entities/deal.entity";
import { StageEntity } from "../entities/stage.entity";
import { CreateDealDto } from "./create-deal.dto";
import { UpdateDealDto } from "./update-deal.dto";

@Injectable()
export class DealsService extends TenantCrudService<DealEntity> {
  constructor(
    @InjectRepository(DealEntity) repo: Repository<DealEntity>,
    @InjectRepository(StageEntity)
    private readonly stages: Repository<StageEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companies: Repository<CompanyEntity>,
    @InjectRepository(ContactEntity)
    private readonly contacts: Repository<ContactEntity>,
  ) {
    super(repo);
  }

  async createDeal(
    tenantId: string,
    dto: CreateDealDto,
    ownerId: string,
  ): Promise<DealEntity> {
    await this.assertStageInPipeline(tenantId, dto.pipelineId, dto.stageId);
    await this.assertRelations(tenantId, dto.companyId, dto.contactId);
    return this.create(tenantId, {
      title: dto.title,
      amount: String(dto.amount),
      currency: dto.currency ?? "USD",
      pipelineId: dto.pipelineId,
      stageId: dto.stageId,
      companyId: dto.companyId ?? null,
      contactId: dto.contactId ?? null,
      expectedCloseDate: dto.expectedCloseDate ?? null,
      ownerId,
    });
  }

  async updateDeal(
    tenantId: string,
    id: string,
    dto: UpdateDealDto,
  ): Promise<DealEntity> {
    const existing = await this.findById(tenantId, id);
    const pipelineId = dto.pipelineId ?? existing.pipelineId;
    if (dto.stageId || dto.pipelineId) {
      await this.assertStageInPipeline(
        tenantId,
        pipelineId,
        dto.stageId ?? existing.stageId,
      );
    }
    await this.assertRelations(tenantId, dto.companyId, dto.contactId);

    const patch: Partial<DealEntity> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.amount !== undefined) patch.amount = String(dto.amount);
    if (dto.currency !== undefined) patch.currency = dto.currency;
    if (dto.pipelineId !== undefined) patch.pipelineId = dto.pipelineId;
    if (dto.stageId !== undefined) patch.stageId = dto.stageId;
    if (dto.companyId !== undefined) patch.companyId = dto.companyId ?? null;
    if (dto.contactId !== undefined) patch.contactId = dto.contactId ?? null;
    if (dto.expectedCloseDate !== undefined)
      patch.expectedCloseDate = dto.expectedCloseDate ?? null;
    if (dto.status !== undefined) patch.status = dto.status;

    return this.update(tenantId, id, patch);
  }

  private async assertStageInPipeline(
    tenantId: string,
    pipelineId: string,
    stageId: string,
  ): Promise<void> {
    const stage = await this.stages.findOne({
      where: { id: stageId, tenantId, pipelineId },
    });
    if (!stage) {
      throw new BadRequestException(
        "stage does not belong to the given pipeline",
      );
    }
  }

  private async assertRelations(
    tenantId: string,
    companyId?: string,
    contactId?: string,
  ): Promise<void> {
    if (companyId) {
      const company = await this.companies.findOne({
        where: { id: companyId, tenantId },
      });
      if (!company) throw new NotFoundException("company not found");
    }
    if (contactId) {
      const contact = await this.contacts.findOne({
        where: { id: contactId, tenantId },
      });
      if (!contact) throw new NotFoundException("contact not found");
    }
  }
}
