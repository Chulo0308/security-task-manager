"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users as UsersIcon,
  Search,
  Plus,
  Edit3,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Mail,
  Phone,
  ShieldCheck,
  UserCheck,
  Monitor,
} from "lucide-react";
import { useAuth, useRole } from "@/components/AuthProvider";
import { formatDistanceToNow } from "date-fns";
import { refreshUsers } from "../tasks/users.hook";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
  phone: string | null;
  active: boolean;
  lastSeenAt: string | null;
  online: boolean;
  createdAt: string;
};

type FormState = {
  name: string;
  email: string;
  password: string;
  role: string;
  title: string;
  phone: string;
  active: boolean;
};

const EMPTY: FormState = {
  name: "",
  email: "",
  password: "",
  role: "guard",
  title: "Security Officer",
  phone: "",
  active: true,
};

const ROLES = [
  { value: "admin", label: "Administrator" },
  { value: "supervisor", label: "Supervisor" },
  { value: "operator", label: "Operator (CCTV/Control)" },
  { value: "guard", label: "Security Officer" },
];

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-rose-100 text-rose-700 border-rose-200",
  supervisor: "bg-amber-100 text-amber-700 border-amber-200",
  operator: "bg-sky-100 text-sky-700 border-sky-200",
  guard: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const { isAdmin } = useRole();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sessionsUserId, setSessionsUserId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/users", { cache: "no-store" });
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!`${u.name} ${u.email} ${u.title} ${u.phone || ""}`.toLowerCase().includes(q)) return false;
      }
      if (roleFilter.length && !roleFilter.includes(u.role)) return false;
      return true;
    });
  }, [users, search, roleFilter]);

  // Group by role
  const grouped = useMemo(() => {
    const g: Record<string, User[]> = { admin: [], supervisor: [], operator: [], guard: [] };
    filtered.forEach((u) => {
      const key = g[u.role] ? u.role : "guard";
      g[key].push(u);
    });
    return g;
  }, [filtered]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      title: u.title,
      phone: u.phone || "",
      active: u.active,
    });
    setFormOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        const res = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form }),
        });
        if (!res.ok) throw new Error();
        await load();
        refreshUsers();
        flash("Team member updated", "success");
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error((d as any).error || "Failed");
        }
        await load();
        refreshUsers();
        flash("Team member created", "success");
      }
      setFormOpen(false);
    } catch (e: any) {
      flash(e.message || "Failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (u: User) => {
    if (!isAdmin) return;
    const prev = users;
    setUsers((cur) => cur.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)));
    try {
      await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, active: !u.active }),
      });
    } catch {
      setUsers(prev);
      flash("Failed to update", "error");
    }
  };

  const flash = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.active).length,
      onShift: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      supervisors: users.filter((u) => u.role === "supervisor").length,
    };
  }, [users]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
            <UsersIcon className="w-3.5 h-3.5" />
            Team
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mt-1">
            Security Team
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Everyone protecting 8 Bishopsgate.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add team member
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MiniStat icon={<UsersIcon className="w-4 h-4" />} label="Total" value={loading ? "â€”" : stats.total} />
        <MiniStat icon={<UserCheck className="w-4 h-4" />} label="Active" value={loading ? "â€”" : stats.active} />
        <MiniStat icon={<ShieldCheck className="w-4 h-4" />} label="Supervisors" value={loading ? "â€”" : stats.supervisors} />
        <MiniStat icon={<AlertTriangle className="w-4 h-4" />} label="Admins" value={loading ? "â€”" : stats.admins} />
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 mb-5 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team membersâ€¦"
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {ROLES.map((r) => {
            const active = roleFilter.includes(r.value);
            return (
              <button
                key={r.value}
                onClick={() =>
                  setRoleFilter(active
                    ? roleFilter.filter((x) => x !== r.value)
                    : [...roleFilter, r.value])
                }
                className={`px-2.5 py-1.5 text-xs rounded-md border font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {r.label.split(" ")[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <div className="text-sm text-slate-500">Loading teamâ€¦</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <UsersIcon className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">No team members found</h3>
          <p className="text-sm text-slate-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(["admin", "supervisor", "operator", "guard"] as const).map((role) => {
            const list = grouped[role];
            if (!list || list.length === 0) return null;
            const label = ROLES.find((r) => r.value === role)?.label || role;
            return (
              <div key={role}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded border ${ROLE_STYLES[role]}`}>
                    {label}
                  </span>
                  <span className="text-xs text-slate-500">Â· {list.length} members</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((u) => (
                    <UserCard
                      key={u.id}
                      u={u}
                      isMe={u.id === me?.id}
                      isAdmin={isAdmin}
                      onEdit={() => openEdit(u)}
                      onToggleActive={() => toggleActive(u)}
                      onViewSessions={() => setSessionsUserId(u.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sessionsUserId && isAdmin && (
        <UserSessionsPanel userId={sessionsUserId} onClose={() => setSessionsUserId(null)} />
      )}
      {/* Form modal */}
      {formOpen && isAdmin && (
        <UserFormModal
          form={form}
          setForm={setForm}
          submitting={submitting}
          onSubmit={submitForm}
          onClose={() => setFormOpen(false)}
          editing={!!editingId}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2 ${
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

function UserCard({
  u,
  isMe,
  isAdmin,
  onEdit,
  onToggleActive,
  onViewSessions,
}: {
  u: User;
  isMe: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onViewSessions: () => void;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow ${!u.active ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 truncate">{u.name}</h3>
            {isMe && (
              <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                you
              </span>
            )}
            {!u.active && (
              <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                inactive
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-0.5">{u.title}</p>
          {u.lastSeenAt && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium">
              <span
                className={`w-1.5 h-1.5 rounded-full ${u.online ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}
              />
              <span className={u.online ? "text-emerald-600" : "text-slate-400"}>
                {u.online
                  ? "Online now"
                  : `Last seen ${formatDistanceToNow(new Date(u.lastSeenAt), { addSuffix: true })}`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded border ${ROLE_STYLES[u.role] || ROLE_STYLES.guard}`}>
              {ROLES.find((r) => r.value === u.role)?.label.split(" ")[0]}
            </span>
          </div>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="w-3 h-3" />
              <span className="truncate">{u.email}</span>
            </div>
            {u.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                <span>{u.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {isAdmin && !isMe && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <Edit3 className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={onViewSessions}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <Monitor className="w-3 h-3" />
            Sessions
          </button>
          <button
            onClick={onToggleActive}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg ${
              u.active
                ? "text-rose-700 hover:bg-rose-50"
                : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            {u.active ? "Deactivate" : "Activate"}
          </button>
        </div>
      )}
    </div>
  );
}

function UserFormModal({
  form,
  setForm,
  submitting,
  onSubmit,
  onClose,
  editing,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  editing: boolean;
}) {
  const up = (k: keyof FormState, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 border border-slate-200">
        <form onSubmit={onSubmit}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-lg">
              {editing ? "Edit team member" : "Add team member"}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Full name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => up("name", e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => up("email", e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                Password {editing && <span className="text-slate-400 normal-case ml-1">(leave blank to keep unchanged)</span>}
              </label>
              <input
                type="password"
                required={!editing}
                value={form.password}
                onChange={(e) => up("password", e.target.value)}
                placeholder={editing ? "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" : "Set a password"}
                className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => up("role", e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Job title</label>
                <input
                  value={form.title}
                  onChange={(e) => up("title", e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => up("phone", e.target.value)}
                  placeholder="+44 7700 900000"
                  className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => up("active", e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Active account</div>
                    <div className="text-xs text-slate-500">Inactive accounts cannot sign in</div>
                  </div>
                </label>
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
              {editing ? "Save changes" : "Create member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold text-slate-900 leading-tight">{value}</div>
        <div className="text-xs text-slate-500 font-medium">{label}</div>
      </div>
    </div>
  );
}



type SessionRow = { id: string; userAgent: string | null; ipAddress: string | null; lastActiveAt: string };
function UserSessionsPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/sessions?userId=${userId}`, { cache: "no-store" });
      const data = await res.json();
      setSessions(data.sessions || []);
      setLoading(false);
    })();
  }, [userId]);

  const revoke = async (id: string) => {
    setRevokingId(id);
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      setSessions((cur) => cur.filter((s) => s.id !== id));
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-base">Active sessions</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : sessions.length === 0 ? (
            <div className="text-sm text-slate-500">No active sessions.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <div key={s.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800 truncate">
                      <Monitor className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{s.userAgent || "Unknown device"}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {s.ipAddress || "Unknown location"} · {formatDistanceToNow(new Date(s.lastActiveAt), { addSuffix: true })}
                    </div>
                  </div>
                  <button
                    onClick={() => revoke(s.id)}
                    disabled={revokingId === s.id}
                    className="p-1.5 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



