import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LEAD_STATUSES, type LeadStatus } from "@nexora/shared-types";
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateLeadDto {
  @ApiProperty({ example: "Grace Hopper" })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  fullName!: string;

  @ApiPropertyOptional({ example: "grace@navy.mil" })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @ApiPropertyOptional({ example: "webinar" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({ enum: LEAD_STATUSES })
  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: LeadStatus;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;
}
