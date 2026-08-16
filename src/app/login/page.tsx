"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { Building2, ShieldCheck, Loader2, KeyRound, Sparkles } from "lucide-react";

type DemoAccount = {
  name: string;
  email: string;
  password: string;
  role: string;
  title: string;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [showDemo, setShowDemo] = useState(true);
  const [mode, setMode] = useState<"loading" | "setup" | "login">("loading");
  const [siteName, setSiteName] = useState("8 Bishopsgate");
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [siteLocation, setSiteLocation] = useState("London Â· EC2N 4AY");

  useEffect(() => {
    // Determine whether this is a live deployment or needs first-run setup
    (async () => {
      try {
        const res = await fetch("/api/setup");
        const data = await res.json();
        if (!data.hasAdmin) {
          setMode("setup");
        } else {
          setMode("login");
          setShowDemo(Boolean(data.demoPresent));
          setDemoAccounts(data.demoAccounts || []);
        }
      } catch {
        setMode("login");
      }
    })();
  }, []);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);
  useEffect(() => {
    fetch("/api/site/public")
      .then((r) => r.json())
      .then((d) => {
        if (d.siteName) setSiteName(d.siteName);
        if (d.postcode || d.city) setSiteLocation([d.city, d.postcode].filter(Boolean).join(" Â· "));
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      if (data.requiresTwoFactor) {
        setTwoFactorChallenge(data.challenge);
        return;
      }
      await refresh();
      router.replace("/dashboard");
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const pickDemo = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError("");
  };

  const seedDatabase = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Seed failed");
      setDemoAccounts(data.accounts || []);
      setError("");
    } catch (e: any) {
      setError(e.message || "Seed failed");
    } finally {
      setSubmitting(false);
    }
  };

  const next = searchParams.get("next") || "/dashboard";

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.trim().length !== 6 || !twoFactorChallenge) return;
    setVerifying(true);
    setTwoFactorError("");
    try {
      const res = await fetch("/api/auth/login/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge: twoFactorChallenge, code: twoFactorCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTwoFactorError(data.error || "Incorrect code");
        return;
      }
      await refresh();
      router.replace("/dashboard");
    } catch {
      setTwoFactorError("Network error");
    } finally {
      setVerifying(false);
    }
  };

  if (twoFactorChallenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h1 className="text-lg font-semibold mb-1">Two-factor authentication</h1>
          <p className="text-sm text-slate-400 mb-4">
            Enter the 6-digit code from your authenticator app.
          </p>
          <form onSubmit={handleVerify2fa} className="space-y-3">
            <input
              autoFocus
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-[#F64F0C]/40"
            />
            {twoFactorError && <div className="text-xs text-rose-400">{twoFactorError}</div>}
            <button
              type="submit"
              disabled={verifying || twoFactorCode.length !== 6}
              className="w-full px-4 py-2.5 bg-[#F64F0C] text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {verifying ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => { setTwoFactorChallenge(null); setTwoFactorCode(""); setTwoFactorError(""); }}
              className="w-full text-xs text-slate-400 hover:text-slate-200"
            >
              Back to login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950 text-slate-100">
      {/* Left panel â€“ branding */}
      <div className="relative lg:w-[45%] flex flex-col justify-between p-8 lg:p-12 brand-hero overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{
               backgroundImage:
                 "radial-gradient(circle at 20% 30%, rgba(246,79,12,0.35) 0, transparent 42%), radial-gradient(circle at 80% 70%, rgba(246,79,12,0.18) 0, transparent 45%)"
             }} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
