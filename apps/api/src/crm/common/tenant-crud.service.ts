import { NotFoundException } from "@nestjs/common";
import {
  DeepPartial,
  FindOptionsOrder,
  FindOptionsWhere,
  Repository,
} from "typeorm";
import { TenantOwnedEntity } from "./tenant-owned.entity";

/**
 * Generic CRUD for tenant-owned entities. Every operation is constrained by the
 * caller's tenantId (sourced from the authenticated principal), so a tenant can
 * never read or mutate another tenant's rows. Concrete services extend this and
 * add domain-specific behaviour/validation.
 */
export abstract class TenantCrudService<T extends TenantOwnedEntity> {
  protected constructor(protected readonly repo: Repository<T>) {}

  /** Default ordering (newest first); override per entity if needed. */
  protected defaultOrder(): FindOptionsOrder<T> {
    return { createdAt: "DESC" } as FindOptionsOrder<T>;
  }

  async list(tenantId: string): Promise<T[]> {
    return this.repo.find({
      where: { tenantId } as FindOptionsWhere<T>,
      order: this.defaultOrder(),
    });
  }

  async findById(tenantId: string, id: string): Promise<T> {
    const entity = await this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<T>,
    });
    if (!entity) {
      // 404 (not 403) so the existence of the id in another tenant is hidden.
      throw new NotFoundException("Resource not found");
    }
    return entity;
  }

  async create(tenantId: string, data: DeepPartial<T>): Promise<T> {
    // tenantId is forced from context and cannot be overridden by the payload.
    const entity = this.repo.create({ ...data, tenantId } as DeepPartial<T>);
    return this.repo.save(entity);
  }

  async update(
    tenantId: string,
    id: string,
    data: DeepPartial<T>,
  ): Promise<T> {
    const entity = await this.findById(tenantId, id);
    // Never allow tenantId/id to be reassigned via the update payload.
    const { tenantId: _t, id: _i, ...safe } = data as Record<string, unknown>;
    Object.assign(entity, safe);
    return this.repo.save(entity);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const entity = await this.findById(tenantId, id);
    await this.repo.remove(entity);
  }
}
