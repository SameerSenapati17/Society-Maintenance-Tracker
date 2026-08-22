import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  ClipboardList,
  Home,
  LogOut,
  Megaphone,
  Menu,
  PlusCircle,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "../components/NotificationBell.jsx";
import { getFirstName } from "../utils/format.js";

export default function AppLayout({ role, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav =
    role === "admin"
      ? [
          { to: "/admin/dashboard", label: "Dashboard", icon: Home },
          { to: "/admin/complaints", label: "Complaints", icon: ClipboardList },
          { to: "/admin/notices", label: "Notices", icon: Megaphone }
        ]
      : [
          { to: "/resident/dashboard", label: "Dashboard", icon: Home },
          { to: "/resident/complaints", label: "My Complaints", icon: ClipboardList },
          { to: "/resident/complaints/new", label: "Report Issue", icon: PlusCircle },
          { to: "/resident/notices", label: "Notices", icon: Bell }
        ];

  const homePath = role === "admin" ? "/admin/dashboard" : "/resident/dashboard";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const sidebarContent = (
    <>
      <div className="border-b border-slate-700/60 px-5 py-5">
        <Link to={homePath} className="block" onClick={() => setMobileOpen(false)}>
          <span className="text-lg font-bold tracking-tight text-white">SocietyOS</span>
          <span className="mt-0.5 block text-xs text-slate-400">Maintenance & Community Operations</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {role === "admin" && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Operations
          </p>
        )}
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-active text-white"
                    : "text-slate-300 hover:bg-sidebar-hover hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-700/60 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
            {getFirstName(user?.name)?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
          <NotificationBell role={role} />
        </div>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-sidebar-hover hover:text-white"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-mist">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-sidebar-hover hover:text-white"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <Link to={homePath} className="font-bold text-ink">
            SocietyOS
          </Link>
          <NotificationBell role={role} variant="light" />
        </header>

        <main className="animate-fade-in p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
