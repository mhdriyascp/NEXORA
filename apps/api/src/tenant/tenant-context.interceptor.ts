import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import type { AuthenticatedUser } from "../auth/auth.types";
import { TenantContextService } from "./tenant-context.service";

/**
 * Populates the AsyncLocalStorage tenant context from the authenticated
 * principal for the duration of the request. Runs after the auth guard, so
 * `request.user` is already validated. Unauthenticated requests simply proceed
 * without a context.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      return next.handle();
    }
    return this.tenantContext.run(user, () => next.handle());
  }
}
