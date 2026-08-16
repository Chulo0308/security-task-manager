"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Loader2, Copy, Check } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function AccountPage() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [setupData, setSetupData] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  const [disablePassword, setDisablePassword] = useState("");
  const [disableError, setDisableError] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);

  const loadStatus = async () => {
    const res = await fetch("/api/auth/2fa/status", { cache: "no-store" });
    const data = await res.json();
    setEnabled(!!data.enabled);
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const startSetup = async () => {
    const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
    const data = await res.json();
    setSetupData(data);
    setConfirmError("");
    setCode("");
  };

  const confirmSetup = async () => {
    if (code.trim().length !== 6) return;
    setConfirming(true);
    setConfirmError("");
    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setConfirmError(d.error || "Invalid code");
        return;
      }
      setSetupData(null);
      setCode("");
      await loadStatus();
    } finally {
      setConfirming(false);
    }
  };

  const disable2fa = async () => {
    if (!disablePassword) return;
    setDisabling(true);
    setDisableError("");
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setDisableError(d.error || "Failed to disable");
        return;
      }
      setDisablePassword("");
      setShowDisableForm(false);
      await loadStatus();
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="mb-6">
        <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Account</div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mt-1">My Account</h1>
        <p className="text-slate-500 mt-1.5 text-sm">
          {user ? `${user.name} · ${user.email}` : ""}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-1">Two-factor authentication</h2>
        <p className="text-sm text-slate-500 mb-4">
          Add an extra layer of security using an authenticator app (e.g. Google Authenticator, Authy).
        </p>

        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        ) : enabled ? (
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium mb-4">
              <ShieldCheck className="w-4 h-4" />
              Enabled
            </div>
            {!showDisableForm ? (
              <div>
                <button
                  onClick={() => setShowDisableForm(true)}
                  className="px-4 py-2 text-sm font-medium text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50"
                >
                  Disable two-factor authentication
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-w-sm">
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                  Confirm your password to disable
                </label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                {disableError && <div className="text-xs text-rose-600">{disableError}</div>}
                <div className="flex gap-2">
                  <button
                    onClick={disable2fa}
                    disabled={disabling || !disablePassword}
                    className="px-4 py-2 text-sm font-medium bg-rose-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {disabling ? "Disabling…" : "Confirm disable"}
                  </button>
                  <button
                    onClick={() => { setShowDisableForm(false); setDisablePassword(""); setDisableError(""); }}
                    className="px-4 py-2 text-sm text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : setupData ? (
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-sm font-medium mb-4">
              <ShieldOff className="w-4 h-4" />
              Not enabled yet
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Scan this QR code with your authenticator app, then enter the 6-digit code it shows.
            </p>
            <img src={setupData.qrDataUrl} alt="2FA QR code" className="w-48 h-48 border border-slate-200 rounded-lg mb-3" />
            <div className="flex items-center gap-2 mb-4">
              <code className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono">{setupData.secret}</code>
              <button onClick={copySecret} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="max-w-xs space-y-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm tracking-widest text-center font-mono"
              />
              {confirmError && <div className="text-xs text-rose-600">{confirmError}</div>}
              <button
                onClick={confirmSetup}
                disabled={confirming || code.length !== 6}
                className="w-full px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg disabled:opacity-50"
              >
                {confirming ? "Confirming…" : "Confirm and enable"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-sm font-medium mb-4">
              <ShieldOff className="w-4 h-4" />
              Not enabled
            </div>
            <button
              onClick={startSetup}
              className="btn-brand sheen-wrap px-4 py-2 rounded-lg text-sm font-medium"
            >
              Enable two-factor authentication
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
