export default function HomePage(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">NEXORA</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Multi-tenant AI CRM SaaS platform. Phase 1 — Foundation is in place: web, API, AI
        service, and worker each expose a health check.
      </p>
      <a
        className="text-blue-600 underline dark:text-blue-400"
        href="/api/health"
      >
        Web health check
      </a>
    </main>
  );
}
