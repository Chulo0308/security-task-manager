"use client";
import { useState, useRef } from "react";
import {
  BarChart3, Loader2, TrendingUp, Eye, Award, Megaphone, Download,
  ListChecks, CheckCircle2, AlertTriangle,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
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

const NAVY = "#1F3864";
const ORANGE = "#F64F0C";
const BRAND_COLORS = ["#F64F0C", "#1F3864", "#ff6a2b", "#2a4a80", "#fbbf24", "#94a3b8"];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function monthAgoStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}
function formatUKDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function formatUKDateNow() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function toChartData(obj: Record<string, number>) {
  return Object.entries(obj).map(([name, value]) => ({ name: titleCase(name), value }));
}

function buildExecutiveSummary(data: ReportData): string[] {
  const points: string[] = [];
  points.push(`Across the period ${formatUKDate(data.range.from)} to ${formatUKDate(data.range.to)}, ${data.totalTasks} tasks were logged with a completion rate of ${data.completionRate}%.`);
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
      <span className="text-white/50 uppercase text-[11px] tracking-wide w-24 flex-shrink-0 whitespace-nowrap">{label}:</span>
      <span className="font-medium ml-2 text-[13px]">{value}</span>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
      {icon}
      <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">{title}</h2>
    </div>
  );
}

function KpiCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="h-1" style={{ background: accent }} />
      <div className="p-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
          style={{ background: accent + "1A", color: accent }}
        >
          {icon}
        </div>
        <div className="text-3xl font-bold text-slate-900 tabular-nums leading-none">{value}</div>
        <div className="text-sm text-slate-500 mt-2.5">{label}</div>
      </div>
    </div>
  );
}

