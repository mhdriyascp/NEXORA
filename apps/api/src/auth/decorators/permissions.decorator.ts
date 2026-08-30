import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@nexora/shared-types";

export const PERMISSIONS_KEY = "required_permissions";

/**
 * Declares the permissions required to invoke a route. The PermissionsGuard
 * enforces that the authenticated user holds *all* listed permissions.
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
