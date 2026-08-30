import type { Deal, DealStage } from "@/lib/types";

const stages: { stage: DealStage; label: string }[] = [
  { stage: "prospecting", label: "Prospecting" },
  { stage: "qualification", label: "Qualification" },
  { stage: "proposal", label: "Proposal" },
  { stage: "negotiation", label: "Negotiation" },
  { stage: "closed_won", label: "Won" },
  { stage: "closed_lost", label: "Lost" },
];

export default function PipelineSummary({ deals }: { deals: Deal[] }) {
  const byStage = stages.map(({ stage, label }) => {
    const stageDeals = deals.filter((d) => d.stage === stage);
    return {
      label,
      stage,
      count: stageDeals.length,
      value: stageDeals.reduce((s, d) => s + d.value, 0),
    };
  });

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <h3 className="font-semibold text-zinc-900 mb-4">Pipeline Summary</h3>
      <div className="space-y-2">
        {byStage.map(({ label, stage, count, value }) => (
          <div key={stage} className="flex items-center justify-between text-sm">
            <span className="text-zinc-600">{label}</span>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-xs">{count} deals</span>
              <span className="font-medium text-zinc-900">
                {value > 0 ? `$${(value / 1000).toFixed(0)}K` : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
