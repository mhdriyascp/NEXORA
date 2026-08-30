"""Authorized AI tool registry and a deterministic planner.

Tools describe CRM capabilities the assistant may request (create a task, add a
contact, …). Crucially, the AI service NEVER executes these tools against the
CRM database itself — it only decides *which* tool to call and with *what*
arguments. Execution is delegated to the NestJS CRM domain layer, which
enforces RBAC and tenant isolation. This preserves the architectural rule that
the AI service must not bypass the CRM domain.

The planner is rule-based so it is fully deterministic and works offline in
tests; a function-calling LLM can augment or replace it later without changing
the tool contract or the gateway execution path.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ToolParameter:
    name: str
    type: str
    description: str
    required: bool = True


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    # Permission the caller must hold; enforced by the gateway, documented here.
    required_permission: str
    parameters: list[ToolParameter] = field(default_factory=list)


# The catalogue of tools the assistant is allowed to request.
TOOLS: list[ToolSpec] = [
    ToolSpec(
        name="create_task",
        description="Create a CRM task/reminder for the current tenant.",
        required_permission="task:create",
        parameters=[
            ToolParameter("title", "string", "Short task title."),
            ToolParameter(
                "description", "string", "Optional details.", required=False
            ),
        ],
    ),
    ToolSpec(
        name="create_contact",
        description="Create a CRM contact for the current tenant.",
        required_permission="contact:create",
        parameters=[
            ToolParameter("firstName", "string", "Contact first name."),
            ToolParameter("lastName", "string", "Contact last name."),
        ],
    ),
]

_TOOLS_BY_NAME = {tool.name: tool for tool in TOOLS}


def get_tool(name: str) -> ToolSpec | None:
    return _TOOLS_BY_NAME.get(name)


@dataclass(frozen=True)
class ToolCall:
    name: str
    arguments: dict[str, str]


# Deterministic intent patterns. Kept intentionally strict so the assistant only
# acts on an explicit instruction, never an ambiguous one.
_TASK_RE = re.compile(r"^\s*create (?:a )?task[:\s]+(?P<title>.+)$", re.IGNORECASE)
_CONTACT_RE = re.compile(
    r"^\s*(?:create|add) (?:a )?contact[:\s]+(?P<first>\S+)\s+(?P<last>\S+)\s*$",
    re.IGNORECASE,
)


def plan_tool_call(message: str) -> ToolCall | None:
    """Return a tool call if the message is an explicit CRM action, else None."""
    task_match = _TASK_RE.match(message)
    if task_match:
        return ToolCall(
            name="create_task",
            arguments={"title": task_match.group("title").strip()},
        )

    contact_match = _CONTACT_RE.match(message)
    if contact_match:
        return ToolCall(
            name="create_contact",
            arguments={
                "firstName": contact_match.group("first"),
                "lastName": contact_match.group("last"),
            },
        )

    return None
