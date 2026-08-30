import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "../database/entities/user.entity";

export interface UserView {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: string[];
  createdAt: Date;
}

/**
 * Tenant-scoped user directory. Every query is filtered by the tenant id taken
 * from the authenticated principal, so a caller can never read or address a
 * user belonging to another tenant. This is the enforced isolation boundary.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  private toView(user: UserEntity): UserView {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      roles: (user.roles ?? []).map((r) => r.name),
      createdAt: user.createdAt,
    };
  }

  async listForTenant(tenantId: string): Promise<UserView[]> {
    const users = await this.users.find({
      where: { tenantId },
      order: { createdAt: "ASC" },
    });
    return users.map((u) => this.toView(u));
  }

  async getForTenant(tenantId: string, userId: string): Promise<UserView> {
    const user = await this.users.findOne({
      where: { id: userId, tenantId },
    });
    if (!user) {
      // 404 (not 403) so existence in other tenants is not revealed.
      throw new NotFoundException("User not found");
    }
    return this.toView(user);
  }
}
