import { PartialType } from "@nestjs/swagger";
import { CreateLeadDto } from "./create-lead.dto";

/** All fields optional for PATCH semantics. */
export class UpdateLeadDto extends PartialType(CreateLeadDto) {}
