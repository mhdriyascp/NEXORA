import { contacts, deals, activities, aiInsights } from "@/lib/data";
import { forecastRevenue } from "@/lib/ai";
import type { DashboardStats } from "@/lib/types";
import AIInsightCard from "@/components/AIInsightCard";
import StatCard from "@/components/StatCard";
import RecentActivity from "@/components/RecentActivity";
import PipelineSummary from "@/components/PipelineSummary";

function computeStats(): DashboardStats {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const wonDeals = deals.filter((d) => d.stage === "closed_won");
  const openDeals = deals.filter(
    (d) => d.stage !== "closed_won" && d.stage !== "closed_lost"
  );
  const newLeads = contacts.filter(
    (c) => new Date(c.createdAt) >= monthStart && c.status === "lead"
  );
  const recentActivities = activities.filter(
    (a) => new Date(a.date) >= weekStart
  );
  const lostDeals = deals.filter((d) => d.stage === "closed_lost");
  const conversionRate =
    wonDeals.length / Math.max(1, wonDeals.length + lostDeals.length) * 100;

  return {
    totalContacts: contacts.length,
    newLeadsThisMonth: newLeads.length,
    totalDealsValue: openDeals.reduce((s, d) => s + d.value, 0),
    wonDealsValue: wonDeals.reduce((s, d) => s + d.value, 0),
    openDeals: openDeals.length,
    conversionRate: Math.round(conversionRate),
    avgDealSize: Math.round(wonDeals.reduce((s, d) => s + d.value, 0) / Math.max(1, wonDeals.length)),
    activitiesThisWeek: recentActivities.length,
  };
}

export default function DashboardPage() {
  const stats = computeStats();
  const forecast = forecastRevenue(deals, 1);
  const topInsights = aiInsights.filter((i) => i.priority === "high");
  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-zinc-500 mt-1">
          AI-powered overview of your sales pipeline
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Contacts"
          value={stats.totalContacts.toString()}
          sub="All time"
          color="indigo"
          icon="👥"
        />
        <StatCard
          label="New Leads"
          value={stats.newLeadsThisMonth.toString()}
          sub="This month"
          color="blue"
          icon="🎯"
        />
        <StatCard
          label="Open Pipeline"
          value={`$${(stats.totalDealsValue / 1000).toFixed(0)}K`}
          sub={`${stats.openDeals} deals`}
          color="purple"
          icon="💼"
        />
        <StatCard
          label="Won Revenue"
          value={`$${(stats.wonDealsValue / 1000).toFixed(0)}K`}
          sub={`${stats.conversionRate}% win rate`}
          color="green"
          icon="🏆"
        />
      </div>

      {/* AI Forecast Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-5 mb-8 text-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🤖</span>
          <span className="font-semibold">AI Revenue Forecast – Next 30 Days</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-indigo-200 text-xs uppercase tracking-wide">Conservative</p>
            <p className="text-2xl font-bold">${(forecast.conservative / 1000).toFixed(0)}K</p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs uppercase tracking-wide">Expected</p>
            <p className="text-2xl font-bold">${(forecast.expected / 1000).toFixed(0)}K</p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs uppercase tracking-wide">Optimistic</p>
            <p className="text-2xl font-bold">${(forecast.optimistic / 1000).toFixed(0)}K</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insights */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <span>🤖</span> AI Insights
          </h2>
          <div className="space-y-3">
            {topInsights.map((insight) => (
              <AIInsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <PipelineSummary deals={deals} />
          <RecentActivity activities={recentActivities} />
        </div>
      </div>
    </div>
  );
}
