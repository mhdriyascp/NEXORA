import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AppConfig } from "../../config/configuration";
import type { AccessTokenClaims, AuthenticatedUser } from "../auth.types";

/**
 * Validates the access token signature/expiry and maps its claims to the
 * AuthenticatedUser attached to the request. The tenant id originates solely
 * from the signed token.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService) {
    const jwt = config.get<AppConfig["jwt"]>("jwt");
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt?.accessSecret ?? "",
    });
  }

  validate(payload: AccessTokenClaims): AuthenticatedUser {
    if (!payload?.sub || !payload?.tenantId) {
      throw new UnauthorizedException("Malformed token");
    }
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    };
  }
}
