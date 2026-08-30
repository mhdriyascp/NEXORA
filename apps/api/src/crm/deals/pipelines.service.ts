import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { DealEntity } from "../entities/deal.entity";
import { PipelineEntity } from "../entities/pipeline.entity";
import { StageEntity } from "../entities/stage.entity";
import { CreatePipelineDto } from "./create-pipeline.dto";

export interface PipelineStageSummary {
  stageId: string;
  stageName: string;
  probability: number;
  dealCount: number;
  /** Total open amount in minor units. */
  totalAmount: number;
  /** Probability-weighted amount in minor units (rounded). */
  weightedAmount: number;
}

export interface PipelineSummary {
  pipelineId: string;
  openDeals: number;
  totalAmount: number;
  weightedAmount: number;
  stages: PipelineStageSummary[];
}

@Injectable()
export class PipelinesService {
  constructor(
    @InjectRepository(PipelineEntity)
    private readonly pipelines: Repository<PipelineEntity>,
    @InjectRepository(StageEntity)
    private readonly stages: Repository<StageEntity>,
    @InjectRepository(DealEntity)
    private readonly deals: Repository<DealEntity>,
    private readonly dataSource: DataSource,
  ) {}

  list(tenantId: string): Promise<PipelineEntity[]> {
    return this.pipelines.find({
      where: { tenantId },
      relations: { stages: true },
      order: { createdAt: "ASC", stages: { sortOrder: "ASC" } },
    });
  }

  async findById(tenantId: string, id: string): Promise<PipelineEntity> {
    const pipeline = await this.pipelines.findOne({
      where: { id, tenantId },
      relations: { stages: true },
      order: { stages: { sortOrder: "ASC" } },
    });
    if (!pipeline) {
      throw new NotFoundException("Resource not found");
    }
    return pipeline;
  }

  /** Create a pipeline together with its ordered stages in one transaction. */
  async create(
    tenantId: string,
    dto: CreatePipelineDto,
  ): Promise<PipelineEntity> {
    return this.dataSource.transaction(async (manager) => {
      const pipeline = manager.create(PipelineEntity, {
        tenantId,
        name: dto.name,
        isDefault: dto.isDefault ?? false,
      });
      const saved = await manager.save(pipeline);
      const stages = dto.stages.map((stage, index) =>
        manager.create(StageEntity, {
          tenantId,
          pipelineId: saved.id,
          name: stage.name,
          probability: stage.probability,
          sortOrder: index,
        }),
      );
      saved.stages = await manager.save(stages);
      return saved;
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const pipeline = await this.findById(tenantId, id);
    await this.pipelines.remove(pipeline);
  }

  /** Weighted forecast: open deals grouped by stage with probability weighting. */
  async summary(tenantId: string, pipelineId: string): Promise<PipelineSummary> {
    const pipeline = await this.findById(tenantId, pipelineId);
    const openDeals = await this.deals.find({
      where: { tenantId, pipelineId, status: "OPEN" },
    });

    const byStage = new Map<string, PipelineStageSummary>();
    for (const stage of pipeline.stages) {
      byStage.set(stage.id, {
        stageId: stage.id,
        stageName: stage.name,
        probability: stage.probability,
        dealCount: 0,
        totalAmount: 0,
        weightedAmount: 0,
      });
    }

    let totalAmount = 0;
    let weightedAmount = 0;
    for (const deal of openDeals) {
      const bucket = byStage.get(deal.stageId);
      if (!bucket) continue;
      const amount = Number(deal.amount);
      const weighted = Math.round((amount * bucket.probability) / 100);
      bucket.dealCount += 1;
      bucket.totalAmount += amount;
      bucket.weightedAmount += weighted;
      totalAmount += amount;
      weightedAmount += weighted;
    }

    return {
      pipelineId,
      openDeals: openDeals.length,
      totalAmount,
      weightedAmount,
      stages: [...byStage.values()],
    };
  }
}
