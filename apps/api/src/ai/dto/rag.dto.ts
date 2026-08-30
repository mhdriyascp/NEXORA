import { ApiProperty } from "@nestjs/swagger";
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class RagQueryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(8_000)
  query!: string;

  @ApiProperty({ required: false, default: 4, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;
}

export class IngestDocumentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  documentId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  text!: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
