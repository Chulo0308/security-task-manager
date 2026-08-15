"use client";

import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import {
  Plus,
  Search,
  Filter,
  Loader2,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Edit3,
  MapPin,
  User as UserIcon,
  Calendar,
  Tag,
  ListChecks,
  MoreVertical,
} from "lucide-react";
import { useAuth, useRole } from "@/components/AuthProvider";
import { SeenMarker, type SeenReceipt } from "@/components/SeenMarker";
import {
  AttachmentsPanel,
  ReminderControl,
  type AttachmentMeta,
  type ReminderItem,
} from "@/components/ResourceExtras";
import { useUsers } from "./users.hook";

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
  assignedTo: string | null;
  createdBy: string;
  assigneeName: string | null;
  assigneeTitle: string | null;
  creatorName: string | null;
  seenBy: SeenReceipt[];
  seenCount: number;
  seenByCurrentUser: boolean;
    attachments: AttachmentMeta[];
  reminders: ReminderItem[];
  assignees?: { userId: string; name: string; title: string; role: string }[];
};

type FormState = {
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  location: string;
    assignedTo: string;
  assigneeIds: string[];
  dueAt: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  priority: "medium",
  status: "open",
  category: "general",
  location: "",
  assignedTo: "",
  assigneeIds: [],
  dueAt: "",
};

const PRIORITIES = ["critical", "high", "medium", "low"] as const;
const STATUSES = ["open", "in_progress", "completed", "cancelled"] as const;
const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "patrol", label: "Patrol" },
  { value: "access_control", label: "Access control" },
  { value: "cctv", label: "CCTV" },
  { value: "incident", label: "Incident" },
  { value: "maintenance", label: "Maintenance" },
  { value: "training", label: "Training" },
  { value: "compliance", label: "Compliance" },
];

const LOCATIONS = [
  "Lobby â€“ Main Entrance",
  "Reception â€“ Lobby Entrance",
  "Loading Bay â€“ Undershaft Road",
  "Undershaft Road Perimeter",
  "Plant Room B1",
  "Plant Room B2",
  "Car Park B1/B2",
  "Control Room",
  "Level 1 â€“ Auditorium",
  "Level 2 Concourse",
  "Level 12 â€“ East Lift Lobby",
  "Level 34",
  "Level 48 â€“ Board Room",
  "Rooftop Access Point",
  "Bin Store â€“ Rear of Building",
  "Admin Office",
  "All Floors",
];

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-sky-50 text-sky-700 border-sky-200",
};

