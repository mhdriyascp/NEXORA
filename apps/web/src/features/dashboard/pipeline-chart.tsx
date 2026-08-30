"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PipelineSummary } from "./use-crm";

/** Bar chart of open vs. probability-weighted value per pipeline stage. */
export function PipelineChart({
  summary,
}: {
  summary: PipelineSummary;
}): React.JSX.Element {
  const data = summary.stages.map((stage) => ({
    name: stage.stageName,
    total: Math.round(stage.totalAmount / 100),
    weighted: Math.round(stage.weightedAmount / 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" fontSize={12} tickLine={false} />
        <YAxis fontSize={12} tickLine={false} width={64} />
        <Tooltip
          formatter={(value: number) => `$${value.toLocaleString()}`}
          cursor={{ fill: "#f1f5f9" }}
        />
        <Bar dataKey="total" name="Open value" fill="#93c5fd" radius={[4, 4, 0, 0]} />
        <Bar
          dataKey="weighted"
          name="Weighted"
          fill="#2563eb"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
