import { PartialType } from "@nestjs/swagger";
import { CreateCompanyDto } from "./create-company.dto";

/** All fields optional for PATCH semantics. */
export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
