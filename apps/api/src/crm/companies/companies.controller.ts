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
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto } from "./create-company.dto";
import { UpdateCompanyDto } from "./update-company.dto";

/**
 * Companies (accounts) endpoints. Contacts uses the same permission family;
 * companies are foundational so they reuse the contact permission set.
 */
@ApiTags("companies")
@ApiBearerAuth()
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  @RequirePermissions("contact:read")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.companies.list(user.tenantId);
  }

  @Get(":id")
  @RequirePermissions("contact:read")
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.companies.findById(user.tenantId, id);
  }

  @Post()
  @RequirePermissions("contact:create")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companies.create(user.tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions("contact:update")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companies.update(user.tenantId, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermissions("contact:delete")
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.companies.remove(user.tenantId, id);
  }
}
