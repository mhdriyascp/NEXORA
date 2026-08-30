import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";
import type { AuthenticatedUser } from "../auth/auth.types";

/**
 * Request-scoped tenant/user context backed by AsyncLocalStorage. It is
 * populated from the authenticated principal (never from client input) and
 * lets lower layers (repositories, services) read the active tenant without
 * threading it through every call signature.
 */
@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<AuthenticatedUser>();

  run<T>(user: AuthenticatedUser, callback: () => T): T {
    return this.als.run(user, callback);
  }

  get(): AuthenticatedUser | undefined {
    return this.als.getStore();
  }

  /** Returns the active tenant id or throws if there is no context. */
  requireTenantId(): string {
    const store = this.als.getStore();
    if (!store) {
      throw new Error("Tenant context is not available in this scope");
    }
    return store.tenantId;
  }
}
