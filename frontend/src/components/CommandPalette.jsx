import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ClipboardList,
  Flame,
  Home,
  Megaphone,
  PlusCircle,
  Search,
  Sparkles,
  X
} from "lucide-react";

export default function CommandPalette({ isOpen, onClose, role }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const adminCommands = [
    {
      id: "admin-dash",
      title: "Dashboard",
      subtitle: "Overview & operational analytics",
      icon: Home,
      action: () => navigate("/admin/dashboard")
    },
    {
      id: "admin-complaints",
      title: "Complaints Workspace",
      subtitle: "View and manage all society complaints",
      icon: ClipboardList,
      action: () => navigate("/admin/complaints")
    },
    {
      id: "admin-overdue",
      title: "Overdue Complaints",
      subtitle: "Filter complaints exceeding SLA threshold",
      icon: AlertTriangle,
      action: () => navigate("/admin/complaints?overdue=true")
    },
    {
      id: "admin-high-priority",
      title: "High Priority Issues",
      subtitle: "Filter critical complaints needing immediate action",
      icon: Flame,
      action: () => navigate("/admin/complaints?priority=High")
    },
    {
      id: "admin-notices",
      title: "Society Notices",
      subtitle: "Manage and broadcast announcements",
      icon: Megaphone,
      action: () => navigate("/admin/notices")
    },
    {
      id: "admin-ai-triage",
      title: "AI Operations Triage",
      subtitle: "Evaluate incoming requests with Gemini intelligence",
      icon: Sparkles,
      action: () => navigate("/admin/ai-triage")
    }
  ];

  const residentCommands = [
    {
      id: "res-dash",
      title: "Dashboard",
      subtitle: "Your society summary & complaints",
      icon: Home,
      action: () => navigate("/resident/dashboard")
    },
    {
      id: "res-new",
      title: "Report an Issue",
      subtitle: "Submit a new maintenance request",
      icon: PlusCircle,
      action: () => navigate("/resident/complaints/new")
    },
    {
      id: "res-complaints",
      title: "My Complaints",
      subtitle: "Track your active & resolved requests",
      icon: ClipboardList,
      action: () => navigate("/resident/complaints")
    },
    {
      id: "res-notices",
      title: "Society Notices",
      subtitle: "Read official announcements",
      icon: Megaphone,
      action: () => navigate("/resident/notices")
    }
  ];

  const allCommands = role === "admin" ? adminCommands : residentCommands;

  const filteredCommands = allCommands.filter((cmd) => {
    const text = `${cmd.title} ${cmd.subtitle}`.toLowerCase();
    return text.includes(query.toLowerCase().trim());
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-16 backdrop-blur-xs transition-opacity duration-150 sm:pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="relative flex items-center border-b border-slate-100 px-4 py-3">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            autoFocus
            className="w-full border-0 bg-transparent px-3 py-1 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="rounded p-1 text-slate-400 hover:text-slate-600"
              aria-label="Clear query"
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No matching commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    isSelected ? "bg-brand-600 text-white shadow-subtle" : "text-slate-700 hover:bg-slate-50"
                  }`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${isSelected ? "text-white" : "text-slate-800"}`}>
                      {cmd.title}
                    </p>
                    <p className={`text-xs ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                      {cmd.subtitle}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>Navigate <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono shadow-xs">↑</kbd><kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono shadow-xs">↓</kbd></span>
            <span>Select <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono shadow-xs">↵</kbd></span>
          </div>
          <span>Close <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono shadow-xs">ESC</kbd></span>
        </div>
      </div>
    </div>
  );
}

