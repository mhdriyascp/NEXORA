"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { formatMoney } from "@/lib/utils";
import { PipelineChart } from "./pipeline-chart";
import {
  useCompanies,
  useDeals,
  useLeads,
  usePipelines,
  usePipelineSummary,
  useTasks,
} from "./use-crm";

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

/** Authenticated dashboard: headline CRM metrics plus a pipeline forecast. */
export function DashboardView(): React.JSX.Element {
  const { user, logout } = useAuth();
  const companies = useCompanies();
  const leads = useLeads();
  const deals = useDeals();
  const tasks = useTasks();
  const pipelines = usePipelines();

  const defaultPipeline =
    pipelines.data?.find((p) => p.isDefault) ?? pipelines.data?.[0];
  const summary = usePipelineSummary(defaultPipeline?.id);

  const openDeals =
    deals.data?.filter((d) => d.status === "OPEN").length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Signed in as {user?.fullName} · {user?.roles.join(", ")}
          </p>
        </div>
        <Button variant="outline" onClick={() => void logout()}>
          Sign out
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Companies" value={companies.data?.length ?? "—"} />
        <Metric label="Leads" value={leads.data?.length ?? "—"} />
        <Metric label="Open deals" value={openDeals} />
        <Metric label="Open tasks" value={tasks.data?.length ?? "—"} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            Pipeline forecast{defaultPipeline ? ` · ${defaultPipeline.name}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.data ? (
            <>
              <div className="mb-4 flex gap-8">
                <div>
                  <p className="text-xs text-slate-500">Open value</p>
                  <p className="text-lg font-semibold">
                    {formatMoney(summary.data.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Weighted forecast</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatMoney(summary.data.weightedAmount)}
                  </p>
                </div>
              </div>
              <PipelineChart summary={summary.data} />
            </>
          ) : (
            <p className="text-sm text-slate-500">
              {pipelines.isLoading || summary.isLoading
                ? "Loading forecast…"
                : "No pipeline data yet. Create a pipeline and deals to see a forecast."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
