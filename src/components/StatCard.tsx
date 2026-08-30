type StatCardProps = {
  label: string;
  value: string;
  sub: string;
  color: "indigo" | "blue" | "purple" | "green" | "red";
  icon: string;
};

const colorMap = {
  indigo: "bg-indigo-50 text-indigo-600",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
};

export default function StatCard({ label, value, sub, color, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xl p-2 rounded-lg ${colorMap[color]}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="text-sm font-medium text-zinc-600 mt-0.5">{label}</p>
      <p className="text-xs text-zinc-400 mt-1">{sub}</p>
    </div>
  );
}
