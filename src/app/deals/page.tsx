"use client";

import { useState } from "react";
import { deals as initialDeals } from "@/lib/data";
import type { Deal, DealStage } from "@/lib/types";

const STAGES: { stage: DealStage; label: string; color: string }[] = [
  { stage: "prospecting", label: "Prospecting", color: "bg-zinc-100 border-zinc-300" },
  { stage: "qualification", label: "Qualification", color: "bg-blue-50 border-blue-200" },
  { stage: "proposal", label: "Proposal", color: "bg-purple-50 border-purple-200" },
  { stage: "negotiation", label: "Negotiation", color: "bg-yellow-50 border-yellow-200" },
  { stage: "closed_won", label: "Won ✅", color: "bg-green-50 border-green-200" },
  { stage: "closed_lost", label: "Lost ❌", color: "bg-red-50 border-red-200" },
];

function ProbabilityBadge({ prob }: { prob: number }) {
  const color = prob >= 70 ? "text-green-600 bg-green-50" : prob >= 40 ? "text-yellow-600 bg-yellow-50" : "text-red-600 bg-red-50";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${color}`}>
      {prob}%
    </span>
  );
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [selected, setSelected] = useState<Deal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    contactName: "",
    company: "",
    value: "",
    stage: "prospecting" as DealStage,
    expectedCloseDate: "",
    notes: "",
  });

  const totalPipeline = deals
    .filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost")
    .reduce((s, d) => s + d.value, 0);

  const weightedPipeline = deals
    .filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost")
    .reduce((s, d) => s + d.value * (d.aiProbability / 100), 0);

  function handleAdd() {
    const newDeal: Deal = {
      id: `d${Date.now()}`,
      title: form.title,
      contactId: "",
      contactName: form.contactName,
      company: form.company,
      value: Number(form.value) || 0,
      stage: form.stage,
      probability: 30,
      aiProbability: 30,
      expectedCloseDate: form.expectedCloseDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      notes: form.notes,
      tags: [],
    };
    setDeals((prev) => [newDeal, ...prev]);
    setShowForm(false);
    setForm({ title: "", contactName: "", company: "", value: "", stage: "prospecting", expectedCloseDate: "", notes: "" });
  }

  function handleStageChange(dealId: string, newStage: DealStage) {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId
          ? { ...d, stage: newStage }
          : d
      )
    );
    if (selected?.id === dealId) {
      setSelected((prev) => prev ? { ...prev, stage: newStage } : null);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Deals Pipeline</h1>
          <p className="text-zinc-500 mt-1">
            ${(totalPipeline / 1000).toFixed(0)}K total pipeline · ${(weightedPipeline / 1000).toFixed(0)}K AI-weighted
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Add Deal
        </button>
      </div>

      {/* Add Deal Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">New Deal</h2>
            <div className="space-y-3">
              {[
                { field: "title" as const, label: "Deal Title" },
                { field: "contactName" as const, label: "Contact Name" },
                { field: "company" as const, label: "Company" },
                { field: "value" as const, label: "Deal Value ($)" },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">{label}</label>
                  <input
                    type={field === "value" ? "number" : "text"}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Stage</label>
                <select
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  value={form.stage}
                  onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as DealStage }))}
                >
                  {STAGES.slice(0, 4).map((s) => (
                    <option key={s.stage} value={s.stage}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Expected Close Date</label>
                <input
                  type="date"
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  value={form.expectedCloseDate}
                  onChange={(e) => setForm((f) => ({ ...f, expectedCloseDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label>
                <textarea
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
                Add Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(({ stage, label, color }) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          const stageValue = stageDeals.reduce((s, d) => s + d.value, 0);

          return (
            <div key={stage} className={`min-w-56 w-56 rounded-xl border-2 ${color} p-3 shrink-0`}>
              <div className="mb-3">
                <p className="font-semibold text-sm text-zinc-800">{label}</p>
                <p className="text-xs text-zinc-500">{stageDeals.length} deals · ${(stageValue / 1000).toFixed(0)}K</p>
              </div>

              <div className="space-y-2">
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => setSelected(deal)}
                    className={`bg-white rounded-lg border border-zinc-200 p-3 cursor-pointer hover:shadow-sm transition-shadow ${
                      selected?.id === deal.id ? "ring-2 ring-indigo-500" : ""
                    }`}
                  >
                    <p className="font-medium text-xs text-zinc-900 leading-tight">{deal.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{deal.contactName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-bold text-zinc-900">${(deal.value / 1000).toFixed(0)}K</p>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-400">🤖</span>
                        <ProbabilityBadge prob={deal.aiProbability} />
                      </div>
                    </div>
                  </div>
                ))}
                {stageDeals.length === 0 && (
                  <p className="text-xs text-zinc-400 text-center py-3">Empty</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal Detail Panel */}
      {selected && (
        <div className="mt-6 bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{selected.title}</h2>
              <p className="text-zinc-500 text-sm">{selected.contactName} · {selected.company}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Value</p>
              <p className="font-bold text-xl text-zinc-900">${selected.value.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1">Stage</p>
              <select
                className="text-sm border border-zinc-200 rounded-lg px-2 py-1"
                value={selected.stage}
                onChange={(e) => handleStageChange(selected.id, e.target.value as DealStage)}
              >
                {STAGES.map((s) => (
                  <option key={s.stage} value={s.stage}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1">AI Close Probability</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-indigo-500"
                    style={{ width: `${selected.aiProbability}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{selected.aiProbability}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1">Expected Close</p>
              <p className="text-sm text-zinc-700">{new Date(selected.expectedCloseDate).toLocaleDateString()}</p>
            </div>
          </div>

          {selected.notes && (
            <div className="bg-zinc-50 rounded-lg p-3 text-sm text-zinc-600">{selected.notes}</div>
          )}

          {selected.tags.length > 0 && (
            <div className="flex gap-1 mt-3">
              {selected.tags.map((tag) => (
                <span key={tag} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
