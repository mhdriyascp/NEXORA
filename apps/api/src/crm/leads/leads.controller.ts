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
import { CreateLeadDto } from "./create-lead.dto";
import { LeadsService } from "./leads.service";
import { UpdateLeadDto } from "./update-lead.dto";

@ApiTags("leads")
@ApiBearerAuth()
@Controller("leads")
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @RequirePermissions("lead:read")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.leads.list(user.tenantId);
  }

  @Get(":id")
  @RequirePermissions("lead:read")
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.leads.findById(user.tenantId, id);
  }

  @Post()
  @RequirePermissions("lead:create")
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLeadDto) {
    return this.leads.create(user.tenantId, { ...dto, ownerId: user.userId });
  }

  @Patch(":id")
  @RequirePermissions("lead:update")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leads.update(user.tenantId, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermissions("lead:delete")
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.leads.remove(user.tenantId, id);
  }
}