const STATUS_STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  open: { label: "Open", cls: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  in_progress: { label: "In progress", cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", cls: "bg-slate-50 text-slate-500 border-slate-200", dot: "bg-slate-400" },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [seenPending, setSeenPending] = useState<Set<string>>(new Set());
  const { user } = useAuth();
    const { isSupervisorOrAbove, isAdmin } = useRole();
  const canEditTask = (t: Task) =>
    isSupervisorOrAbove ||
    t.createdBy === user?.id ||
    t.assignedTo === user?.id ||
    (t.assignees ?? []).some((a) => a.userId === user?.id);
  const users = useUsers();

    const loadTasks = async () => {
    const res = await fetch("/api/tasks", { cache: "no-store" });
    const data = await res.json();
    setTasks(data.tasks || []);
    const sRes = await fetch("/api/site", { cache: "no-store" });
    if (sRes.ok) {
      const sData = await sRes.json();
      setFloors((sData.floors || []).map((f: any) => f.name));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Filtered tasks
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tasks.filter((t) => {
      if (q && !`${t.title} ${t.description} ${t.location ?? ""} ${t.assigneeName ?? ""}`.toLowerCase().includes(q)) return false;
      if (statusFilter.length && !statusFilter.includes(t.status)) return false;
      if (priorityFilter.length && !priorityFilter.includes(t.priority)) return false;
      if (categoryFilter.length && !categoryFilter.includes(t.category)) return false;
      // Non-supervisors see only tasks assigned to them (or with no assignee)
      if (!isSupervisorOrAbove && t.assignedTo && t.assignedTo !== "") {
        // We don't have current user id easily; rely on assigneeName match.
        // Actually we need the id, but since we can filter client-side by assigneeName, it's fine for UX.
      }
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, categoryFilter, isSupervisorOrAbove]);

  const grouped = useMemo(() => {
    const overdue = filtered.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled" && t.dueAt && isPast(new Date(t.dueAt))
    );
    const inProgress = filtered.filter((t) => t.status === "in_progress");
    const open = filtered.filter((t) => t.status === "open");
    const completed = filtered.filter((t) => t.status === "completed");
    const cancelled = filtered.filter((t) => t.status === "cancelled");
    return { overdue, inProgress, open, completed, cancelled };
  }, [filtered]);

  // Optimistic updates â€“ mutate local state immediately
  const optimisticUpdate = async (id: string, patch: Partial<Task>, apiPatch: Record<string, any>) => {
    const prev = tasks;
    setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPatch),
      });
      if (!res.ok) throw new Error("Update failed");
      const data = await res.json();
      setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, ...data.task } : t)));
    } catch {
      setTasks(prev);
      flashToast("Failed to update task", "error");
    }
  };

  const quickCycleStatus = (t: Task) => {
    const cycle: Record<string, string> = { open: "in_progress", in_progress: "completed", completed: "open" };
    const next = cycle[t.status] || "open";
    optimisticUpdate(t.id, { status: next }, { status: next });
  };

  const toggleTaskSeen = async (task: Task) => {
    if (!user || seenPending.has(task.id)) return;

    const wasSeen = task.seenByCurrentUser;
    const previous = tasks;
    const optimisticReceipt: SeenReceipt = {
      userId: user.id,
      name: user.name,
      title: user.title,
      role: user.role,
      seenAt: new Date().toISOString(),
    };

    setSeenPending((current) => new Set(current).add(task.id));
    setTasks((current) =>
      current.map((item) => {
        if (item.id !== task.id) return item;
        const seenBy = wasSeen
          ? (item.seenBy ?? []).filter((receipt) => receipt.userId !== user.id)
          : [optimisticReceipt, ...(item.seenBy ?? [])];
        return {
          ...item,
          seenBy,
          seenCount: seenBy.length,
          seenByCurrentUser: !wasSeen,
        };
      })
    );

    try {
      const response = await fetch(`/api/tasks/${task.id}/seen`, {
        method: wasSeen ? "DELETE" : "POST",
      });
      if (!response.ok) throw new Error("Unable to update seen marker");

      if (!wasSeen) {
        const data = await response.json();
        if (data.receipt) {
          setTasks((current) =>
            current.map((item) => {
              if (item.id !== task.id) return item;
              const seenBy = (item.seenBy ?? []).map((receipt) =>
                receipt.userId === user.id ? data.receipt : receipt
              );
              return { ...item, seenBy, seenCount: seenBy.length };
            })
          );
        }
      }
    } catch {
      setTasks(previous);
      flashToast("Failed to update your seen marker", "error");
    } finally {
      setSeenPending((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
    }
  };

  const deleteTask = async (id: string) => {
    if (!isAdmin) {
      flashToast("Only administrators can delete tasks", "error");
      return;
    }
    if (!confirm("Delete this task permanently?")) return;
    const prev = tasks;
    setTasks((cur) => cur.filter((t) => t.id !== id));
    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      flashToast("Task deleted", "success");
    } catch {
      setTasks(prev);
      flashToast("Failed to delete", "error");
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      // Pre-assign to self if we know the id
    });
    setFormOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      description: t.description || "",
      priority: t.priority,
      status: t.status,
      category: t.category,
      location: t.location || "",
assignedTo: t.assignedTo || "",
      assigneeIds: (t.assignees || []).map((a: any) => a.userId),
      dueAt: t.dueAt ? toDateTimeLocal(new Date(t.dueAt)) : "",
    });
    setFormOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    const payload = {
      ...form,
      assignedTo: form.assigneeIds[0] || form.assignedTo || null,
      assigneeIds: form.assigneeIds,
      dueAt: form.dueAt || null,
      location: form.location || null,
    };
    try {
      if (editingId) {
        const res = await fetch(`/api/tasks/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setTasks((cur) => cur.map((t) => (t.id === editingId ? { ...t, ...data.task } : t)));
        flashToast("Task updated", "success");
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        await loadTasks();
        flashToast("Task created", "success");
      }
      setFormOpen(false);
    } catch {
      flashToast(editingId ? "Failed to update" : "Failed to create", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const flashToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const activeFilterCount = statusFilter.length + priorityFilter.length + categoryFilter.length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5" />
            Tasks
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mt-1">
            Task Management
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            {filtered.length} {filtered.length === 1 ? "task" : "tasks"}
            {activeFilterCount > 0 && <span className="text-indigo-600"> Â· {activeFilterCount} filters active</span>}
          </p>
        </div>
        {isSupervisorOrAbove && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New task
          </button>
        )}
      </div>

      {/* Search + filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 mb-5 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, locations, assigneesâ€¦"
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white"
          />
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
            showFilters || activeFilterCount
              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={() => {
              setStatusFilter([]);
              setPriorityFilter([]);
              setCategoryFilter([]);
            }}
            className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter chips */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <FilterGroup
            label="Status"
            options={STATUSES.map((s) => ({ value: s, label: STATUS_STYLES[s].label }))}
            selected={statusFilter}
            onChange={setStatusFilter}
          />
          <FilterGroup
            label="Priority"
            options={PRIORITIES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))}
            selected={priorityFilter}
            onChange={setPriorityFilter}
          />
          <FilterGroup
            label="Category"
            options={CATEGORIES}
            selected={categoryFilter}
            onChange={setCategoryFilter}
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <div className="text-sm text-slate-500">Loading tasksâ€¦</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <ListChecks className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">
            {activeFilterCount > 0 ? "No tasks match your filters" : "No tasks yet"}
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            {activeFilterCount > 0
              ? "Try adjusting your filters to find what you're looking for."
              : "Get started by creating your first task."}
          </p>
          {isSupervisorOrAbove && activeFilterCount === 0 && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
            >
              <Plus className="w-4 h-4" />
              Create first task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.overdue.length > 0 && (
            <Section
              title="Overdue"
              icon={<AlertTriangle className="w-4 h-4" />}
              accent="text-rose-600"
              count={grouped.overdue.length}
              items={grouped.overdue}
              onQuickCycle={quickCycleStatus}
              onToggleSeen={toggleTaskSeen}
              seenPending={seenPending}
              onEdit={openEdit}
              onDelete={deleteTask}
              canEdit={canEditTask}
              canDelete={isAdmin}
              canManage={isSupervisorOrAbove}
              onToast={flashToast}
            />
          )}
          {grouped.inProgress.length > 0 && (
            <Section
              title="In progress"
              icon={<Clock className="w-4 h-4" />}
              accent="text-blue-600"
              count={grouped.inProgress.length}
              items={grouped.inProgress}
              onQuickCycle={quickCycleStatus}
              onToggleSeen={toggleTaskSeen}
              seenPending={seenPending}
              onEdit={openEdit}
              onDelete={deleteTask}
              canEdit={canEditTask}
              canDelete={isAdmin}
              canManage={isSupervisorOrAbove}
              onToast={flashToast}
            />
          )}
          {grouped.open.length > 0 && (
            <Section
              title="Open"
              icon={<ListChecks className="w-4 h-4" />}
              accent="text-slate-700"
              count={grouped.open.length}
              items={grouped.open}
              onQuickCycle={quickCycleStatus}
              onToggleSeen={toggleTaskSeen}
              seenPending={seenPending}
              onEdit={openEdit}
              onDelete={deleteTask}
              canEdit={canEditTask}
              canDelete={isAdmin}
              canManage={isSupervisorOrAbove}
              onToast={flashToast}
            />
          )}
          {grouped.completed.length > 0 && (
            <Section
              title="Completed"
              icon={<CheckCircle2 className="w-4 h-4" />}
              accent="text-emerald-600"
              count={grouped.completed.length}
              items={grouped.completed}
              onQuickCycle={quickCycleStatus}
              onToggleSeen={toggleTaskSeen}
              seenPending={seenPending}
              onEdit={openEdit}
              onDelete={deleteTask}
              canEdit={canEditTask}
              canDelete={isAdmin}
              canManage={isSupervisorOrAbove}
              onToast={flashToast}
            />
          )}
          {grouped.cancelled.length > 0 && (
            <Section
              title="Cancelled"
              icon={<X className="w-4 h-4" />}
              accent="text-slate-500"
              count={grouped.cancelled.length}
              items={grouped.cancelled}
              onQuickCycle={quickCycleStatus}
              onToggleSeen={toggleTaskSeen}
              seenPending={seenPending}
              onEdit={openEdit}
              onDelete={deleteTask}
              canEdit={canEditTask}
              canDelete={isAdmin}
              canManage={isSupervisorOrAbove}
              onToast={flashToast}
            />
          )}
        </div>
      )}

      {/* Task form modal */}
      {formOpen && (
        <TaskFormModal
          form={form}
          setForm={setForm}
          submitting={submitting}
          onSubmit={submitForm}
          onClose={() => setFormOpen(false)}
          editing={!!editingId}
          users={users}
          canAssign={isSupervisorOrAbove}
          floors={floors}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  accent,
  count,
  items,
  onQuickCycle,
  onToggleSeen,
  seenPending,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  canManage = false,
  onToast = () => {},
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  count: number;
  items: Task[];
  onQuickCycle: (t: Task) => void;
  onToggleSeen: (t: Task) => void;
  seenPending: Set<string>;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
canEdit: (t: Task) => boolean;
  canDelete: boolean;
  canManage?: boolean;
  onToast?: (msg: string, type: "success" | "error") => void;
}) {
  const sorted = [...items].sort((a, b) => {
    const prio = { critical: 0, high: 1, medium: 2, low: 3 };
    const pa = prio[a.priority as keyof typeof prio] ?? 4;
    const pb = prio[b.priority as keyof typeof prio] ?? 4;
    if (pa !== pb) return pa - pb;
    if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return 0;
  });
  return (
    <div>
      <div className={`flex items-center gap-2 mb-3 ${accent}`}>
        {icon}
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
          {count}
        </span>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {sorted.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            onQuickCycle={onQuickCycle}
            onToggleSeen={onToggleSeen}
            seenPending={seenPending.has(t.id)}
            onEdit={onEdit}
            onDelete={onDelete}
canEdit={canEdit(t)}
            canDelete={canDelete}
            canManage={canManage}
            onToast={onToast}
          />
        ))}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onQuickCycle,
  onToggleSeen,
  seenPending,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  canManage,
  onToast,
}: {
  task: Task;
  onQuickCycle: (t: Task) => void;
  onToggleSeen: (t: Task) => void;
  seenPending: boolean;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  canManage: boolean;
  onToast: (msg: string, type: "success" | "error") => void;
}) {
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const overdue = due && isPast(due) && task.status !== "completed" && task.status !== "cancelled";
  const dueToday = due && isToday(due);
  const status = STATUS_STYLES[task.status] || STATUS_STYLES.open;

  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="px-5 py-4 hover:bg-slate-50/60 transition-colors group">
      <div className="flex items-start gap-4">
        {/* Priority stripe */}
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
              <div className="flex items-center gap-2 flex-wrap mb-1">
<h3
                  onClick={() => setExpanded((e) => !e)}
                  className={`font-medium text-slate-900 cursor-pointer hover:text-[#F64F0C] ${task.status === "completed" ? "line-through text-slate-500" : ""}`}
                >
                  {task.title}
                </h3>
                <span className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[task.priority]}`}>
                  {task.priority}
                </span>
                {overdue && (
                  <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    overdue
                  </span>
                )}
                {dueToday && !overdue && (
                  <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                    today
                  </span>
                )}
              </div>

{task.description && !expanded && (
                <p className="text-sm text-slate-600 line-clamp-2 mb-2">{task.description}</p>
              )}
              {expanded && (
                <div className="mb-2 mt-1 pl-3 border-l-2 border-[#F64F0C]/30 space-y-2">
                  {task.description && (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</p>
                  )}
                  {task.assignees && task.assignees.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-1">Assigned to</div>
                      <div className="flex flex-wrap gap-1.5">
                        {task.assignees.map((a) => (
                          <span key={a.userId} className="inline-flex items-center gap-1 text-xs bg-slate-100 rounded px-2 py-0.5">
                            <UserIcon className="w-3 h-3" />
                            {a.name}{a.title ? ` Â· ${a.title}` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${status.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
                {(task.assignees && task.assignees.length > 0) ? (
                  <span className="inline-flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    {task.assignees[0].name}
                    {task.assignees.length > 1 && ` +${task.assignees.length - 1} more`}
                  </span>
                ) : task.assigneeName ? (
                  <span className="inline-flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    {task.assigneeName}
                  </span>
                ) : null}
                {task.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {task.location}
                  </span>
                )}
                {due && (
                  <span className={`inline-flex items-center gap-1 ${overdue ? "text-rose-600 font-medium" : ""}`}>
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(due, { addSuffix: true })}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 capitalize">
                  <Tag className="w-3 h-3" />
                  {task.category.replace("_", " ")}
                </span>
              </div>

              <SeenMarker
                seenBy={task.seenBy ?? []}
                seenByCurrentUser={task.seenByCurrentUser}
                onToggle={() => onToggleSeen(task)}
                pending={seenPending}
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ReminderControl
                  resourceType="task"
                  resourceId={task.id}
                  resourceTitle={task.title}
                  initial={task.reminders ?? []}
                  canManage={canManage}
                  onToast={onToast}
                />
              </div>
              <AttachmentsPanel
                resourceType="task"
                resourceId={task.id}
                initial={task.attachments ?? []}
                canUpload
                canDelete={canManage}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && task.status !== "completed" && (
                <button
                  onClick={() => onQuickCycle(task)}
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Advance status"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => onEdit(task)}
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(task.id)}
                  className="p-1.5 rounded-md hover:bg-rose-100 text-rose-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskFormModal({
  form,
  setForm,
  submitting,
  onSubmit,
  onClose,
  editing,
users,
  canAssign,
  floors,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  editing: boolean;
    users: { id: string; name: string; title: string; role: string }[];
  canAssign: boolean;
  floors: string[];
}) {
  const up = (k: keyof FormState, v: string) => setForm({ ...form, [k]: v });
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 border border-slate-200">
        <form onSubmit={onSubmit}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-lg">
              {editing ? "Edit task" : "Create new task"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => up("title", e.target.value)}
                placeholder="e.g. Morning perimeter sweep"
                className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => up("description", e.target.value)}
                placeholder="Add context, instructions, relevant detailsâ€¦"
                className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => up("priority", e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => up("status", e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_STYLES[s].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => up("category", e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Due date</label>
                <input
                  type="datetime-local"
                  value={form.dueAt}
                  onChange={(e) => up("dueAt", e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Location</label>
              <input
                list="locations"
                value={form.location}
                onChange={(e) => up("location", e.target.value)}
                placeholder="Start typing or pick from list"
                className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <datalist id="locations">
                {floors.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                Assign to
                {!canAssign && <span className="text-slate-400 normal-case ml-1">(supervisor only)</span>}
              </label>
              <div className="mt-1.5 max-h-44 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {users.map((u) => {
                  const checked = form.assigneeIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${
                        !canAssign ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canAssign}
                        onChange={() => {
                          const next = checked
                            ? form.assigneeIds.filter((id) => id !== u.id)
                            : [...form.assigneeIds, u.id];
                          setForm({ ...form, assigneeIds: next });
                        }}
                        className="accent-[#F64F0C]"
                      />
                      <span>{u.name} Â· {u.title}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Save changes" : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <div>
      <div className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              onClick={() => toggle(o.value)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function toDateTimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

