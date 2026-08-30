import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { DEAL_STATUSES, type DealStatus } from "@nexora/shared-types";
import { IsIn, IsOptional } from "class-validator";
import { CreateDealDto } from "./create-deal.dto";

/** All create fields optional, plus status transitions (won/lost). */
export class UpdateDealDto extends PartialType(CreateDealDto) {
  @ApiPropertyOptional({ enum: DEAL_STATUSES })
  @IsOptional()
  @IsIn(DEAL_STATUSES)
  status?: DealStatus;
}
