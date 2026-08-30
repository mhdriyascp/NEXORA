import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class AssistantMessageDto {
  @ApiProperty({ example: "create task: Follow up with Acme" })
  @IsString()
  @MinLength(1)
  @MaxLength(8_000)
  message!: string;
}
