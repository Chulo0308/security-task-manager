"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ListChecks, Megaphone, User as UserIcon, Loader2, X } from "lucide-react";

type Results = {
  tasks: { id: string; title: string; status: string; priority: string }[];
  announcements: { id: string; title: string; priority: string }[];
  users: { id: string; name: string; title: string; role: string }[];
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const goTo = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  const totalCount = results ? results.tasks.length + results.announcements.length + results.users.length : 0;

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Search tasks, announcements, team…"
          className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus-brand focus:bg-white"
        />
        {loading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400" />}
        {!loading && query && (
          <button
            onClick={() => { setQuery(""); setResults(null); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && results && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-lg z-50 max-h-[70vh] overflow-y-auto">
          {totalCount === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">No results for "{query}"</div>
          ) : (
            <>
              {results.tasks.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Tasks</div>
                  {results.tasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => goTo("/dashboard/tasks")}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                    >
                      <ListChecks className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-800 truncate">{t.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.announcements.length > 0 && (
                <div className="py-2 border-t border-slate-100">
                  <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Announcements</div>
                  {results.announcements.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => goTo("/dashboard/announcements")}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                    >
                      <Megaphone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-800 truncate">{a.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.users.length > 0 && (
                <div className="py-2 border-t border-slate-100">
                  <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Team</div>
                  {results.users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => goTo("/dashboard/users")}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-800 truncate">{u.name}</span>
                      <span className="text-xs text-slate-400 truncate">{u.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
