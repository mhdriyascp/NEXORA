import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../../auth/auth.types";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { CreateTaskDto } from "./create-task.dto";
import { TasksService } from "./tasks.service";
import { UpdateTaskDto } from "./update-task.dto";

@ApiTags("tasks")
@ApiBearerAuth()
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @RequirePermissions("task:read")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.tasks.list(user.tenantId);
  }

  @Get(":id")
  @RequirePermissions("task:read")
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.tasks.findById(user.tenantId, id);
  }

  @Post()
  @RequirePermissions("task:create")
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user.tenantId, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      assigneeId: dto.assigneeId ?? user.userId,
    });
  }

  @Patch(":id")
  @RequirePermissions("task:update")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const { dueDate, ...rest } = dto;
    return this.tasks.update(user.tenantId, id, {
      ...rest,
      ...(dueDate !== undefined
        ? { dueDate: dueDate ? new Date(dueDate) : null }
        : {}),
    });
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermissions("task:delete")
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.tasks.remove(user.tenantId, id);
  }
}
