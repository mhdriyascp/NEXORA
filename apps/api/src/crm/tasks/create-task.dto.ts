import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  PRIORITIES,
  TASK_STATUSES,
  type Priority,
  type TaskStatus,
} from "@nexora/shared-types";
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateTaskDto {
  @ApiProperty({ example: "Follow up with Acme" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: Priority;

  @ApiPropertyOptional({ example: "2026-09-15T17:00:00.000Z" })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ example: "deal" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  relatedType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedId?: string;
}
