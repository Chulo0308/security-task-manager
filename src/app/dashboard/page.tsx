"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth, useRole } from "@/components/AuthProvider";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListChecks,
  Megaphone,
  Sparkles,
  TrendingUp,
  Building2,
  Activity,
  Shield,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";

type Task = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  location: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  assigneeName: string | null;
  assigneeTitle: string | null;
  creatorName: string | null;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  priority: string;
  pinned: boolean;
  authorName: string | null;
  authorTitle: string | null;
  createdAt: string;
  expiresAt: string | null;
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-sky-50 text-sky-700 border-sky-200",
};

const ANN_PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-rose-50 border-rose-300 text-rose-900",
  urgent: "bg-amber-50 border-amber-300 text-amber-900",
  normal: "bg-white border-slate-200 text-slate-900",
};

export default function DashboardOverview() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, aRes, rRes] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/announcements", { cache: "no-store" }),
        fetch("/api/reminders", { cache: "no-store" }),
      ]);
      if (!tRes.ok || !aRes.ok) throw new Error("Failed to load data");
      const tData = await tRes.json();
      const aData = await aRes.json();
      const rData = await rRes.json();
      setTasks(tData.tasks || []);
      setAnnouncements(aData.announcements || []);
      setReminders((rData.reminders || []).filter((r: any) => new Date(r.remindAt) > new Date()).slice(0, 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const open = tasks.filter((t) => t.status === "open" || t.status === "in_progress").length;
    const overdue = tasks.filter(
      (t) =>
        t.status !== "completed" &&
        t.status !== "cancelled" &&
        t.dueAt &&
        new Date(t.dueAt) < now
    ).length;
    const today = tasks.filter(
      (t) => t.dueAt && isToday(new Date(t.dueAt)) && t.status !== "completed"
    ).length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const myOpen = tasks.filter(
      (t) => t.assigneeName !== null && (t.status === "open" || t.status === "in_progress")
    );
    // Group tasks by category
    const byCategory: Record<string, number> = {};
    tasks.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    });
    return { open, overdue, today, completed, myOpen, byCategory };
  }, [tasks]);

  const myTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "completed" && t.status !== "cancelled")
        .sort((a, b) => {
          // Critical first, then by due date
          const prio = { critical: 0, high: 1, medium: 2, low: 3 };
          const pa = prio[a.priority as keyof typeof prio] ?? 4;
          const pb = prio[b.priority as keyof typeof prio] ?? 4;
          if (pa !== pb) return pa - pb;
          if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
          if (a.dueAt) return -1;
          if (b.dueAt) return 1;
          return 0;
        })
        .slice(0, 6),
    [tasks]
  );

  const recentAnnouncements = useMemo(
    () =>
      [...announcements]
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4),
    [announcements]
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Building2 className="w-3.5 h-3.5" />
          <span>8 Bishopsgate · London</span>
          <span className="text-slate-300">·</span>
          <span>{format(new Date(), "EEEE d MMMM yyyy")}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900">
              {greeting}, {user?.name.split(" ")[0]}
            </h1>
            <p className="text-slate-500 mt-1.5">
              Here's what's happening on the floor today.
              {!loading && (
                <span className="text-indigo-600 font-medium">
                  {" "}{tasks.length} tasks and {announcements.length} announcements loaded.
                </span>
              )}
            </p>
          </div>
          {isAdmin && !loading && tasks.length === 0 && (
            <button
              onClick={async () => {
                await fetch("/api/admin/bootstrap", { method: "POST" });
                loadData();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load starter content
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Error loading data: {error}</span>
          </div>
          <button onClick={loadData} className="text-sm text-rose-700 hover:text-rose-900 underline">
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<ListChecks className="w-5 h-5" />}
          label="Open tasks"
          value={loading ? "—" : stats.open}
          accent="from-indigo-500 to-sky-500"
          description="Active across the site"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Due today"
          value={loading ? "—" : stats.today}
          accent="from-amber-500 to-orange-500"
          description="Requires attention"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Overdue"
          value={loading ? "—" : stats.overdue}
          accent="from-rose-500 to-pink-600"
          description="Escalate immediately"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Completed"
          value={loading ? "—" : stats.completed}
          accent="from-emerald-500 to-teal-600"
          description="This reporting period"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: priority tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Priority tasks
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Highest-priority work across the team right now
                </p>
              </div>
              <Link
                href="/dashboard/tasks"
                className="text-xs text-indigo-600 font-medium hover:text-indigo-700"
              >
                View all →
              </Link>
            </div>

            {loading ? (
              <LoadingRows count={5} />
            ) : myTasks.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-6 h-6" />}
                title="All clear"
                description="No open tasks at the moment. Enjoy the calm."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {myTasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </ul>
            )}
          </div>

          {/* Workload by category */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-500" />
                  Workload by category
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Where your team is spending their time
                </p>
              </div>
            </div>
            <div className="px-6 py-5">
              {loading ? (
                <LoadingRows count={4} compact />
              ) : Object.keys(stats.byCategory).length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-4">No tasks yet</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => {
                      const total = tasks.length;
                      const pct = (count / total) * 100;
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-slate-700 font-medium capitalize">
                              {cat.replace("_", " ")}
                            </span>
                            <span className="text-slate-500 text-xs">
                              {count} tasks · {Math.round(pct)}%
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: announcements */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-rose-500" />
                  Announcements
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Latest from the team</p>
              </div>
              <Link
                href="/dashboard/announcements"
                className="text-xs text-indigo-600 font-medium hover:text-indigo-700"
              >
                All →
              </Link>
            </div>
            {loading ? (
              <LoadingRows count={3} />
            ) : recentAnnouncements.length === 0 ? (
              <EmptyState
                icon={<Megaphone className="w-6 h-6" />}
                title="No announcements"
                description="Nothing to report. Check back soon."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentAnnouncements.map((a) => (
                  <li key={a.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          a.priority === "critical"
                            ? "bg-rose-100 text-rose-600"
                            : a.priority === "urgent"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-indigo-100 text-indigo-600"
                        }`}
                      >
                        {a.pinned ? (
                          <Sparkles className="w-4 h-4" />
                        ) : a.priority === "critical" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Megaphone className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-medium text-slate-900 text-sm line-clamp-2">
                            {a.title}
                          </h3>
                          {a.priority !== "normal" && (
                            <span
                              className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${
                                a.priority === "critical"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {a.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{a.body}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                          <span>{a.authorName}</span>
                          <span>·</span>
                          <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Upcoming reminders */}
          {reminders.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-violet-500" />
                  Upcoming reminders
                </h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {reminders.map((r) => (
                  <li key={r.id} className="px-6 py-3.5">
                    <div className="text-sm font-medium text-slate-900 line-clamp-1">{r.resourceTitle}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {r.resourceType === "task" ? "Task" : "Announcement"} · {format(new Date(r.remindAt), "d MMM HH:mm")}
                      {r.message ? ` · ${r.message}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Site info card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-indigo-300" />
                <span className="text-xs font-semibold tracking-wider text-indigo-300 uppercase">
                  Site Profile
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-1">8 Bishopsgate</h3>
              <p className="text-sm text-slate-300 mb-4">
                58-storey commercial tower in the heart of the City of London.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-400">Location</div>
                  <div className="text-white font-medium">Undershaft Road</div>
                </div>
                <div>
                  <div className="text-slate-400">Postcode</div>
                  <div className="text-white font-medium">EC2N 4AY</div>
                </div>
                <div>
                  <div className="text-slate-400">Floors</div>
                  <div className="text-white font-medium">58 + 4 basement</div>
                </div>
                <div>
                  <div className="text-slate-400">Security Tier</div>
                  <div className="text-white font-medium">Enhanced</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow-md`}>
          {icon}
        </div>
        <TrendingUp className="w-4 h-4 text-emerald-500" />
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div>
        <div className="text-sm font-medium text-slate-700 mt-1">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{description}</div>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const isOverdue = due && isPast(due) && task.status !== "completed" && task.status !== "cancelled";

  return (
    <li className="px-6 py-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-4">
        <div
          className={`w-1 self-stretch rounded-full flex-shrink-0 ${
            task.priority === "critical"
              ? "bg-rose-500"
              : task.priority === "high"
              ? "bg-orange-500"
              : task.priority === "medium"
              ? "bg-amber-500"
              : "bg-sky-500"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-slate-900 text-sm">{task.title}</h3>
                <span
                  className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[task.priority]}`}
                >
                  {task.priority}
                </span>
                {isOverdue && (
                  <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    overdue
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                {task.assigneeName && (
                  <span className="inline-flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-sky-400 text-white text-[9px] font-semibold flex items-center justify-center">
                      {task.assigneeName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    {task.assigneeName}
                  </span>
                )}
                {task.location && <span className="text-slate-400">📍 {task.location}</span>}
                {due && (
                  <span className={isOverdue ? "text-rose-600 font-medium" : ""}>
                    🕒 {formatDistanceToNow(due, { addSuffix: true })}
                  </span>
                )}
                <span className="text-slate-400 capitalize">• {task.category.replace("_", " ")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function LoadingRows({ count, compact = false }: { count: number; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-3" : "divide-y divide-slate-100"}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`px-6 ${compact ? "" : "py-4"} animate-pulse`}>
          <div className="flex items-start gap-4">
            {!compact && (
              <div className="w-1 self-stretch rounded-full bg-slate-200 flex-shrink-0" />
            )}
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-3/4" />
              <div className="h-2 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="inline-flex w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 items-center justify-center mb-3">
        {icon}
      </div>
      <div className="font-medium text-slate-700">{title}</div>
      <div className="text-sm text-slate-500 mt-1">{description}</div>
    </div>
  );
}
