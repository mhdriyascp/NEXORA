import type { AIInsight } from "@/lib/types";

const typeIcons = { alert: "⚠️", recommendation: "💡", prediction: "🔮" };
const priorityColors = {
  high: "bg-red-50 border-red-200 text-red-700",
  medium: "bg-yellow-50 border-yellow-200 text-yellow-700",
  low: "bg-blue-50 border-blue-200 text-blue-700",
};

export default function AIInsightCard({ insight }: { insight: AIInsight }) {
  return (
    <div className={`rounded-xl border p-4 ${priorityColors[insight.priority]}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{typeIcons[insight.type]}</span>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm">{insight.title}</p>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/60 font-medium capitalize">
              {insight.priority}
            </span>
          </div>
          <p className="text-sm leading-relaxed opacity-90">{insight.description}</p>
        </div>
      </div>
    </div>
  );
}
