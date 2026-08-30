"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/contacts", label: "Contacts", icon: "👥" },
  { href: "/deals", label: "Deals", icon: "💼" },
  { href: "/activities", label: "Activities", icon: "📅" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-zinc-900 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            N
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">NEXORA</h1>
            <p className="text-xs text-zinc-400">AI-Powered CRM</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 pt-6 border-t border-zinc-700">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 px-3">
            AI Features
          </p>
          <div className="bg-zinc-800 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 font-medium">AI Active</span>
            </div>
            <p>Lead scoring, sentiment analysis, and deal predictions running.</p>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Sales Manager</p>
            <p className="text-xs text-zinc-400 truncate">admin@nexora.ai</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
