import { PartialType } from "@nestjs/swagger";
import { CreateTaskDto } from "./create-task.dto";

/** All fields optional for PATCH semantics. */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
