"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow, isPast } from "date-fns";
import {
  Megaphone,
  Plus,
  Search,
  Pin,
  AlertTriangle,
  X,
  Loader2,
  Edit3,
  Trash2,
  CheckCircle2,
  Sparkles,
  MoreVertical,
  Clock,
} from "lucide-react";
import { useAuth, useRole } from "@/components/AuthProvider";
import { SeenMarker, type SeenReceipt } from "@/components/SeenMarker";
import {
  AttachmentsPanel,
  ReminderControl,
  type AttachmentMeta,
  type ReminderItem,
} from "@/components/ResourceExtras";

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
  seenBy: SeenReceipt[];
  seenCount: number;
  seenByCurrentUser: boolean;
  attachments: AttachmentMeta[];
  reminders: ReminderItem[];
};

type FormState = {
  title: string;
  body: string;
  priority: string;
  pinned: boolean;
  expiresAt: string;
};

const EMPTY: FormState = {
  title: "",
  body: "",
  priority: "normal",
  pinned: false,
  expiresAt: "",
};

const PRIORITIES = [
  { value: "normal", label: "Normal", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "urgent", label: "Urgent", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "critical", label: "Critical", color: "bg-rose-100 text-rose-700 border-rose-200" },
];

const PRIORITY_CARD: Record<string, string> = {
  critical: "border-rose-300 bg-gradient-to-br from-rose-50 to-white",
  urgent: "border-amber-300 bg-gradient-to-br from-amber-50 to-white",
  normal: "border-slate-200 bg-white",
};

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { isSupervisorOrAbove, isAdmin } = useRole();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [showExpired, setShowExpired] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [seenPending, setSeenPending] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/announcements", { cache: "no-store" });
    const data = await res.json();
    setAnnouncements(data.announcements || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    return announcements.filter((a) => {
      if (!showExpired && a.expiresAt && isPast(new Date(a.expiresAt))) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!`${a.title} ${a.body} ${a.authorName || ""}`.toLowerCase().includes(q)) return false;
      }
      if (priorityFilter.length && !priorityFilter.includes(a.priority)) return false;
      return true;
    });
  }, [announcements, search, priorityFilter, showExpired]);

  // Split pinned / non-pinned
  const pinned = filtered.filter((a) => a.pinned);
  const regular = filtered.filter((a) => !a.pinned);

  const optimisticTogglePin = async (a: Announcement) => {
    const prev = announcements;
    setAnnouncements((cur) => cur.map((x) => (x.id === a.id ? { ...x, pinned: !x.pinned } : x)));
    try {
      await fetch(`/api/announcements/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !a.pinned }),
      });
    } catch {
      setAnnouncements(prev);
      flash("Failed to update", "error");
    }
  };

  const toggleAnnouncementSeen = async (announcement: Announcement) => {
    if (!user || seenPending.has(announcement.id)) return;

    const wasSeen = announcement.seenByCurrentUser;
    const previous = announcements;
    const optimisticReceipt: SeenReceipt = {
      userId: user.id,
      name: user.name,
      title: user.title,
      role: user.role,
      seenAt: new Date().toISOString(),
    };

    setSeenPending((current) => new Set(current).add(announcement.id));
    setAnnouncements((current) =>
      current.map((item) => {
        if (item.id !== announcement.id) return item;
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
      const response = await fetch(`/api/announcements/${announcement.id}/seen`, {
        method: wasSeen ? "DELETE" : "POST",
      });
      if (!response.ok) throw new Error("Unable to update seen marker");

      if (!wasSeen) {
        const data = await response.json();
        if (data.receipt) {
          setAnnouncements((current) =>
            current.map((item) => {
              if (item.id !== announcement.id) return item;
              const seenBy = (item.seenBy ?? []).map((receipt) =>
                receipt.userId === user.id ? data.receipt : receipt
              );
              return { ...item, seenBy, seenCount: seenBy.length };
            })
          );
        }
      }
    } catch {
      setAnnouncements(previous);
      flash("Failed to update your seen marker", "error");
    } finally {
      setSeenPending((current) => {
        const next = new Set(current);
        next.delete(announcement.id);
        return next;
      });
    }
  };

  const optimisticDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const prev = announcements;
    setAnnouncements((cur) => cur.filter((a) => a.id !== id));
    try {
      await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      flash("Announcement deleted", "success");
    } catch {
      setAnnouncements(prev);
      flash("Failed to delete", "error");
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      body: a.body,
      priority: a.priority,
      pinned: a.pinned,
      expiresAt: a.expiresAt ? toDateTimeLocal(new Date(a.expiresAt)) : "",
    });
    setFormOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    const payload = {
      ...form,
      expiresAt: form.expiresAt || null,
    };
    try {
      if (editingId) {
        const res = await fetch(`/api/announcements/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAnnouncements((cur) => cur.map((a) => (a.id === editingId ? { ...a, ...data.announcement } : a)));
        flash("Announcement updated", "success");
      } else {
        const res = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        await load();
        flash("Announcement posted", "success");
      }
      setFormOpen(false);
    } catch {
      flash(editingId ? "Failed to update" : "Failed to post", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const flash = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const expiredCount = announcements.filter((a) => a.expiresAt && isPast(new Date(a.expiresAt))).length;

  return (
    <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5" />
            Announcements
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mt-1">
            Team Communications
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Stay aligned with the latest updates, alerts and instructions.
          </p>
        </div>
        {isSupervisorOrAbove && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Post announcement
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 mb-5 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {PRIORITIES.map((p) => {
            const active = priorityFilter.includes(p.value);
            return (
              <button
                key={p.value}
                onClick={() =>
                  setPriorityFilter(active
                    ? priorityFilter.filter((x) => x !== p.value)
                    : [...priorityFilter, p.value])
                }
                className={`px-2.5 py-1.5 text-xs rounded-md border font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {expiredCount > 0 && (
          <label className="text-xs text-slate-500 inline-flex items-center gap-2 ml-auto">
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Show expired ({expiredCount})
          </label>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <div className="text-sm text-slate-500">Loading announcements…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <Megaphone className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">
            {search || priorityFilter.length ? "No matching announcements" : "No announcements yet"}
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            {search || priorityFilter.length
              ? "Try adjusting your filters or search terms."
              : "Supervisors and admins can post updates here."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 text-amber-700">
                <Pin className="w-4 h-4" />
                <h2 className="font-semibold text-slate-900">Pinned</h2>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  {pinned.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {pinned.map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    a={a}
                    onTogglePin={() => optimisticTogglePin(a)}
                    onToggleSeen={() => toggleAnnouncementSeen(a)}
                    seenPending={seenPending.has(a.id)}
                    onEdit={() => openEdit(a)}
                    onDelete={() => optimisticDelete(a.id)}
                    canEdit={isSupervisorOrAbove}
                    canPin={isSupervisorOrAbove}
                    canDelete={isAdmin}
                  />
                ))}
              </div>
            </div>
          )}

          {regular.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 text-slate-700">
                <Clock className="w-4 h-4" />
                <h2 className="font-semibold text-slate-900">Recent</h2>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {regular.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {regular.map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    a={a}
                    onTogglePin={() => optimisticTogglePin(a)}
                    onToggleSeen={() => toggleAnnouncementSeen(a)}
                    seenPending={seenPending.has(a.id)}
                    onEdit={() => openEdit(a)}
                    onDelete={() => optimisticDelete(a.id)}
                    canEdit={isSupervisorOrAbove}
                    canPin={isSupervisorOrAbove}
                    canDelete={isAdmin}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <AnnouncementFormModal
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

function AnnouncementCard({
  a,
  onTogglePin,
  onToggleSeen,
  seenPending,
  onEdit,
  onDelete,
  canEdit,
  canPin,
  canDelete,
}: {
  a: Announcement;
  onTogglePin: () => void;
  onToggleSeen: () => void;
  seenPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canPin: boolean;
  canDelete: boolean;
}) {
  const canManage = canEdit; // supervisors & administrators
  const onToast = (msg: string, type: "success" | "error") => {
    const el = document.createElement("div");
    el.className = `fixed bottom-6 right-6 z-[70] px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
      type === "success"
        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
        : "bg-rose-50 text-rose-800 border-rose-200"
    }`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  };
  const [expanded, setExpanded] = useState(false);
  const expired = a.expiresAt && isPast(new Date(a.expiresAt));
  const prioStyle = PRIORITIES.find((p) => p.value === a.priority) || PRIORITIES[0];

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${PRIORITY_CARD[a.priority]} ${
        expired ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Priority icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            a.priority === "critical"
              ? "bg-rose-500 text-white"
              : a.priority === "urgent"
              ? "bg-amber-500 text-white"
              : "bg-indigo-500 text-white"
          }`}
        >
          {a.priority === "critical" ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Megaphone className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {a.pinned && (
                  <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Pin className="w-2.5 h-2.5" />
                    pinned
                  </span>
                )}
                <span className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded border ${prioStyle.color}`}>
                  {prioStyle.label}
                </span>
                {expired && (
                  <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    expired
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-slate-900 text-base leading-snug mb-1.5">
                {a.title}
              </h3>
              <div
                className={`text-sm text-slate-700 whitespace-pre-wrap leading-relaxed ${
                  expanded ? "" : "line-clamp-3"
                }`}
              >
                {a.body}
              </div>
              {a.body.length > 200 && (
                <button
                  onClick={() => setExpanded((e) => !e)}
                  className="text-xs text-indigo-600 font-medium mt-1 hover:text-indigo-700"
                >
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}

              <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{a.authorName}</span>
                <span className="text-slate-400">{a.authorTitle}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                {a.expiresAt && !expired && (
                  <>
                    <span>·</span>
                    <span>
                      Expires {formatDistanceToNow(new Date(a.expiresAt), { addSuffix: true })}
                    </span>
                  </>
                )}
              </div>

              <SeenMarker
                seenBy={a.seenBy ?? []}
                seenByCurrentUser={a.seenByCurrentUser}
                onToggle={onToggleSeen}
                pending={seenPending}
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ReminderControl
                  resourceType="announcement"
                  resourceId={a.id}
                  resourceTitle={a.title}
                  initial={a.reminders ?? []}
                  canManage={canManage}
                  onToast={onToast}
                />
              </div>
              <AttachmentsPanel
                resourceType="announcement"
                resourceId={a.id}
                initial={a.attachments ?? []}
                canUpload={canManage}
                canDelete={canManage}
              />
            </div>

            {/* Actions */}
            {(canPin || canEdit || canDelete) && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {canPin && (
                  <button
                    onClick={onTogglePin}
                    className={`p-1.5 rounded-md transition-colors ${
                      a.pinned
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "hover:bg-white/60 text-slate-600"
                    }`}
                    title={a.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={onEdit}
                    className="p-1.5 rounded-md hover:bg-white/60 text-slate-600 transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={onDelete}
                    className="p-1.5 rounded-md hover:bg-rose-100 text-rose-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnouncementFormModal({
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
              {editing ? "Edit announcement" : "Post announcement"}
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
                placeholder="e.g. Loading bay closure on Friday"
                className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Message</label>
              <textarea
                required
                rows={6}
                value={form.body}
                onChange={(e) => up("body", e.target.value)}
                placeholder="Share the details with the team…"
                className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Priority</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => {
                  const active = form.priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => up("priority", p.value)}
                      className={`px-3 py-2.5 text-sm rounded-lg border font-medium transition-colors ${
                        active
                          ? p.value === "critical"
                            ? "bg-rose-600 text-white border-rose-600"
                            : p.value === "urgent"
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Expires at (optional)</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => up("expiresAt", e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.pinned}
                    onChange={(e) => up("pinned", e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Pin to top</div>
                    <div className="text-xs text-slate-500">Keeps announcement at the top of the list</div>
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
              {editing ? "Save changes" : "Post announcement"}
            </button>
          </div>
        </form>
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
