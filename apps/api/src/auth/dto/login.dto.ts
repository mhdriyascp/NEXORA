import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

/**
 * Login credentials. The tenant is identified by its slug so identical emails
 * can exist across tenants without collision.
 */
export class LoginDto {
  @ApiProperty({ example: "acme-inc" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  tenantSlug!: string;

  @ApiProperty({ example: "ada@acme.test" })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: "S3curePass!" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
