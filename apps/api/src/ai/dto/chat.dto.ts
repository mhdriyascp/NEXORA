import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

const ROLES = ["system", "user", "assistant", "tool"] as const;
type ChatRole = (typeof ROLES)[number];

export class ChatMessageDto {
  @ApiProperty({ enum: ROLES })
  @IsIn(ROLES)
  role!: ChatRole;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(32_000)
  content!: string;
}

export class ChatRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];
}
