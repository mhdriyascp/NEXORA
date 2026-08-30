"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AssistantView } from "@/features/assistant/assistant-view";
import { useAuth } from "@/features/auth/auth-context";

/** Client-guarded AI assistant route: redirects to /login when unauthenticated. */
export default function AssistantPage(): React.JSX.Element {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) {
      router.replace("/login");
    }
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AssistantView />
    </main>
  );
}
