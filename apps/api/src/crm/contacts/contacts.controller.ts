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
import { ContactsService } from "./contacts.service";
import { CreateContactDto } from "./create-contact.dto";
import { UpdateContactDto } from "./update-contact.dto";

@ApiTags("contacts")
@ApiBearerAuth()
@Controller("contacts")
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  @RequirePermissions("contact:read")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.contacts.list(user.tenantId);
  }

  @Get(":id")
  @RequirePermissions("contact:read")
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.contacts.findById(user.tenantId, id);
  }

  @Post()
  @RequirePermissions("contact:create")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContactDto,
  ) {
    return this.contacts.create(user.tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions("contact:update")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contacts.update(user.tenantId, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermissions("contact:delete")
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.contacts.remove(user.tenantId, id);
  }
}
