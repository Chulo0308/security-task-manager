"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, ShieldCheck } from "lucide-react";

type Msg = { role: "user" | "assistant"; text: string };

export function VigilWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "Hi, I'm Vigil. Ask me about your tasks, announcements, or how to use the app." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((cur) => [...cur, { role: "user", text }]);
    setSending(true);
    try {
      const res = await fetch("/api/vigil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((cur) => [...cur, { role: "assistant", text: data.reply || "Sorry, something went wrong." }]);
    } catch {
      setMessages((cur) => [...cur, { role: "assistant", text: "Sorry, I couldn't reach the server. Try again shortly." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[340px] max-w-[calc(100vw-2.5rem)] h-[460px] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
          <div className="brand-hero px-4 py-3 flex items-center justify-between text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="font-semibold text-sm">Vigil</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#F64F0C] text-white rounded-br-sm"
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="p-2.5 border-t border-slate-100 flex items-center gap-2 flex-shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Ask Vigil…"
              className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus-brand"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="p-2 rounded-lg bg-[#F64F0C] text-white disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#F64F0C] text-white shadow-lg flex items-center justify-center hover:brightness-110 transition-all"
        title="Ask Vigil"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    </>
  );
}