<div className="text-sm tracking-[0.2em] text-slate-400 font-medium">{siteName.toUpperCase()}</div>
                        <div className="text-xs text-slate-500">{siteLocation}</div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-semibold leading-tight mb-4">
            Security Operations<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F64F0C] to-[#ff6a2b]">
              Command Centre
            </span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Centralised task management, incident tracking and team announcements for the 8&nbsp;Bishopsgate security team.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 text-sm">
            <StatCard icon={<ShieldCheck className="w-4 h-4" />} label="24/7 Monitoring" />
            <StatCard icon={<KeyRound className="w-4 h-4" />} label="Role-Based Access" />
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          Â© {new Date().getFullYear()} 8 Bishopsgate Security Operations Â· City of London
        </div>
      </div>

      {/* Right panel â€“ form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50 text-slate-900">
        <div className="w-full max-w-md">
          {mode === "setup" && (
            <SetupForm onDone={async () => { await refresh(); router.replace("/dashboard"); }} />
          )}
          {mode === "loading" && (
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              Preparingâ€¦
            </div>
          )}
          {mode === "login" && (<>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-slate-500 mt-1 text-sm">Sign in with your site credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@8bishopsgate.com"
                className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-brand sheen-wrap w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Sign in to {next === "/dashboard" ? "Command Centre" : "your workspace"}
            </button>
          </form>

          {demoAccounts.length > 0 && (
          <div className="mt-8 pt-8 border-t border-slate-200">
            <button
              onClick={() => setShowDemo((s) => !s)}
              className="w-full flex items-center justify-between text-sm font-medium text-slate-700 hover:text-indigo-600"
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Demo accounts
              </span>
              <span className="text-slate-400">{showDemo ? "Hide" : "Show"}</span>
            </button>

            {showDemo && (
              <div className="mt-3 space-y-1.5">
                <div className="text-xs text-slate-500 mb-2">
                  Click an account to auto-fill, then sign in.
                </div>
                {demoAccounts.length === 0 && (
                  <button
                    onClick={seedDatabase}
                    disabled={submitting}
                    className="w-full px-3 py-2 text-xs text-left bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                  >
                    No demo accounts found. Click to seed demo data.
                  </button>
                )}
                {demoAccounts.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => pickDemo(a)}
                    className="w-full px-3 py-2 text-left bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{a.name}</div>
                        <div className="text-xs text-slate-500">{a.title}</div>
                      </div>
                      <RoleBadge role={a.role} />
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-mono">{a.email} Â· {a.password}</div>
                  </button>
                ))}
                {demoAccounts.length > 0 && (
                  <button
                    onClick={seedDatabase}
                    disabled={submitting}
                    className="w-full text-xs text-slate-500 hover:text-indigo-600 py-2"
                  >
                    Reset demo data
                  </button>
                )}
              </div>
            )}
          </div>
          )}
          </>)}
        </div>
      </div>
    </div>
  );
}

function SetupForm({ onDone }: { onDone: () => Promise<void> | void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed");
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wider mb-3">
          <KeyRound className="w-3 h-3" />
          First-run setup
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Create the administrator account</h2>
        <p className="text-slate-500 mt-1 text-sm">
          This is a live deployment. Set up the Security Operations Manager account â€” further staff
          accounts are added later by the administrator from the Team page.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Full name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Morgan"
            className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Work email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@8bishopsgate.com"
            className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Password</label>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Confirm password</label>
          <input
            required
            type="password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 disabled:opacity-60 transition-colors"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Create administrator account
        </button>

        <p className="text-xs text-slate-400 text-center">
          You will be signed in immediately after the account is created.
        </p>
      </form>
    </div>
  );
}

function StatCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur">
      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
        {icon}
      </div>
      <div className="text-sm text-slate-200 font-medium">{label}</div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-rose-100 text-rose-700 border-rose-200",
    supervisor: "bg-amber-100 text-amber-700 border-amber-200",
    operator: "bg-sky-100 text-sky-700 border-sky-200",
    guard: "bg-slate-100 text-slate-700 border-slate-200",
  };
  const labels: Record<string, string> = {
    admin: "Admin",
    supervisor: "Supervisor",
    operator: "Operator",
    guard: "Guard",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md border ${styles[role] || styles.guard}`}>
      {labels[role] || role}
    </span>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingShell />}>
        <LoginForm />
      </Suspense>
    </AuthProvider>
  );
}

function LoadingShell() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <div className="text-sm text-slate-500">Loadingâ€¦</div>
      </div>
    </div>
  );
}


