import Link from "next/link";

export default function HomePage(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">NEXORA</h1>
      <p className="text-slate-600">
        Multi-tenant AI CRM SaaS platform. Sign in to your workspace to view the
        CRM dashboard, pipeline forecast, and AI assistant.
      </p>
      <div className="flex gap-4">
        <Link
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          href="/login"
        >
          Sign in
        </Link>
        <Link
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          href="/dashboard"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
