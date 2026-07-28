"use client";

import { Building2, Smartphone, Monitor, Apple, Download, CheckCircle2 } from "lucide-react";

const PLATFORMS = [
  {
    name: "Android",
    icon: <Smartphone className="w-8 h-8" />,
    gradient: "from-emerald-500 to-green-600",
    badge: "Add to Home screen",
    steps: [
      "Open the app in Chrome on your Android device",
      "Tap the ⋮ menu (top-right) → \"Add to Home screen\"",
      "Tap \"Install\" — the Command Centre icon appears on your home screen",
      "Launch it full-screen, just like a native app",
    ],
  },
  {
    name: "iOS",
    icon: <Apple className="w-8 h-8" />,
    gradient: "from-slate-700 to-slate-900",
    badge: "Add to Home screen",
    steps: [
      "Open the app in Safari on your iPhone or iPad",
      "Tap the Share button (square with an arrow)",
      "Scroll and tap \"Add to Home Screen\" then \"Add\"",
      "Launch from the new 8 Bishopsgate icon",
    ],
  },
  {
    name: "Windows",
    icon: <Monitor className="w-8 h-8" />,
    gradient: "from-sky-500 to-blue-600",
    badge: "Install from browser",
    steps: [
      "Open the app in Microsoft Edge or Chrome",
      "Click the install icon (⊕) in the address bar",
      "Select \"Install\" to add it to Start Menu & taskbar",
      "Sign in once — your session persists on the desktop app",
    ],
  },
];

export default function DownloadPage() {
  return (
    <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="mb-8 text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 items-center justify-center text-white shadow-lg mb-4">
          <Download className="w-7 h-7" />
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900">
          Get the Command Centre app
        </h1>
        <p className="text-slate-500 mt-2 max-w-xl mx-auto">
          Install 8 Bishopsgate Security Operations on any device. Our progressive web app (PWA)
          works offline-first at the front door, basement levels and everywhere in between.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLATFORMS.map((p) => (
          <div key={p.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className={`bg-gradient-to-br ${p.gradient} p-6 text-white flex items-center gap-4`}>
              {p.icon}
              <div>
                <div className="text-xl font-semibold">{p.name}</div>
                <div className="text-xs text-white/80">{p.badge}</div>
              </div>
            </div>
            <div className="p-5">
              <ol className="space-y-3">
                {p.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-600">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>                
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-slate-900 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Building2 className="w-8 h-8 text-indigo-300 flex-shrink-0" />
        <div>
          <div className="font-semibold">Managed devices</div>
          <p className="text-sm text-slate-400 mt-1">
            Company-issued radios and tablets receive the app automatically via MDM enrolment.
            Contact the Security Operations Manager if your device hasn't received the profile.
          </p>
        </div>
        <div className="sm:ml-auto inline-flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4" />
          Version 2.4.0 · Current
        </div>
      </div>
    </div>
  );
}
