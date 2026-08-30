import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import type { Permission } from "@nexora/shared-types";
import type { AuthenticatedUser } from "../auth.types";
import { PermissionsGuard } from "./permissions.guard";

/**
 * Pure unit tests for the RBAC guard — no database or HTTP required, so they
 * run in CI without Postgres and document the allow/deny contract.
 */
describe("PermissionsGuard", () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  const contextFor = (
    required: Permission[] | undefined,
    user: AuthenticatedUser | undefined,
  ): ExecutionContext => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(required as Permission[]);
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
  };

  const user = (permissions: Permission[]): AuthenticatedUser => ({
    userId: "u1",
    tenantId: "t1",
    email: "u@t.test",
    roles: [],
    permissions,
  });

  it("allows when no permissions are required", () => {
    expect(guard.canActivate(contextFor(undefined, user([])))).toBe(true);
  });

  it("allows when the user holds all required permissions", () => {
    const ctx = contextFor(["user:manage"], user(["user:manage", "lead:read"]));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("denies when a required permission is missing", () => {
    const ctx = contextFor(["user:manage"], user(["lead:read"]));
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("denies when there is no authenticated principal", () => {
    const ctx = contextFor(["user:manage"], undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
