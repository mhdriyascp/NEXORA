import { ApiProperty } from "@nestjs/swagger";
import { IsJWT, IsString } from "class-validator";

/** Payload to exchange a valid refresh token for a new token pair. */
export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsJWT()
  refreshToken!: string;
}
