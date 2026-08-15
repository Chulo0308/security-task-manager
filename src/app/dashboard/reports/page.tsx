"use client";
import { useState, useRef } from "react";
import { BarChart3, Loader2, TrendingUp, Eye, Award, Megaphone, Download } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

type ReportData = {
  range: { from: string; to: string };
  totalTasks: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  overdueCount: number;
  completionRate: number;
  officerActivity: {
    userId: string; name: string; title: string;
    assigned: number; completed: number; avgResponseDays: number | null;
  }[];
  weightedRank: { userId: string; name: string; title: string; completed: number; weightedScore: number }[];
  bestResponse: { userId: string; name: string; title: string; completed: number } | null;
  announcements: { total: number; byPriority: Record<string, number>; avgSeenRatePercent: number };
  mostSeenTask: { id: string; title: string; seenCount: number } | null;
  mostSeenAnnouncement: { id: string; title: string; seenCount: number } | null;
  officerSeenActivity: { userId: string; name: string; title: string; tasksSeenCount: number; annsSeenCount: number; totalSeenCount: number }[];
};

const BRAND_COLORS = ["#F64F0C", "#1F3864", "#ff6a2b", "#2a4a80", "#fbbf24", "#94a3b8"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthAgoStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}
function toChartData(obj: Record<string, number>) {
  return Object.entries(obj).map(([name, value]) => ({ name, value }));
}

function buildExecutiveSummary(data: ReportData): string[] {
  const points: string[] = [];
  points.push(`Across the period ${data.range.from} to ${data.range.to}, ${data.totalTasks} tasks were logged with a completion rate of ${data.completionRate}%.`);
  if (data.overdueCount > 0) {
    points.push(`${data.overdueCount} task${data.overdueCount === 1 ? " is" : "s are"} currently overdue and require${data.overdueCount === 1 ? "s" : ""} immediate attention.`);
  } else {
    points.push("No tasks are currently overdue — operational tempo is on track.");
  }
  const criticalCount = data.byPriority["critical"] || 0;
  if (criticalCount > 0) {
    points.push(`${criticalCount} task${criticalCount === 1 ? " was" : "s were"} classified as critical priority during this period.`);
  }
  if (data.bestResponse) {
    points.push(`${data.bestResponse.name} led officer performance with ${data.bestResponse.completed} task${data.bestResponse.completed === 1 ? "" : "s"} completed.`);
  } else {
    points.push("No task completions were recorded in this period.");
  }
  if (data.weightedRank.length > 0) {
    const top = data.weightedRank[0];
    points.push(`On a priority-weighted basis, ${top.name} ranked highest with ${top.weightedScore} points, reflecting both volume and task difficulty.`);
  }
  points.push(`${data.announcements.total} announcement${data.announcements.total === 1 ? " was" : "s were"} issued, with an average team seen-rate of ${data.announcements.avgSeenRatePercent}%.`);
  if (data.mostSeenTask) {
    points.push(`"${data.mostSeenTask.title}" was the most-referenced task, viewed ${data.mostSeenTask.seenCount} times.`);
  }
  if (data.mostSeenAnnouncement) {
    points.push(`"${data.mostSeenAnnouncement.title}" was the most-viewed announcement, with ${data.mostSeenAnnouncement.seenCount} views.`);
  }
  if (data.officerSeenActivity.length > 0) {
    const top = data.officerSeenActivity[0];
    points.push(`${top.name} demonstrated the highest engagement, reviewing ${top.totalSeenCount} items across tasks and announcements.`);
  }
  return points;
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline">
      <span className="text-white/50 uppercase text-xs tracking-wide w-24 flex-shrink-0 whitespace-nowrap">{label}:</span>
      <span className="font-medium ml-2">{value}</span>
    </div>
  );
}

