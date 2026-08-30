import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { UsersService, UserView } from "./users.service";

/**
 * Tenant-scoped user endpoints. The tenant id always comes from the
 * authenticated principal (@CurrentUser), never from a path/query/body param,
 * which is what guarantees cross-tenant isolation.
 */
@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions("user:manage")
  list(@CurrentUser() user: AuthenticatedUser): Promise<UserView[]> {
    return this.usersService.listForTenant(user.tenantId);
  }

  @Get(":id")
  @RequirePermissions("user:manage")
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<UserView> {
    return this.usersService.getForTenant(user.tenantId, id);
  }
}
