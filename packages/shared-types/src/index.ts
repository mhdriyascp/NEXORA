/**
 * Shared types and contracts used across NEXORA apps (web, api, worker).
 *
 * Phase 1 seeds the cross-cutting primitives: the standard API response
 * envelope, health-check payloads, and the RBAC role/permission catalog that
 * later phases (auth, CRM, AI tools) build upon.
 */

/** Health status reported by every service's health endpoint. */
export type HealthStatus = "ok" | "degraded" | "down";

/** A single dependency check within a health report (e.g. postgres, redis). */
export interface HealthCheck {
  name: string;
  status: HealthStatus;
  detail?: string;
}

/** Standard health-check response returned by all services. */
export interface HealthResponse {
  status: HealthStatus;
  service: string;
  version: string;
  uptimeSeconds: number;
  checks?: HealthCheck[];
}

/** Metadata attached to successful list/paginated responses. */
export interface ResponseMeta {
  requestId: string;
  page?: number;
  pageSize?: number;
  total?: number;
}

/** Consistent success envelope for all API responses. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

/** Consistent error shape — never leaks stack traces, SQL, or secrets. */
export interface ApiErrorBody {
  code: string;
  message: string;
  requestId: string;
}

/** Consistent error envelope for all API responses. */
export interface ApiError {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** RBAC roles (see docs/SECURITY.md §3). */
export const ROLES = [
  "SUPER_ADMIN",
  "TENANT_ADMIN",
  "MANAGER",
  "SALES_USER",
  "SUPPORT_USER",
  "VIEWER",
] as const;

export type Role = (typeof ROLES)[number];

/** Permission catalog (see docs/SECURITY.md §3). */
export const PERMISSIONS = [
  "lead:create",
  "lead:read",
  "lead:update",
  "lead:delete",
  "contact:create",
  "contact:read",
  "contact:update",
  "contact:delete",
  "deal:create",
  "deal:read",
  "deal:update",
  "deal:delete",
  "task:create",
  "task:read",
  "task:update",
  "task:delete",
  "ai:use",
  "ai:admin",
  "report:view",
  "user:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** CRM lead lifecycle stages. */
export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "UNQUALIFIED",
  "CONVERTED",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** CRM deal outcome states (open until won/lost). */
export const DEAL_STATUSES = ["OPEN", "WON", "LOST"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

/** CRM task states. */
export const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Priority scale shared by tasks and (optionally) other CRM records. */
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];
