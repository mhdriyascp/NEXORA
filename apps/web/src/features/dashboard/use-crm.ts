"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/features/auth/auth-context";

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
}

export interface Lead {
  id: string;
  fullName: string;
  status: string;
  score: number;
}

export interface Deal {
  id: string;
  title: string;
  amount: string;
  currency: string;
  status: string;
  stageId: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: { id: string; name: string; probability: number }[];
}

export interface PipelineSummary {
  pipelineId: string;
  openDeals: number;
  totalAmount: number;
  weightedAmount: number;
  stages: {
    stageId: string;
    stageName: string;
    probability: number;
    dealCount: number;
    totalAmount: number;
    weightedAmount: number;
  }[];
}

/** Generic authenticated list query bound to the current tenant's token. */
function useAuthedQuery<T>(
  key: readonly unknown[],
  path: string,
  enabled = true,
): UseQueryResult<T> {
  const { token } = useAuth();
  return useQuery<T>({
    queryKey: [...key, token],
    queryFn: () => apiFetch<T>(path, { token }),
    enabled: Boolean(token) && enabled,
  });
}

export const useCompanies = (): UseQueryResult<Company[]> =>
  useAuthedQuery<Company[]>(["companies"], "/companies");

export const useLeads = (): UseQueryResult<Lead[]> =>
  useAuthedQuery<Lead[]>(["leads"], "/leads");

export const useDeals = (): UseQueryResult<Deal[]> =>
  useAuthedQuery<Deal[]>(["deals"], "/deals");

export const useTasks = (): UseQueryResult<Task[]> =>
  useAuthedQuery<Task[]>(["tasks"], "/tasks");

export const usePipelines = (): UseQueryResult<Pipeline[]> =>
  useAuthedQuery<Pipeline[]>(["pipelines"], "/pipelines");

export function usePipelineSummary(
  pipelineId: string | undefined,
): UseQueryResult<PipelineSummary> {
  return useAuthedQuery<PipelineSummary>(
    ["pipeline-summary", pipelineId],
    `/pipelines/${pipelineId}/summary`,
    Boolean(pipelineId),
  );
}
