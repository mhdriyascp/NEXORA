import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Permission } from "@nexora/shared-types";
import type { AuthenticatedUser } from "../auth.types";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

/**
 * Authorization guard. Enforces that the authenticated user holds every
 * permission declared via @RequirePermissions on the route. Runs after the
 * JWT guard, so the principal is already attached to the request.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException("Missing authenticated principal");
    }

    const granted = new Set(user.permissions);
    const hasAll = required.every((permission) => granted.has(permission));
    if (!hasAll) {
      throw new ForbiddenException("Insufficient permissions");
    }
    return true;
  }
}
