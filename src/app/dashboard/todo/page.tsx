"use client";

import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow, isPast, isToday, differenceInCalendarDays } from "date-fns";
import {
  AlarmClock,
  CheckCircle2,
  ListTodo,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
  CalendarDays,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type Todo = {
  id: string;
  title: string;
  done: boolean;
  priority: string;
  dueAt: string | null;
  createdAt: string;
};

const PRIORITIES = ["critical", "high", "medium", "low"] as const;

const PRIORITY_STYLES: Record<string, { bar: string; badge: string }> = {
  critical: { bar: "bg-rose-500", badge: "bg-rose-50 text-rose-700 border-rose-200" },
  high: { bar: "bg-orange-500", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  medium: { bar: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  low: { bar: "bg-sky-500", badge: "bg-sky-50 text-sky-700 border-sky-200" },
};

function ProgressRing({ percent }: { percent: number }) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#F64F0C"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
        {percent}%
      </div>
    </div>
  );
}

function bucketOf(t: Todo): "overdue" | "today" | "week" | "later" | "none" {
  if (!t.dueAt) return "none";
  const due = new Date(t.dueAt);
  if (isPast(due) && !isToday(due)) return "overdue";
  if (isToday(due)) return "today";
  const diff = differenceInCalendarDays(due, new Date());
  if (diff <= 6) return "week";
  return "later";
}

const BUCKETS: { key: ReturnType<typeof bucketOf>; label: string; icon: React.ReactNode; accent: string }[] = [
  { key: "overdue", label: "Overdue", icon: <AlertTriangle className="w-4 h-4" />, accent: "text-rose-600" },
  { key: "today", label: "Today", icon: <Calendar className="w-4 h-4" />, accent: "text-[#F64F0C]" },
  { key: "week", label: "This week", icon: <CalendarDays className="w-4 h-4" />, accent: "text-indigo-600" },
  { key: "later", label: "Later", icon: <CalendarDays className="w-4 h-4" />, accent: "text-slate-500" },
  { key: "none", label: "No due date", icon: <Inbox className="w-4 h-4" />, accent: "text-slate-400" },
];

export default function TodoPage() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/todos", { cache: "no-store" });
    const data = await res.json();
    setTodos(data.todos || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const optimistic: Todo = {
      id: `tmp-${Date.now()}`,
      title: title.trim(),
      done: false,
      priority,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      createdAt: new Date().toISOString(),
    };
    setTodos((cur) => [...cur, optimistic]);
    setTitle("");
    setDueAt("");
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimistic),
      });
      const data = await res.json();
      setTodos((cur) => cur.map((t) => (t.id === optimistic.id ? data.todo : t)));
    } catch {
      setTodos((cur) => cur.filter((t) => t.id !== optimistic.id));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (todo: Todo) => {
    setTodos((cur) => cur.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));
    await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !todo.done }),
    });
  };

  const remove = async (id: string) => {
    setTodos((cur) => cur.filter((t) => t.id !== id));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
  };

  const open = useMemo(() => todos.filter((t) => !t.done), [todos]);
  const done = useMemo(() => todos.filter((t) => t.done), [todos]);
  const percent = todos.length > 0 ? Math.round((done.length / todos.length) * 100) : 0;

  const grouped = useMemo(() => {
    const map: Record<string, Todo[]> = { overdue: [], today: [], week: [], later: [], none: [] };
    for (const t of open) map[bucketOf(t)].push(t);
    const prioRank = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const pr = (prioRank[a.priority] ?? 4) - (prioRank[b.priority] ?? 4);
        if (pr !== 0) return pr;
        return (a.dueAt || "").localeCompare(b.dueAt || "");
      });
    }
    return map;
  }, [open]);

  return (
    <div className="max-w-[860px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
            <ListTodo className="w-3.5 h-3.5" />
            Personal
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mt-1">
            My To-Do List
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Your private checklist{user ? `, ${user.name.split(" ")[0]}` : ""}. Only you can see these.
          </p>
        </div>
        {todos.length > 0 && (
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
            <ProgressRing percent={percent} />
            <div className="text-sm">
              <div className="font-semibold text-slate-900">{done.length} of {todos.length}</div>
              <div className="text-slate-500 text-xs">completed</div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={add} className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a to-do item… (e.g. Collect radio from control room)"
          className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F64F0C]/40 focus:bg-white"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F64F0C]/40"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F64F0C]/40"
        />
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="btn-brand sheen-wrap inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 whitespace-nowrap"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </form>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#F64F0C]" />
          <div className="text-sm text-slate-500">Loading your to-dos…</div>
        </div>
      ) : todos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
            <ListTodo className="w-7 h-7 text-[#F64F0C]" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Nothing on your list</h3>
          <p className="text-sm text-slate-500">Add your first item above — it only takes a second.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {open.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              <CheckCircle2 className="w-5 h-5 inline-block text-emerald-500 mr-2 align-middle" />
              All done — nice work.
            </div>
          )}

          {BUCKETS.map((b) => {
            const items = grouped[b.key];
            if (!items || items.length === 0) return null;
            return (
              <div key={b.key}>
                <div className={`flex items-center gap-2 mb-2 ${b.accent}`}>
                  {b.icon}
                  <h2 className="font-semibold text-sm">{b.label}</h2>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    {items.length}
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                  {items.map((t) => {
                    const style = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium;
                    return (
                      <div key={t.id} className="px-5 py-3.5 flex items-center gap-3 group hover:bg-slate-50">
                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${style.bar}`} />
                        <button
                          onClick={() => toggle(t)}
                          className="w-5 h-5 rounded-md border-2 border-slate-300 hover:border-[#F64F0C] transition-colors flex-shrink-0"
                          title="Mark done"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-sm font-medium text-slate-900">{t.title}</div>
                            <span className={`text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded border ${style.badge}`}>
                              {t.priority}
                            </span>
                          </div>
                          {t.dueAt && (
                            <div className="text-xs mt-0.5 inline-flex items-center gap-1 text-slate-500">
                              <AlarmClock className="w-3 h-3" />
                              {format(new Date(t.dueAt), "d MMM HH:mm")} · {formatDistanceToNow(new Date(t.dueAt), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => remove(t.id)}
                          className="p-1.5 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {done.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Completed · {done.length}
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 opacity-70">
                {done.map((t) => (
                  <div key={t.id} className="px-5 py-3 flex items-center gap-3 group hover:bg-slate-50">
                    <button
                      onClick={() => toggle(t)}
                      className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center flex-shrink-0"
                      title="Reopen"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </button>
                    <div className="flex-1 text-sm text-slate-500 line-through">{t.title}</div>
                    <button
                      onClick={() => remove(t.id)}
                      className="p-1.5 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
