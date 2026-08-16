"use client";
import { useEffect, useState } from "react";
import { History, PlusCircle, Pencil, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Entry = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  resourceTitle: string | null;
  details: string | null;
  createdAt: string;
  actorName: string | null;
  actorTitle: string | null;
};

const ACTION_ICON: Record<string, React.ReactNode> = {
  created: <PlusCircle className="w-4 h-4 text-emerald-500" />,
  updated: <Pencil className="w-4 h-4 text-indigo-500" />,
  completed: <CheckCircle2 className="w-4 h-4 text-[#F64F0C]" />,
  deleted: <Trash2 className="w-4 h-4 text-rose-500" />,
};

const RESOURCE_LABEL: Record<string, string> = {
  task: "task",
  announcement: "announcement",
  user: "team member",
  floor: "floor",
};

function describeEntry(e: Entry) {
  const resource = RESOURCE_LABEL[e.resourceType] || e.resourceType;
  const title = e.resourceTitle ? `"${e.resourceTitle}"` : "an item";
  return `${e.action} ${resource} ${title}`;
}

export default function ActivityLogPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/activity?limit=200", { cache: "no-store" });
        const data = await res.json();
        setEntries(data.entries || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filter === "all" ? entries : entries.filter((e) => e.resourceType === filter);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-5 h-5 text-[#F64F0C]" />
        <h1 className="text-lg font-semibold text-slate-900">Activity Log</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {["all", "task", "announcement", "user", "floor"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === t
                ? "bg-[#F64F0C] text-white border-[#F64F0C]"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t === "all" ? "All" : RESOURCE_LABEL[t] || t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No activity recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((e) => (
              <div key={e.id} className="px-5 py-3 flex items-start gap-3">
                <div className="mt-0.5">{ACTION_ICON[e.action] || <Pencil className="w-4 h-4 text-slate-400" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-800">
                    <span className="font-medium">{e.actorName || "Unknown"}</span> {describeEntry(e)}
                  </div>
                  {e.details && <div className="text-xs text-slate-400 mt-0.5">{e.details}</div>}
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">
                  {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
