"use client";

import { useState } from "react";
import { activities as initialActivities } from "@/lib/data";
import type { Activity, ActivityType, Sentiment } from "@/lib/types";

const typeIcons: Record<ActivityType, string> = {
  call: "📞",
  email: "📧",
  meeting: "🤝",
  task: "✅",
  note: "📝",
};

const sentimentColors: Record<Sentiment, string> = {
  positive: "text-green-600 bg-green-50",
  neutral: "text-yellow-600 bg-yellow-50",
  negative: "text-red-600 bg-red-50",
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>(
    [...initialActivities].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  );
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "call" as ActivityType,
    title: "",
    description: "",
    contactName: "",
    date: new Date().toISOString().split("T")[0],
  });

  const filtered = activities.filter((a) => {
    const matchesType = typeFilter === "all" || a.type === typeFilter;
    const matchesCompleted = showCompleted || !a.completed;
    return matchesType && matchesCompleted;
  });

  function handleToggle(id: string) {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  }

  function handleAdd() {
    const newActivity: Activity = {
      id: `a${Date.now()}`,
      type: form.type,
      title: form.title,
      description: form.description,
      contactId: "",
      contactName: form.contactName,
      date: new Date(form.date).toISOString(),
      completed: false,
    };
    setActivities((prev) => [newActivity, ...prev]);
    setShowForm(false);
    setForm({ type: "call", title: "", description: "", contactName: "", date: new Date().toISOString().split("T")[0] });
  }

  const upcoming = filtered.filter((a) => !a.completed);
  const completed = filtered.filter((a) => a.completed);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Activities</h1>
          <p className="text-zinc-500 mt-1">
            {upcoming.length} upcoming · {completed.length} completed
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Add Activity
        </button>
      </div>

      {/* Add Activity Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">New Activity</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Type</label>
                <select
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ActivityType }))}
                >
                  {(["call", "email", "meeting", "task", "note"] as ActivityType[]).map((t) => (
                    <option key={t} value={t}>{typeIcons[t]} {t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Title</label>
                <input
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Contact Name</label>
                <input
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
                <textarea
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900">Cancel</button>
              <button
                onClick={handleAdd}
                disabled={!form.title}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Add Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          className="border border-zinc-200 rounded-lg px-3 py-2 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ActivityType | "all")}
        >
          <option value="all">All Types</option>
          {(["call", "email", "meeting", "task", "note"] as ActivityType[]).map((t) => (
            <option key={t} value={t}>{typeIcons[t]} {t}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded"
          />
          Show completed
        </label>
      </div>

      {/* Upcoming Activities */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-zinc-900 mb-3">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} onToggle={handleToggle} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Activities */}
      {showCompleted && completed.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-zinc-500 mb-3">Completed</h2>
          <div className="space-y-3 opacity-75">
            {completed.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} onToggle={handleToggle} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-400">No activities found</div>
      )}
    </div>
  );
}

function ActivityRow({
  activity,
  onToggle,
}: {
  activity: Activity;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-4">
        <button
          onClick={() => onToggle(activity.id)}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            activity.completed
              ? "bg-green-500 border-green-500 text-white"
              : "border-zinc-300 hover:border-indigo-500"
          }`}
        >
          {activity.completed && <span className="text-xs">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{typeIcons[activity.type]}</span>
            <p className={`font-medium text-sm ${activity.completed ? "line-through text-zinc-400" : "text-zinc-900"}`}>
              {activity.title}
            </p>
          </div>
          {activity.description && (
            <p className="text-sm text-zinc-500 mb-2 leading-relaxed">{activity.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span>👤 {activity.contactName}</span>
            {activity.dealTitle && <span>💼 {activity.dealTitle}</span>}
            <span>📅 {new Date(activity.date).toLocaleDateString()}</span>
          </div>

          {/* AI Summary */}
          {activity.aiSummary && (
            <div className="mt-2 bg-indigo-50 rounded-lg px-3 py-2 text-xs text-indigo-700 flex items-start gap-1.5">
              <span>🤖</span>
              <span>{activity.aiSummary}</span>
            </div>
          )}
        </div>

        {activity.sentiment && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${sentimentColors[activity.sentiment]}`}>
            {activity.sentiment}
          </span>
        )}
      </div>
    </div>
  );
}
