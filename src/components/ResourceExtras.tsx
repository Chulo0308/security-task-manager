"use client";

import { useRef, useState } from "react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  BellPlus,
  BellRing,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  Paperclip,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

export type AttachmentMeta = {
  id: string;
  resourceId: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type ReminderItem = {
  id: string;
  resourceId: string;
  message: string;
  remindAt: string;
};

/* ---------------- Attachments (view-only, downloads disabled by policy) ---------------- */

export function AttachmentsPanel({
  resourceType,
  resourceId,
  initial,
  canUpload,
  canDelete,
}: {
  resourceType: "task" | "announcement";
  resourceId: string;
  initial: AttachmentMeta[];
  canUpload: boolean;
  canDelete: boolean;
}) {
  const [items, setItems] = useState<AttachmentMeta[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<AttachmentMeta | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("resourceType", resourceType);
      fd.append("resourceId", resourceId);
      const res = await fetch("/api/attachments", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setItems((cur) => [...cur, data.attachment]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (id: string) => {
    const prev = items;
    setItems((cur) => cur.filter((f) => f.id !== id));
    try {
      await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    } catch {
      setItems(prev);
    }
  };

  return (
    <div className="mt-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.txt,.doc,.docx"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {items.map((f) =>
            f.mimeType.startsWith("image/") ? (
              <button
                key={f.id}
                onClick={() => setViewer(f)}
                className="group relative h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 protected-media"
                title={`${f.fileName} — protected, view only`}
              >
                <img
                  src={`/api/attachments/${f.id}`}
                  alt={f.fileName}
                  className="h-full w-full object-cover select-none"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
                <span className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
                  <ImageIcon className="h-4 w-4 text-white" />
                </span>
              </button>
            ) : (
              <span
                key={f.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-600"
                title="Protected document — downloading is disabled by policy"
              >
                <Lock className="h-3 w-3 text-slate-400" />
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <span className="max-w-[140px] truncate">{f.fileName}</span>
                {canDelete && (
                  <button
                    onClick={() => remove(f.id)}
                    className="ml-1 rounded p-0.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                    title="Delete attachment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </span>
            )
          )}
          {canDelete && items.some((f) => f.mimeType.startsWith("image/")) && null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {canUpload && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
            Attach file
          </button>
        )}
        {items.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
            <ShieldAlert className="h-3 w-3" />
            View-only · downloads & screenshots not authorised
          </span>
        )}
        {error && <span className="text-[11px] font-medium text-rose-600">{error}</span>}
      </div>

      {viewer && (
        <ProtectedImageViewer file={viewer} onClose={() => setViewer(null)} onDelete={canDelete ? () => { remove(viewer.id); setViewer(null); } : undefined} />
      )}
    </div>
  );
}

function ProtectedImageViewer({
  file,
  onClose,
  onDelete,
}: {
  file: AttachmentMeta;
  onClose: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4 select-none"
      onClick={onClose}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="absolute inset-0 z-10" draggable={false} />
        <img
          src={`/api/attachments/${file.id}`}
          alt={file.fileName}
          className="max-h-[85vh] w-auto rounded-xl object-contain select-none pointer-events-none"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
        <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-4 py-1.5 text-xs font-medium text-white">
          <Lock className="mr-1 inline h-3 w-3" />
          Protected media — downloads and screenshots are not authorised
        </div>
        <div className="absolute right-3 top-3 z-20 flex gap-2">
          {onDelete && (
            <button
              onClick={onDelete}
              className="rounded-full bg-black/70 p-2 text-white hover:bg-rose-600"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-full bg-black/70 p-2 text-white hover:bg-slate-700"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Reminders ---------------- */

export function ReminderControl({
  resourceType,
  resourceId,
  resourceTitle,
  initial,
  canManage,
  onToast,
}: {
  resourceType: "task" | "announcement";
  resourceId: string;
  resourceTitle: string;
  initial: ReminderItem[];
  canManage: boolean;
  onToast: (msg: string, type: "success" | "error") => void;
}) {
  const [items, setItems] = useState<ReminderItem[]>(initial);
  const [open, setOpen] = useState(false);
  const [remindAt, setRemindAt] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const active = items
    .filter((r) => !isPast(new Date(r.remindAt)))
    .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());

  const save = async () => {
    if (!remindAt) return;
    setSaving(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType, resourceId, resourceTitle, message, remindAt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setItems((cur) => [...cur, { ...data.reminder, remindAt: data.reminder.remindAt }]);
      setOpen(false);
      setMessage("");
      setRemindAt("");
      onToast("Reminder scheduled", "success");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to schedule", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setItems((cur) => cur.filter((r) => r.id !== id));
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
  };

  return (
    <>
      {active.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {active.slice(0, 2).map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700"
              title={r.message || "Reminder"}
            >
              <BellRing className="h-3 w-3" />
              {format(new Date(r.remindAt), "d MMM HH:mm")}
              {r.message && <span className="max-w-[160px] truncate">· {r.message}</span>}
              {canManage && (
                <button onClick={() => remove(r.id)} className="rounded p-0.5 hover:bg-violet-100" title="Remove reminder">
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {active.length > 2 && (
            <span className="text-[11px] font-medium text-violet-600">+{active.length - 2} more</span>
          )}
        </div>
      )}

      {canManage && (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <BellPlus className="h-3.5 w-3.5" />
          Reminder
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <BellPlus className="h-4 w-4 text-violet-600" />
                Schedule reminder
              </h3>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 line-clamp-1 text-xs text-slate-500">{resourceTitle}</p>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">Remind at</label>
            <input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">Message (optional)</label>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Chase contractor before shift end"
              className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !remindAt}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