function DonutCard({ title, icon, data }: { title: string; icon?: React.ReactNode; data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-7">
      <SectionHeader title={title} icon={icon} />
      <div className="flex items-center gap-8">
        <div className="relative w-[160px] h-[160px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={3} strokeWidth={0}>
                {data.map((_, i) => (<Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{total}</div>
            <div className="text-[9px] uppercase tracking-wide text-slate-400 mt-0.5">Total</div>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: BRAND_COLORS[i % BRAND_COLORS.length] }} />
                <span className="text-slate-600 truncate">{d.name}</span>
              </span>
              <span className="font-semibold text-slate-900 tabular-nums ml-3">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
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

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const gap = 5;

      // Capture each top-level block (header, summary, KPI row, charts, tables...)
      // as its own image, so a card is never sliced across a page boundary.
      const sections = Array.from(reportRef.current.children) as HTMLElement[];
      let y = margin;
      let firstOnPage = true;

      for (const section of sections) {
        const canvas = await html2canvas(section, { scale: 2, backgroundColor: "#f8fafc" });
        const imgData = canvas.toDataURL("image/png");
        const imgHeight = (canvas.height * usableWidth) / canvas.width;

        // If this block won't fit in the remaining space, start a fresh page —
        // unless it's already the first block on the page (avoid infinite loop
        // for a single block taller than one page).
        if (!firstOnPage && y + imgHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
          firstOnPage = true;
        }

        pdf.addImage(imgData, "PNG", margin, y, usableWidth, imgHeight);
        y += imgHeight + gap;
        firstOnPage = false;
      }

      pdf.save(`8-bishopsgate-report-${from}-to-${to}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setExporting(false);
    }
  };

  const reference = data ? `RPT-${data.range.from.replace(/-/g, "")}-${data.range.to.replace(/-/g, "")}` : "";

  return (
    <div className="p-6 max-w-6xl mx-auto">
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

      {data && (
        <div ref={reportRef} className="space-y-9 animate-rise bg-slate-50 p-3">
          {/* Formal document header */}
          <div className="brand-hero rounded-2xl p-9 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-start gap-4 pb-7 mb-7 border-b border-white/15">
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center p-2.5 flex-shrink-0">
                  <img src="/logo.png" alt="8 Bishopsgate" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] tracking-[0.25em] text-white/50 uppercase font-medium">8 Bishopsgate Security Operations</div>
                  <h1 className="text-2xl font-semibold tracking-tight mt-1">Executive Security Report</h1>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
                <FieldRow label="Subject" value="Operational performance, engagement and officer activity" />
                <FieldRow label="Period" value={`${formatUKDate(data.range.from)} — ${formatUKDate(data.range.to)}`} />
                <FieldRow label="Prepared" value={formatUKDateNow()} />
                <FieldRow label="Classification" value="Internal — Management" />
              </div>
              <div className="mt-7 pt-5 border-t border-white/10 text-[11px] text-white/40 font-mono">
                Report reference: {reference}
              </div>
            </div>
          </div>

          {/* Executive summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-7">
            <SectionHeader title="Executive Summary" />
            <ul className="space-y-3.5">
              {buildExecutiveSummary(data).map((point, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-3 leading-relaxed">
                  <span className="text-[#F64F0C] font-bold flex-shrink-0">—</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard label="Total tasks" value={String(data.totalTasks)} icon={<ListChecks className="w-5 h-5" />} accent={NAVY} />
            <KpiCard label="Completion rate" value={`${data.completionRate}%`} icon={<CheckCircle2 className="w-5 h-5" />} accent={ORANGE} />
            <KpiCard label="Overdue" value={String(data.overdueCount)} icon={<AlertTriangle className="w-5 h-5" />} accent="#e11d48" />
            <KpiCard label="Announcements" value={String(data.announcements.total)} icon={<Megaphone className="w-5 h-5" />} accent="#2a4a80" />
          </div>

          {/* Donut charts */}
          <div className="grid lg:grid-cols-2 gap-5">
            <DonutCard title="Task Status Breakdown" data={toChartData(data.byStatus)} />
            <DonutCard title="Priority Breakdown" data={toChartData(data.byPriority)} />
          </div>

          {/* Officer comparison */}
          <div className="bg-white rounded-2xl border border-slate-200 p-7">
            <SectionHeader title="Officer Activity — Assigned vs Completed" icon={<TrendingUp className="w-4 h-4 text-[#F64F0C]" />} />
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.officerActivity} barGap={6} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="assigned" fill={NAVY} radius={[4, 4, 0, 0]} name="Assigned" maxBarSize={26} />
                <Bar dataKey="completed" fill={ORANGE} radius={[4, 4, 0, 0]} name="Completed" maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-5 justify-center text-xs text-slate-500">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: NAVY }} />Assigned</span>
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ORANGE }} />Completed</span>
            </div>
          </div>

          {/* Announcement classification */}
          <div className="bg-white rounded-2xl border border-slate-200 p-7">
            <SectionHeader title="Announcement Classification" icon={<Megaphone className="w-4 h-4 text-[#F64F0C]" />} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(data.announcements.byPriority).map(([priority, count]) => (
                <div key={priority} className="bg-slate-50 rounded-xl p-5 text-center">
                  <div className="text-2xl font-bold text-slate-900 tabular-nums">{count}</div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-500 mt-1.5">{titleCase(priority)}</div>
                </div>
              ))}
              <div className="bg-slate-50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-[#F64F0C] tabular-nums">{data.announcements.avgSeenRatePercent}%</div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500 mt-1.5">Avg Seen Rate</div>
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-3 text-slate-400"><Award className="w-4 h-4 text-[#F64F0C]" /><h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Best Response</h3></div>
              {data.bestResponse ? (
                <>
                  <div className="text-lg font-bold text-slate-900">{data.bestResponse.name}</div>
                  <div className="text-sm text-slate-500 mt-1">{data.bestResponse.completed} tasks completed</div>
                </>
              ) : (<div className="text-sm text-slate-400">No completions in range</div>)}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-3 text-slate-400"><Eye className="w-4 h-4 text-[#F64F0C]" /><h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Most-Seen Task</h3></div>
              {data.mostSeenTask ? (
                <>
                  <div className="text-sm font-semibold text-slate-900 line-clamp-2">{data.mostSeenTask.title}</div>
                  <div className="text-sm text-slate-500 mt-1">{data.mostSeenTask.seenCount} views</div>
                </>
              ) : (<div className="text-sm text-slate-400">No views recorded</div>)}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-3 text-slate-400"><Eye className="w-4 h-4 text-[#F64F0C]" /><h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Most-Seen Announcement</h3></div>
              {data.mostSeenAnnouncement ? (
                <>
                  <div className="text-sm font-semibold text-slate-900 line-clamp-2">{data.mostSeenAnnouncement.title}</div>
                  <div className="text-sm text-slate-500 mt-1">{data.mostSeenAnnouncement.seenCount} views</div>
                </>
              ) : (<div className="text-sm text-slate-400">No views recorded</div>)}
            </div>
          </div>

          {/* Weighted leaderboard */}
          {data.weightedRank.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <SectionHeader title="Weighted Completion Leaderboard" icon={<Award className="w-4 h-4 text-[#F64F0C]" />} />
              <p className="text-xs text-slate-400 mb-4 -mt-3">Critical tasks score higher than routine ones</p>
              <div className="space-y-2.5">
                {data.weightedRank.map((o, i) => (
                  <div key={o.userId} className="flex items-center gap-4 px-4 py-3 bg-slate-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-[#F64F0C] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{o.name}</div>
                      <div className="text-xs text-slate-500">{o.title}</div>
                    </div>
                    <div className="text-sm font-bold text-slate-900 tabular-nums">{o.weightedScore} pts</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Officer activity table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-7">
            <SectionHeader title="Officer Activity Detail" />
            <table className="w-full text-sm border-separate" style={{ borderSpacing: "0 2px" }}>
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50">
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide rounded-l-lg">Officer</th>
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide text-right">Assigned</th>
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide text-right">Completed</th>
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide text-right rounded-r-lg">Avg Response</th>
                </tr>
              </thead>
              <tbody>
                {data.officerActivity.map((o, i) => (
                  <tr key={o.userId} className={i % 2 === 1 ? "bg-slate-50/60" : ""}>
                    <td className="py-3 px-4 font-medium text-slate-800">{o.name}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{o.assigned}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{o.completed}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{o.avgResponseDays === null ? "—" : `${o.avgResponseDays > 0 ? "+" : ""}${o.avgResponseDays}d`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Officer seen activity */}
          {data.officerSeenActivity.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <SectionHeader title="Officer Engagement — Items Viewed" icon={<Eye className="w-4 h-4 text-[#F64F0C]" />} />
              <table className="w-full text-sm border-separate" style={{ borderSpacing: "0 2px" }}>
                <thead>
                  <tr className="text-left text-slate-500 bg-slate-50">
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide rounded-l-lg">Officer</th>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide text-right">Tasks Seen</th>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide text-right">Announcements Seen</th>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide text-right rounded-r-lg">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.officerSeenActivity.map((o, i) => (
                    <tr key={o.userId} className={i % 2 === 1 ? "bg-slate-50/60" : ""}>
                      <td className="py-3 px-4 font-medium text-slate-800">{o.name}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{o.tasksSeenCount}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{o.annsSeenCount}</td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums">{o.totalSeenCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-[11px] text-slate-400 pt-4 pb-2">
            8 Bishopsgate Security Operations · Confidential — Internal Distribution Only · {reference}
          </div>
        </div>
      )}
    </div>
  );
}
