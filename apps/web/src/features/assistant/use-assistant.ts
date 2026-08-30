"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/features/auth/auth-context";

export interface ExecutedTool {
  name: string;
  status: string;
  resourceId: string;
  summary: string;
}

export interface AssistantReply {
  answer: string;
  executedTool: ExecutedTool | null;
}

/** Sends a message to the AI assistant gateway (RBAC + tenant enforced server-side). */
export function useAssistant(): ReturnType<
  typeof useMutation<AssistantReply, Error, string>
> {
  const { token } = useAuth();
  return useMutation<AssistantReply, Error, string>({
    mutationFn: (message: string) =>
      apiFetch<AssistantReply>("/ai/assistant", {
        method: "POST",
        token,
        body: { message },
      }),
  });
}
