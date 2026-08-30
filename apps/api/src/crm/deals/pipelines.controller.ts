import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../../auth/auth.types";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { CreatePipelineDto } from "./create-pipeline.dto";
import { PipelinesService } from "./pipelines.service";

@ApiTags("pipelines")
@ApiBearerAuth()
@Controller("pipelines")
export class PipelinesController {
  constructor(private readonly pipelines: PipelinesService) {}

  @Get()
  @RequirePermissions("deal:read")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.pipelines.list(user.tenantId);
  }

  @Get(":id")
  @RequirePermissions("deal:read")
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.pipelines.findById(user.tenantId, id);
  }

  @Get(":id/summary")
  @RequirePermissions("deal:read")
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.pipelines.summary(user.tenantId, id);
  }

  @Post()
  @RequirePermissions("deal:create")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePipelineDto,
  ) {
    return this.pipelines.create(user.tenantId, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermissions("deal:delete")
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.pipelines.remove(user.tenantId, id);
  }
}
