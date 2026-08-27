import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Megaphone,
  Sparkles,
  Search,
  LogOut,
  Menu,
  X,
  Shield,
  User
} from "lucide-react";

import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "../components/NotificationBell.jsx";
import CommandPalette from "../components/CommandPalette.jsx";
import NivaraLogo from "../components/NivaraLogo.jsx";
import { getFirstName } from "../utils/format.js";
import { cn } from "../utils/cn.js";

export default function AppLayout({ role, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const homePath = role === "admin" ? "/admin/dashboard" : "/resident/dashboard";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const sections =
    role === "admin"
      ? [
          {
            title: "OVERVIEW",
            items: [{ to: "/admin/dashboard", label: "Command Center", icon: LayoutDashboard }]
          },
          {
            title: "OPERATIONS",
            items: [{ to: "/admin/complaints", label: "Operations Board", icon: ClipboardList }]
          },
          {
            title: "COMMUNICATION",
            items: [{ to: "/admin/notices", label: "Notices & Broadcasts", icon: Megaphone }]
          },
          {
            title: "INTELLIGENCE",
            items: [
              {
                to: "/admin/ai-triage",
                label: "AI Triage",
                icon: Sparkles
              }
            ]
          }
        ]
      : [
          {
            title: "OVERVIEW",
            items: [{ to: "/resident/dashboard", label: "Resident Portal", icon: LayoutDashboard }]
          },
          {
            title: "OPERATIONS",
            items: [
              { to: "/resident/complaints", label: "My Requests", icon: ClipboardList },
              { to: "/resident/complaints/new", label: "Submit Request", icon: PlusCircle }
            ]
          },
          {
            title: "COMMUNICATION",
            items: [{ to: "/resident/notices", label: "Community Notices", icon: Megaphone }]
          }
        ];


  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Nivara Brand Header */}
        <div className="border-b border-slate-800/80 px-5 py-5">
          <Link
            to={homePath}
            className="block focus:outline-none"
            onClick={() => setMobileOpen(false)}
          >
            <NivaraLogo size={30} subtitle="Property Operations" />
          </Link>
        </div>

        {/* Command Palette Trigger */}
        <div className="px-3.5 pt-3.5 pb-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-800/90 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-800/90 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Search size={14} className="text-slate-400" />
              <span>Quick command...</span>
            </span>
            <kbd className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-5 px-3.5 py-3">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                if (item.disabled) {
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 cursor-not-allowed opacity-60"
                      title="Available in upcoming release"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className="text-slate-600" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded-md border border-slate-800 bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/admin/dashboard" || item.to === "/resident/dashboard"}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150",
                        isActive
                          ? "bg-brand-600 font-semibold text-white shadow-subtle"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      )
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* User Footer Card */}
      <div className="border-t border-slate-800/80 p-3.5">
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 p-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 font-sans text-xs font-bold text-white shadow-subtle">
            {getFirstName(user?.name)?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{user?.name}</p>
            <p className="truncate text-[10px] text-slate-400">
              <span className="capitalize">{user?.role || role}</span> · {user?.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 antialiased">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#090d16] lg:flex border-r border-slate-800/80">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#090d16] transition-transform duration-200 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64 flex min-h-screen flex-col">
        {/* Top App Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md shadow-xs sm:px-6 lg:px-8">
          {/* Mobile menu trigger + Logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <Link to={homePath} className="flex items-center">
              <NivaraLogo size={24} subtitle="" />
            </Link>
          </div>

          {/* Desktop Breadcrumb/Context */}
          <div className="hidden items-center gap-2 lg:flex">
            <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
              {role === "admin" ? <Shield size={12} className="text-indigo-600" /> : <User size={12} className="text-indigo-600" />}
              <span>{role === "admin" ? "Operations Console" : "Resident Portal"}</span>
            </span>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
            >
              <Search size={14} className="text-slate-400" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400 sm:inline-block shadow-xs">
                Ctrl K
              </kbd>
            </button>

            <NotificationBell role={role} variant="light" />

            <div className="hidden items-center gap-2 border-l border-slate-200/90 pl-3 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-xs">
                {getFirstName(user?.name)?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="max-w-[130px] truncate text-xs font-semibold text-slate-800">
                {user?.name}
              </span>
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        role={role}
      />
    </div>
  );
}
