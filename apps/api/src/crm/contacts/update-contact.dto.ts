import { PartialType } from "@nestjs/swagger";
import { CreateContactDto } from "./create-contact.dto";

/** All fields optional for PATCH semantics. */
export class UpdateContactDto extends PartialType(CreateContactDto) {}
