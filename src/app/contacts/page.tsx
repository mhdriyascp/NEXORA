"use client";

import { useState } from "react";
import { contacts as initialContacts } from "@/lib/data";
import { activities } from "@/lib/data";
import { getNextAction } from "@/lib/ai";
import type { Contact, ContactStatus, Sentiment } from "@/lib/types";

const statusColors: Record<ContactStatus, string> = {
  lead: "bg-blue-100 text-blue-700",
  prospect: "bg-yellow-100 text-yellow-700",
  customer: "bg-green-100 text-green-700",
  churned: "bg-red-100 text-red-700",
};

const sentimentIcons: Record<Sentiment, string> = {
  positive: "😊",
  neutral: "😐",
  negative: "😟",
};

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-zinc-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium text-zinc-600 w-6">{score}</span>
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    title: "",
    status: "lead" as ContactStatus,
    notes: "",
  });

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleAdd() {
    const newContact: Contact = {
      id: `c${Date.now()}`,
      name: form.name,
      email: form.email,
      phone: form.phone,
      company: form.company,
      title: form.title,
      status: form.status,
      leadScore: 40,
      sentiment: "neutral",
      tags: [],
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      notes: form.notes,
    };
    setContacts((prev) => [newContact, ...prev]);
    setShowForm(false);
    setForm({ name: "", email: "", phone: "", company: "", title: "", status: "lead", notes: "" });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Contacts</h1>
          <p className="text-zinc-500 mt-1">{contacts.length} contacts total</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Add Contact
        </button>
      </div>

      {/* Add Contact Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">New Contact</h2>
            <div className="space-y-3">
              {(["name", "email", "phone", "company", "title"] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-zinc-600 mb-1 capitalize">
                    {field}
                  </label>
                  <input
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Status</label>
                <select
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContactStatus }))}
                >
                  {(["lead", "prospect", "customer", "churned"] as ContactStatus[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label>
                <textarea
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!form.name || !form.email}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="search"
          placeholder="Search contacts..."
          className="flex-1 border border-zinc-200 rounded-lg px-4 py-2 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border border-zinc-200 rounded-lg px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContactStatus | "all")}
        >
          <option value="all">All Statuses</option>
          {(["lead", "prospect", "customer", "churned"] as ContactStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contacts Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">AI Score</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Sentiment</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => setSelected(contact)}
                    className={`border-b border-zinc-50 cursor-pointer hover:bg-zinc-50 transition-colors ${
                      selected?.id === contact.id ? "bg-indigo-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-xs shrink-0">
                          {contact.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{contact.name}</p>
                          <p className="text-xs text-zinc-400">{contact.company}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[contact.status]}`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 w-32">
                      <ScoreBar score={contact.leadScore} />
                    </td>
                    <td className="px-4 py-3 text-base">
                      {sentimentIcons[contact.sentiment]}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-400 text-sm">
                      No contacts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="bg-white rounded-xl border border-zinc-200 p-5 h-fit">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                {selected.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">{selected.name}</h3>
                <p className="text-sm text-zinc-500">{selected.title}</p>
                <p className="text-sm text-zinc-500">{selected.company}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Email</p>
                <p className="text-zinc-700">{selected.email}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1">Phone</p>
                <p className="text-zinc-700">{selected.phone}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1">Status</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[selected.status]}`}>
                  {selected.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1">AI Lead Score</p>
                <ScoreBar score={selected.leadScore} />
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1">Sentiment</p>
                <p className="text-zinc-700 capitalize">{sentimentIcons[selected.sentiment]} {selected.sentiment}</p>
              </div>
              {selected.tags.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {selected.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selected.notes && (
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Notes</p>
                  <p className="text-zinc-700 text-xs leading-relaxed">{selected.notes}</p>
                </div>
              )}
              <div className="pt-3 border-t border-zinc-100">
                <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
                  <span>🤖</span> AI Next Action
                </p>
                <p className="text-xs text-indigo-700 bg-indigo-50 rounded-lg p-2 leading-relaxed">
                  {getNextAction(selected, activities)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
