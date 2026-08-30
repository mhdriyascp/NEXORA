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
import { CreateDealDto } from "./create-deal.dto";
import { DealsService } from "./deals.service";
import { UpdateDealDto } from "./update-deal.dto";

@ApiTags("deals")
@ApiBearerAuth()
@Controller("deals")
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  @RequirePermissions("deal:read")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.deals.list(user.tenantId);
  }

  @Get(":id")
  @RequirePermissions("deal:read")
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.deals.findById(user.tenantId, id);
  }

  @Post()
  @RequirePermissions("deal:create")
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDealDto) {
    return this.deals.createDeal(user.tenantId, dto, user.userId);
  }

  @Patch(":id")
  @RequirePermissions("deal:update")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.deals.updateDeal(user.tenantId, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermissions("deal:delete")
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.deals.remove(user.tenantId, id);
  }
}
