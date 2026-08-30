import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateDealDto {
  @ApiProperty({ example: "Acme annual contract" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 1500000, description: "Amount in minor units (cents)" })
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: "USD" })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiProperty()
  @IsUUID()
  pipelineId!: string;

  @ApiProperty()
  @IsUUID()
  stageId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsISO8601()
  expectedCloseDate?: string;
}
