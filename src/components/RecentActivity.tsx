import type { Activity } from "@/lib/types";

const typeIcons = {
  call: "📞",
  email: "📧",
  meeting: "🤝",
  task: "✅",
  note: "📝",
};

export default function RecentActivity({ activities }: { activities: Activity[] }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <h3 className="font-semibold text-zinc-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((a) => (
          <div key={a.id} className="flex items-start gap-3">
            <span className="text-base mt-0.5">{typeIcons[a.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800 truncate">{a.title}</p>
              <p className="text-xs text-zinc-500">{a.contactName}</p>
            </div>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                a.completed
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {a.completed ? "Done" : "Open"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
