import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from "class-validator";

/**
 * Payload for tenant self-service registration. Creates a new tenant and its
 * first TENANT_ADMIN user in a single transaction.
 */
export class RegisterDto {
  @ApiProperty({ example: "Acme Inc" })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  tenantName!: string;

  @ApiProperty({ example: "Ada Lovelace" })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ example: "ada@acme.test" })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: "S3curePass!" })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(/[a-z]/, { message: "password must contain a lowercase letter" })
  @Matches(/[A-Z]/, { message: "password must contain an uppercase letter" })
  @Matches(/[0-9]/, { message: "password must contain a digit" })
  password!: string;
}
