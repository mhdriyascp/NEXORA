import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import type { Permission, Role } from "@nexora/shared-types";
import * as argon2 from "argon2";
import { createHash, randomUUID } from "node:crypto";
import { DataSource, Repository } from "typeorm";
import type { AppConfig } from "../config/configuration";
import { RoleEntity } from "../database/entities/role.entity";
import { SessionEntity } from "../database/entities/session.entity";
import { TenantEntity } from "../database/entities/tenant.entity";
import { UserEntity } from "../database/entities/user.entity";
import type {
  AccessTokenClaims,
  RefreshTokenClaims,
} from "./auth.types";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
}

export interface AuthResult extends AuthTokens {
  user: {
    id: string;
    tenantId: string;
    email: string;
    fullName: string;
    roles: Role[];
    permissions: Permission[];
  };
}

/**
 * Authentication service: registration (tenant + first admin), login, refresh
 * with rotation, and logout. Passwords are Argon2id hashed; refresh tokens are
 * persisted only as SHA-256 hashes and rotated on every use.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessions: Repository<SessionEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private jwtConfig(): AppConfig["jwt"] {
    return this.config.get<AppConfig["jwt"]>("jwt")!;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90);
  }

  private effectivePermissions(user: UserEntity): {
    roles: Role[];
    permissions: Permission[];
  } {
    const roles = (user.roles ?? []).map((r) => r.name as Role);
    const permissions = new Set<Permission>();
    for (const role of user.roles ?? []) {
      for (const perm of role.permissions ?? []) {
        permissions.add(perm.name as Permission);
      }
    }
    return { roles, permissions: [...permissions] };
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const baseSlug = this.slugify(dto.tenantName) || "tenant";

    const user = await this.dataSource.transaction(async (manager) => {
      // Ensure a unique slug within the transaction.
      let slug = baseSlug;
      let suffix = 0;
      while (
        await manager.getRepository(TenantEntity).findOne({ where: { slug } })
      ) {
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }

      const tenant = await manager.getRepository(TenantEntity).save(
        manager.getRepository(TenantEntity).create({
          name: dto.tenantName,
          slug,
        }),
      );

      const adminRole = await manager
        .getRepository(RoleEntity)
        .findOne({ where: { name: "TENANT_ADMIN" } });
      if (!adminRole) {
        // Seeder guarantees this exists; fail loudly if not.
        throw new Error("TENANT_ADMIN role is not seeded");
      }

      const passwordHash = await argon2.hash(dto.password, {
        type: argon2.argon2id,
      });

      return manager.getRepository(UserEntity).save(
        manager.getRepository(UserEntity).create({
          tenantId: tenant.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          fullName: dto.fullName,
          roles: [adminRole],
        }),
      );
    });

    return this.issueForUser(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const tenant = await this.dataSource
      .getRepository(TenantEntity)
      .findOne({ where: { slug: dto.tenantSlug.toLowerCase() } });
    // Uniform error to avoid leaking whether tenant/email exists.
    const invalid = new UnauthorizedException("Invalid credentials");
    if (!tenant || !tenant.isActive) {
      throw invalid;
    }

    const user = await this.users.findOne({
      where: { tenantId: tenant.id, email: dto.email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      throw invalid;
    }

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) {
      throw invalid;
    }

    return this.issueForUser(user);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const jwtConfig = this.jwtConfig();
    let claims: RefreshTokenClaims;
    try {
      claims = await this.jwt.verifyAsync<RefreshTokenClaims>(refreshToken, {
        secret: jwtConfig.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const session = await this.sessions.findOne({
      where: { id: claims.sid },
    });
    const tokenHash = this.hashToken(refreshToken);
    // Reject unknown, revoked, expired, or mismatched (rotated) tokens.
    if (
      !session ||
      session.revokedAt ||
      session.userId !== claims.sub ||
      session.tenantId !== claims.tenantId ||
      session.refreshTokenHash !== tokenHash ||
      session.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Rotate: revoke the old session, issue a fresh one.
    session.revokedAt = new Date();
    await this.sessions.save(session);

    const user = await this.users.findOne({ where: { id: claims.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    return this.issueForUser(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const jwtConfig = this.jwtConfig();
    try {
      const claims = await this.jwt.verifyAsync<RefreshTokenClaims>(
        refreshToken,
        { secret: jwtConfig.refreshSecret },
      );
      const session = await this.sessions.findOne({
        where: { id: claims.sid },
      });
      if (session && !session.revokedAt) {
        session.revokedAt = new Date();
        await this.sessions.save(session);
      }
    } catch {
      // Idempotent: logging out with an invalid token is a no-op.
    }
  }

  private async issueForUser(user: UserEntity): Promise<AuthResult> {
    // Reload with roles/permissions eagerly to compute claims.
    const fullUser =
      user.roles !== undefined
        ? user
        : await this.users.findOneOrFail({ where: { id: user.id } });
    const { roles, permissions } = this.effectivePermissions(fullUser);
    const jwtConfig = this.jwtConfig();
    const sessionId = randomUUID();

    const accessClaims: AccessTokenClaims = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles,
      permissions,
    };
    const refreshClaims: RefreshTokenClaims = {
      sub: user.id,
      tenantId: user.tenantId,
      sid: sessionId,
    };

    const accessToken = await this.jwt.signAsync(accessClaims, {
      secret: jwtConfig.accessSecret,
      expiresIn: jwtConfig.accessTtl,
    });
    const refreshToken = await this.jwt.signAsync(refreshClaims, {
      secret: jwtConfig.refreshSecret,
      expiresIn: jwtConfig.refreshTtl,
    });

    await this.sessions.save(
      this.sessions.create({
        id: sessionId,
        userId: user.id,
        tenantId: user.tenantId,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt: this.decodeExpiry(refreshToken),
      }),
    );

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        fullName: user.fullName,
        roles,
        permissions,
      },
    };
  }

  private decodeExpiry(token: string): Date {
    const decoded = this.jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      return new Date(decoded.exp * 1000);
    }
    // Fallback: 7 days from now.
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
}
