import type { Permission, Role } from "@nexora/shared-types";

/**
 * The authenticated principal derived from a validated access token and
 * attached to the request. `tenantId` is always taken from the token — never
 * from the request body or query — which is the core of tenant isolation.
 */
export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
}

/** Claims embedded in the signed JWT access token. */
export interface AccessTokenClaims {
  sub: string;
  tenantId: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
}

/** Claims embedded in the signed JWT refresh token. */
export interface RefreshTokenClaims {
  sub: string;
  tenantId: string;
  sid: string;
}
