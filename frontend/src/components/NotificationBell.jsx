import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "../services/api.js";
import { formatRelativeTime } from "../utils/format.js";

export default function NotificationBell({ role, variant = "dark" }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    api
      .get("/complaints/notifications")
      .then((res) => setNotifications(res.data.data.notifications))
      .catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const basePath = role === "admin" ? "/admin/complaints" : "/resident/complaints";
  const unreadCount = notifications.length;

  const btnClass =
    variant === "dark"
      ? "relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-sidebar-hover hover:text-white"
      : "relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100";

  return (
    <div className="relative" ref={ref}>
      <button
        className={btnClass}
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} items` : ""}`}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 animate-fade-in rounded-xl border border-slate-200 bg-white shadow-elevated">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">Notifications</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No recent notifications</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  to={
                    n.complaintId
                      ? `${basePath}/${n.complaintId}`
                      : role === "admin"
                        ? "/admin/notices"
                        : "/resident/notices"
                  }
                  className="flex gap-3 border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50 last:border-0"
                  onClick={() => setOpen(false)}
                >
                  <div
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.type === "important_notice" ? "bg-amber-500" : "bg-brand"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700">{n.message}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{formatRelativeTime(n.timestamp)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
