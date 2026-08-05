"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import {
  Building2,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  Landmark,
  Megaphone,
  Users as UsersIcon,
  LogOut,
  Menu,
  X,
  Download,
  ChevronRight,
} from "lucide-react";
import { AuthProvider, useAuth, useRole } from "@/components/AuthProvider";
import { NotificationToggle } from "@/components/NotificationToggle";
import { useRouter } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
  supervisorOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: "/dashboard/tasks", label: "Tasks", icon: <ListChecks className="w-5 h-5" /> },
  { href: "/dashboard/todo", label: "My To-Do", icon: <ListTodo className="w-5 h-5" /> },
  { href: "/dashboard/announcements", label: "Announcements", icon: <Megaphone className="w-5 h-5" /> },
  { href: "/dashboard/site", label: "Site Info", icon: <Landmark className="w-5 h-5" /> },
  { href: "/dashboard/users", label: "Team", icon: <UsersIcon className="w-5 h-5" /> },
  { href: "/dashboard/download", label: "App Download", icon: <Download className="w-5 h-5" /> },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  supervisor: "Supervisor",
  operator: "CCTV Operator",
  guard: "Security Officer",
};

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isAdmin, isSupervisorOrAbove } = useRole();
  const router = useRouter();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.supervisorOnly) return isSupervisorOrAbove;
    return true;
  });

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen z-50
          w-72 bg-slate-950 text-slate-100
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F64F0C] to-[#ff6a2b] flex items-center justify-center shadow-lg shadow-orange-900/40">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[11px] tracking-[0.2em] text-slate-400 font-medium leading-none">
                8 BISHOPSGATE
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Security Ops</div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md hover:bg-white/10 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User card */}
        {user && (
          <div className="px-4 pt-5 pb-3">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-sky-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-xs text-slate-400 truncate">{user.title}</div>
                <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold mt-0.5">
                  {ROLE_LABELS[user.role]}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 mb-2">
            Workspace
          </div>
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`
                      group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                      ${
                        active
                          ? "bg-gradient-to-r from-[#F64F0C]/20 to-[#F64F0C]/5 text-white border border-[#F64F0C]/30"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }
                    `}
                  >
                    <span className={active ? "text-[#F64F0C]" : "text-slate-500 group-hover:text-slate-300"}>
                      {item.icon}
                    </span>
                    <span className="flex-1 font-medium">{item.label}</span>
                    {active && <ChevronRight className="w-4 h-4 text-[#F64F0C]" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 space-y-1">
          <NotificationToggle />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar (mobile only) */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-semibold">8 Bishopsgate</span>
          </div>
          <div className="w-8" />
        </div>
<main className="flex-1 min-w-0">{children}</main>
        <Watermark />
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
function Watermark() {
  const { user } = useAuth();
  const [stamp, setStamp] = useState(() => new Date().toLocaleString("en-GB"));
  useEffect(() => {
    const t = setInterval(() => setStamp(new Date().toLocaleString("en-GB")), 60000);
    return () => clearInterval(t);
  }, []);
  if (!user) return null;
  const label = `${user.name} · ${user.email} · ${stamp}`;
  const tiles = Array.from({ length: 60 });
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        pointerEvents: "none",
        overflow: "hidden",
        display: "flex",
        flexWrap: "wrap",
        gap: "80px 60px",
        transform: "rotate(-30deg) scale(1.5)",
        transformOrigin: "center",
        opacity: 0.06,
      }}
    >
      {tiles.map((_, i) => (
        <span
          key={i}
          style={{
            fontSize: "11px",
            fontWeight: 600,
            whiteSpace: "nowrap",
            color: "#1F3864",
            userSelect: "none",
          }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
