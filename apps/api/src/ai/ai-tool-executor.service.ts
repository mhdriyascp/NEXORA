import { ForbiddenException, Injectable } from "@nestjs/common";
import type { Permission } from "@nexora/shared-types";
import { ContactsService } from "../crm/contacts/contacts.service";
import { TasksService } from "../crm/tasks/tasks.service";

/** A tool call planned by the AI service and executed via the CRM domain. */
export interface ToolCall {
  name: string;
  arguments: Record<string, string>;
}

export interface ToolResult {
  name: string;
  status: "executed";
  resourceId: string;
  summary: string;
}

/**
 * Executes AI-planned tool calls by invoking the CRM domain services. Every
 * tool declares the permission it requires; execution is refused unless the
 * authenticated principal holds it, and the tenantId always comes from the JWT.
 * The AI service can only *request* these actions — it never touches CRM data.
 */
@Injectable()
export class AiToolExecutor {
  constructor(
    private readonly tasks: TasksService,
    private readonly contacts: ContactsService,
  ) {}

  private readonly permissions: Record<string, Permission> = {
    create_task: "task:create",
    create_contact: "contact:create",
  };

  async execute(
    tenantId: string,
    userPermissions: Permission[],
    call: ToolCall,
  ): Promise<ToolResult> {
    const required = this.permissions[call.name];
    if (!required) {
      throw new ForbiddenException(`Unknown tool: ${call.name}`);
    }
    if (!userPermissions.includes(required)) {
      throw new ForbiddenException(
        `Missing permission '${required}' for tool '${call.name}'`,
      );
    }

    switch (call.name) {
      case "create_task":
        return this.createTask(tenantId, call.arguments);
      case "create_contact":
        return this.createContact(tenantId, call.arguments);
      default:
        throw new ForbiddenException(`Unsupported tool: ${call.name}`);
    }
  }

  private async createTask(
    tenantId: string,
    args: Record<string, string>,
  ): Promise<ToolResult> {
    const title = (args.title ?? "").trim();
    if (!title) {
      throw new ForbiddenException("create_task requires a 'title'");
    }
    const task = await this.tasks.create(tenantId, {
      title,
      description: args.description,
    });
    return {
      name: "create_task",
      status: "executed",
      resourceId: task.id,
      summary: `Created task “${task.title}”.`,
    };
  }

  private async createContact(
    tenantId: string,
    args: Record<string, string>,
  ): Promise<ToolResult> {
    const firstName = (args.firstName ?? "").trim();
    const lastName = (args.lastName ?? "").trim();
    if (!firstName || !lastName) {
      throw new ForbiddenException(
        "create_contact requires 'firstName' and 'lastName'",
      );
    }
    const contact = await this.contacts.create(tenantId, {
      firstName,
      lastName,
    });
    return {
      name: "create_contact",
      status: "executed",
      resourceId: contact.id,
      summary: `Created contact ${contact.firstName} ${contact.lastName}.`,
    };
  }
}
