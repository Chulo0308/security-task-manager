"use client";

import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  AlarmClock,
  CheckCircle2,
  ListTodo,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type Todo = {
  id: string;
  title: string;
  done: boolean;
  dueAt: string | null;
  createdAt: string;
};

export default function TodoPage() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
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

  const open = useMemo(
    () => todos.filter((t) => !t.done).sort((a, b) => (a.dueAt || "").localeCompare(b.dueAt || "")),
    [todos]
  );
  const done = useMemo(() => todos.filter((t) => t.done), [todos]);

  return (
    <div className="max-w-[860px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="mb-6">
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

      <form onSubmit={add} className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a to-do item… (e.g. Collect radio from control room)"
          className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
        />
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </form>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <div className="text-sm text-slate-500">Loading your to-dos…</div>
        </div>
      ) : todos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
            <ListTodo className="w-7 h-7 text-indigo-500" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Nothing on your list</h3>
          <p className="text-sm text-slate-500">Add your first item above — it only takes a second.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {open.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-slate-500">
                <CheckCircle2 className="w-5 h-5 inline-block text-emerald-500 mr-2 align-middle" />
                All done — nice work.
              </div>
            )}
            {open.map((t) => {
              const overdue = t.dueAt && isPast(new Date(t.dueAt));
              return (
                <div key={t.id} className="px-5 py-3.5 flex items-center gap-3 group hover:bg-slate-50">
                  <button
                    onClick={() => toggle(t)}
                    className="w-5 h-5 rounded-md border-2 border-slate-300 hover:border-indigo-500 transition-colors flex-shrink-0"
                    title="Mark done"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{t.title}</div>
                    {t.dueAt && (
                      <div className={`text-xs mt-0.5 inline-flex items-center gap-1 ${overdue ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
                        <AlarmClock className="w-3 h-3" />
                        {overdue ? "Overdue · " : ""}
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
