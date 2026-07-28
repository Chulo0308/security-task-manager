"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Loader2,
  MapPin,
  Plus,
  Save,
  Shield,
  Trash2,
  Globe,
  Phone,
  Mail,
  Layers,
} from "lucide-react";
import { useRole } from "@/components/AuthProvider";

type Settings = {
  id: string;
  siteName: string;
  addressLine1: string | null;
  addressLine2: string | null;
  borough: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  securityTier: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  notes: string | null;
};

type Floor = { id: string; name: string; level: number; notes: string | null };

const FIELDS: { key: keyof Settings; label: string; icon?: React.ReactNode; span?: boolean }[] = [
  { key: "siteName", label: "Site name", icon: <Building2 className="w-3.5 h-3.5" /> },
  { key: "addressLine1", label: "Address line 1", icon: <MapPin className="w-3.5 h-3.5" /> },
  { key: "addressLine2", label: "Address line 2" },
  { key: "borough", label: "Borough" },
  { key: "city", label: "City" },
  { key: "postcode", label: "Postcode" },
  { key: "country", label: "Country" },
  { key: "securityTier", label: "Security tier", icon: <Shield className="w-3.5 h-3.5" /> },
  { key: "phone", label: "Control room phone", icon: <Phone className="w-3.5 h-3.5" /> },
  { key: "email", label: "Site email", icon: <Mail className="w-3.5 h-3.5" /> },
  { key: "websiteUrl", label: "Website URL", icon: <Globe className="w-3.5 h-3.5" /> },
  { key: "notes", label: "Notes", span: true },
];

export default function SitePage() {
  const { isAdmin } = useRole();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [newFloor, setNewFloor] = useState({ name: "", level: "" });

  const load = async () => {
    const res = await fetch("/api/site", { cache: "no-store" });
    const data = await res.json();
    setSettings(data.settings);
    setFloors(data.floors || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      await load();
      setToast("Site information saved");
    } catch {
      setToast("Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const addFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFloor.name.trim()) return;
    const res = await fetch("/api/site/floors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFloor.name, level: Number(newFloor.level || 0) }),
    });
    if (res.ok) {
      setNewFloor({ name: "", level: "" });
      load();
    }
  };

  const removeFloor = async (id: string) => {
    setFloors((cur) => cur.filter((f) => f.id !== id));
    await fetch(`/api/site/floors/${id}`, { method: "DELETE" });
  };

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 lg:px-8 py-20 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <div className="text-sm text-slate-500">Loading site information…</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Site
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mt-1">Site Information</h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            {isAdmin
              ? "Update site address, contact details and floors. Changes apply across the platform."
              : "Site details managed by the Security Operations Manager."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-60 shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settings && FIELDS.map((f) => (
            <div key={f.key} className={f.span ? "md:col-span-2" : ""}>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                {f.icon}
                {f.label}
              </label>
              <input
                value={(settings[f.key] as string) ?? ""}
                disabled={!isAdmin}
                onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                placeholder="—"
                className="mt-1.5 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-600"
              />
            </div>
          ))}
        </div>
        {!isAdmin && (
          <div className="mt-4 text-xs text-slate-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Read-only — speak to the Security Operations Manager to update details.
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            Floors ({floors.length})
          </h2>
        </div>

        <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
          {floors.map((f) => (
            <div key={f.id} className="px-6 py-2.5 flex items-center gap-3 group hover:bg-slate-50">
              <span className="w-16 text-xs font-bold text-slate-400">
                {f.level === 0 ? "G" : `L${f.level}`}
              </span>
              <span className="flex-1 text-sm text-slate-800 font-medium">{f.name}</span>
              {f.notes && <span className="text-xs text-slate-400">{f.notes}</span>}
              {isAdmin && (
                <button
                  onClick={() => removeFloor(f.id)}
                  className="p-1.5 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {floors.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-slate-500">No floors defined yet.</div>
          )}
        </div>

        {isAdmin && (
          <form onSubmit={addFloor} className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 bg-slate-50">
            <input
              value={newFloor.name}
              onChange={(e) => setNewFloor({ ...newFloor, name: e.target.value })}
              placeholder="Floor name (e.g. Level 51 – Scalpel Suite)"
              className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              value={newFloor.level}
              onChange={(e) => setNewFloor({ ...newFloor, level: e.target.value })}
              placeholder="Level #"
              className="w-28 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Add floor
            </button>
          </form>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border bg-emerald-50 text-emerald-800 border-emerald-200 text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}
