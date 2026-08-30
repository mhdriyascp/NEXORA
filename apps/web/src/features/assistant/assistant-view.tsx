"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAssistant } from "./use-assistant";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  tool?: string;
}

/**
 * AI Assistant chat panel. Messages are sent to the NestJS AI gateway, which
 * plans the turn, executes any authorized CRM tool through the domain layer,
 * and returns an explainable answer (with the executed tool when applicable).
 */
export function AssistantView(): React.JSX.Element {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const assistant = useAssistant();

  const send = (): void => {
    const message = input.trim();
    if (!message || assistant.isPending) return;
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    assistant.mutate(message, {
      onSuccess: (reply) => {
        setTurns((prev) => [
          ...prev,
          {
            role: "assistant",
            content: reply.answer,
            tool: reply.executedTool?.name,
          },
        ]);
      },
      onError: (error) => {
        setTurns((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${error.message}` },
        ]);
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="mb-4 flex min-h-64 flex-col gap-3"
            aria-live="polite"
            data-testid="assistant-log"
          >
            {turns.length === 0 && (
              <p className="text-sm text-slate-500">
                Ask about your CRM, or try “create task: Follow up with Acme”.
              </p>
            )}
            {turns.map((turn, index) => (
              <div
                key={index}
                className={
                  turn.role === "user"
                    ? "self-end rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
                    : "self-start rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-900"
                }
              >
                <p>{turn.content}</p>
                {turn.tool && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Executed tool: {turn.tool}
                  </p>
                )}
              </div>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a message…"
              aria-label="Message"
              disabled={assistant.isPending}
            />
            <Button type="submit" disabled={assistant.isPending}>
              {assistant.isPending ? "…" : "Send"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
