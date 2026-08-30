import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TenantCrudService } from "../common/tenant-crud.service";
import { TaskEntity } from "../entities/task.entity";

@Injectable()
export class TasksService extends TenantCrudService<TaskEntity> {
  constructor(@InjectRepository(TaskEntity) repo: Repository<TaskEntity>) {
    super(repo);
  }
}