export default function ReportsPage() {
  const [from, setFrom] = useState(monthAgoStr());
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

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

  const exportPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#f8fafc" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`8-bishopsgate-report-${from}-to-${to}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toolbar — NOT captured in the PDF */}
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="w-5 h-5 text-[#F64F0C]" />
        <h1 className="text-lg font-semibold text-slate-900">Reports</h1>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus-brand" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus-brand" />
        </div>
        <button onClick={generate} disabled={loading}
          className="btn-brand sheen-wrap px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
          Generate report
        </button>
        {data && (
          <button onClick={exportPdf} disabled={exporting}
            className="btn-brand sheen-wrap px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-60 flex items-center gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Everything below IS captured in the PDF */}
      {data && (
        <div ref={reportRef} className="space-y-6 animate-rise bg-slate-50 p-1">
          {/* Formal document header */}
          <div className="brand-hero rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-4 pb-6 mb-6 border-b border-white/15">
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center p-2.5 flex-shrink-0">
                  <img src="/logo.png" alt="8 Bishopsgate" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.25em] text-white/50 uppercase font-medium">8 Bishopsgate Security Operations</div>
                  <h1 className="text-2xl font-semibold tracking-tight mt-0.5">Executive Security Report</h1>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <FieldRow label="Subject" value="Operational performance, engagement and officer activity" />
                <FieldRow label="Period" value={`${data.range.from} — ${data.range.to}`} />
                <FieldRow label="Prepared" value={new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
                <FieldRow label="Classification" value="Internal — Management" />
              </div>
            </div>
          </div>

          {/* Executive summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Executive summary</h2>
            <ul className="space-y-2">
              {buildExecutiveSummary(data).map((point, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2">
                  <span className="text-[#F64F0C] font-bold flex-shrink-0">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-3xl font-bold text-slate-900">{data.totalTasks}</div>
              <div className="text-sm text-slate-500 mt-1">Total tasks</div>
            </div>
            <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-3xl font-bold text-[#F64F0C]">{data.completionRate}%</div>
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

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Task status breakdown</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={toChartData(data.byStatus)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {toChartData(data.byStatus).map((_, i) => (<Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />))}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Priority breakdown</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={toChartData(data.byPriority)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {toChartData(data.byPriority).map((_, i) => (<Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />))}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#F64F0C]" /> Officer activity — assigned vs completed
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.officerActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip /><Legend />
                <Bar dataKey="assigned" fill="#1F3864" radius={[4, 4, 0, 0]} name="Assigned" />
                <Bar dataKey="completed" fill="#F64F0C" radius={[4, 4, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#F64F0C]" /> Announcement classification
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(data.announcements.byPriority).map(([priority, count]) => (
                <div key={priority} className="flex-1 min-w-[120px] bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">{count}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-500 mt-1">{priority}</div>
                </div>
              ))}
              <div className="flex-1 min-w-[120px] bg-slate-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#F64F0C]">{data.announcements.avgSeenRatePercent}%</div>
                <div className="text-xs uppercase tracking-wide text-slate-500 mt-1">Avg seen rate</div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-[#F64F0C]" />
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Best response</h3>
              </div>
              {data.bestResponse ? (
                <>
                  <div className="text-lg font-bold text-slate-900">{data.bestResponse.name}</div>
                  <div className="text-sm text-slate-500">{data.bestResponse.completed} tasks completed</div>
                </>
              ) : (<div className="text-sm text-slate-400">No completions in range</div>)}
            </div>
            <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-[#F64F0C]" />
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Most-seen task</h3>
              </div>
              {data.mostSeenTask ? (
                <>
                  <div className="text-sm font-semibold text-slate-900 line-clamp-2">{data.mostSeenTask.title}</div>
                  <div className="text-sm text-slate-500">{data.mostSeenTask.seenCount} views</div>
                </>
              ) : (<div className="text-sm text-slate-400">No views recorded</div>)}
            </div>
            <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-[#F64F0C]" />
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Most-seen announcement</h3>
              </div>
              {data.mostSeenAnnouncement ? (
                <>
                  <div className="text-sm font-semibold text-slate-900 line-clamp-2">{data.mostSeenAnnouncement.title}</div>
                  <div className="text-sm text-slate-500">{data.mostSeenAnnouncement.seenCount} views</div>
                </>
              ) : (<div className="text-sm text-slate-400">No views recorded</div>)}
            </div>
          </div>

          {data.weightedRank.length > 0 && (
            <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#F64F0C]" /> Weighted completion leaderboard
              </h2>
              <p className="text-xs text-slate-400 mb-3">Critical tasks score higher than routine ones</p>
              <div className="space-y-2">
                {data.weightedRank.map((o, i) => (
                  <div key={o.userId} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-[#F64F0C] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{o.name}</div>
                      <div className="text-xs text-slate-500">{o.title}</div>
                    </div>
                    <div className="text-sm font-bold text-slate-900">{o.weightedScore} pts</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Officer activity detail</h2>
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
                    <td className="py-2">{o.avgResponseDays === null ? "—" : `${o.avgResponseDays > 0 ? "+" : ""}${o.avgResponseDays} days`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.officerSeenActivity.length > 0 && (
            <div className="card-brand bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#F64F0C]" /> Officer engagement (items viewed)
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Officer</th>
                    <th className="pb-2 font-medium">Tasks seen</th>
                    <th className="pb-2 font-medium">Announcements seen</th>
                    <th className="pb-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.officerSeenActivity.map((o) => (
                    <tr key={o.userId} className="border-b border-slate-50">
                      <td className="py-2">{o.name}</td>
                      <td className="py-2">{o.tasksSeenCount}</td>
                      <td className="py-2">{o.annsSeenCount}</td>
                      <td className="py-2 font-semibold">{o.totalSeenCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
