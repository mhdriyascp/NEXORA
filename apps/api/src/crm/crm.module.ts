import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompaniesController } from "./companies/companies.controller";
import { CompaniesService } from "./companies/companies.service";
import { ContactsController } from "./contacts/contacts.controller";
import { ContactsService } from "./contacts/contacts.service";
import { DealsController } from "./deals/deals.controller";
import { DealsService } from "./deals/deals.service";
import { PipelinesController } from "./deals/pipelines.controller";
import { PipelinesService } from "./deals/pipelines.service";
import { CompanyEntity } from "./entities/company.entity";
import { ContactEntity } from "./entities/contact.entity";
import { DealEntity } from "./entities/deal.entity";
import { LeadEntity } from "./entities/lead.entity";
import { PipelineEntity } from "./entities/pipeline.entity";
import { StageEntity } from "./entities/stage.entity";
import { TaskEntity } from "./entities/task.entity";
import { LeadsController } from "./leads/leads.controller";
import { LeadsService } from "./leads/leads.service";
import { TasksController } from "./tasks/tasks.controller";
import { TasksService } from "./tasks/tasks.service";

/**
 * CRM Core domain module (Phase 3). Groups all CRM aggregates — companies,
 * contacts, leads, deals/pipelines and tasks — behind tenant-scoped services.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyEntity,
      ContactEntity,
      LeadEntity,
      PipelineEntity,
      StageEntity,
      DealEntity,
      TaskEntity,
    ]),
  ],
  controllers: [
    CompaniesController,
    ContactsController,
    LeadsController,
    PipelinesController,
    DealsController,
    TasksController,
  ],
  providers: [
    CompaniesService,
    ContactsService,
    LeadsService,
    PipelinesService,
    DealsService,
    TasksService,
  ],
})
export class CrmModule {}
