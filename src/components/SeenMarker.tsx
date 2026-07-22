"use client";

import { useState } from "react";
import { Check, ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export type SeenReceipt = {
  userId: string;
  name: string;
  title: string;
  role: string;
  seenAt: string;
};

type SeenMarkerProps = {
  seenBy: SeenReceipt[];
  seenByCurrentUser: boolean;
  onToggle: () => void;
  pending?: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  operator: "Operator",
  guard: "Officer",
};

export function SeenMarker({
  seenBy,
  seenByCurrentUser,
  onToggle,
  pending = false,
}: SeenMarkerProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const names = seenBy.map((receipt) => receipt.name).join(", ");

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          disabled={pending}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
            seenByCurrentUser
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          }`}
          title={seenByCurrentUser ? "Remove your seen marker" : "Confirm you have seen this"}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : seenByCurrentUser ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {seenByCurrentUser ? "Seen" : "Mark seen"}
        </button>

        {seenBy.length > 0 ? (
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="inline-flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title={`Seen by ${names}`}
            aria-expanded={detailsOpen}
          >
            <span className="flex -space-x-1.5">
              {seenBy.slice(0, 4).map((receipt) => (
                <span
                  key={receipt.userId}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-indigo-500 to-sky-500 text-[9px] font-bold text-white shadow-sm"
                  title={receipt.name}
                >
                  {initials(receipt.name)}
                </span>
              ))}
              {seenBy.length > 4 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[9px] font-bold text-slate-600">
                  +{seenBy.length - 4}
                </span>
              )}
            </span>
            <span className="whitespace-nowrap">
              Seen by {seenBy.length} {seenBy.length === 1 ? "officer" : "officers"}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
            />
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <EyeOff className="h-3.5 w-3.5" />
            No officers have confirmed yet
          </span>
        )}
      </div>

      {detailsOpen && seenBy.length > 0 && (
        <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          {seenBy.map((receipt) => (
            <div
              key={receipt.userId}
              className="flex min-w-0 items-center gap-2.5 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200/70"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-[10px] font-bold text-white">
                {initials(receipt.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-slate-800">
                  {receipt.name}
                </div>
                <div className="truncate text-[10px] text-slate-500">
                  {ROLE_LABELS[receipt.role] ?? receipt.title} · {formatDistanceToNow(new Date(receipt.seenAt), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
