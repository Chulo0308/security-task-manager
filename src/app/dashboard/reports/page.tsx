"use client";
import { useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";

type ReportData = {
  range: { from: string; to: string };
  totalTasks: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  overdueCount: number;
  completionRate: number;
  officerActivity: {
    userId: string;
    name: string;
    title: string;
    assigned: number;
    completed: number;
    avgResponseDays: number | null;
  }[];
  announcements: {
    total: number;
    byPriority: Record<string, number>;
    avgSeenRatePercent: number;
  };
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthAgoStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [from, setFrom] = useState(monthAgoStr());
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/summary?from=${from}&to=${to}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load report");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-[#F64F0C]" />
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="btn-brand sheen-wrap px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
          Generate report
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-3xl font-bold text-slate-900">{data.totalTasks}</div>
              <div className="text-sm text-slate-500 mt-1">Total tasks</div>
            </div>
            <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-3xl font-bold text-slate-900">{data.completionRate}%</div>
              <div className="text-sm text-slate-500 mt-1">Completion rate</div>
            </div>
            <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-3xl font-bold text-rose-600">{data.overdueCount}</div>
              <div className="text-sm text-slate-500 mt-1">Overdue</div>
            </div>
            <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-3xl font-bold text-slate-900">{data.announcements.total}</div>
              <div className="text-sm text-slate-500 mt-1">Announcements</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Officer activity</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Officer</th>
                  <th className="pb-2 font-medium">Assigned</th>
                  <th className="pb-2 font-medium">Completed</th>
                  <th className="pb-2 font-medium">Avg response</th>
                </tr>
              </thead>
              <tbody>
                {data.officerActivity.map((o) => (
                  <tr key={o.userId} className="border-b border-slate-50">
                    <td className="py-2">{o.name}</td>
                    <td className="py-2">{o.assigned}</td>
                    <td className="py-2">{o.completed}</td>
                    <td className="py-2">
                      {o.avgResponseDays === null
                        ? "—"
                        : `${o.avgResponseDays > 0 ? "+" : ""}${o.avgResponseDays} days`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
