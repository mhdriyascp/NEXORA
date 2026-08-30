import type { Permission, Role } from "@nexora/shared-types";
import { PERMISSIONS } from "@nexora/shared-types";

/**
 * Canonical mapping of roles to the permissions they grant. This is the single
 * source of truth consumed by the RBAC seeder. Authorization checks always
 * resolve a user's effective permissions from their assigned roles.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  // Platform operator — every capability including cross-cutting AI admin.
  SUPER_ADMIN: [...PERMISSIONS],
  // Full control within a single tenant.
  TENANT_ADMIN: [...PERMISSIONS],
  MANAGER: [
    "lead:create",
    "lead:read",
    "lead:update",
    "lead:delete",
    "contact:create",
    "contact:read",
    "contact:update",
    "contact:delete",
    "deal:create",
    "deal:read",
    "deal:update",
    "deal:delete",
    "task:create",
    "task:read",
    "task:update",
    "task:delete",
    "ai:use",
    "report:view",
  ],
  SALES_USER: [
    "lead:create",
    "lead:read",
    "lead:update",
    "contact:create",
    "contact:read",
    "contact:update",
    "deal:create",
    "deal:read",
    "deal:update",
    "task:create",
    "task:read",
    "task:update",
    "ai:use",
  ],
  SUPPORT_USER: [
    "contact:read",
    "lead:read",
    "deal:read",
    "task:create",
    "task:read",
    "task:update",
    "ai:use",
  ],
  VIEWER: [
    "lead:read",
    "contact:read",
    "deal:read",
    "task:read",
    "report:view",
  ],
};
