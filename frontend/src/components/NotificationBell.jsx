import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { complaintService } from "../services/complaintService.js";
import { formatRelativeTime } from "../utils/format.js";

export default function NotificationBell({ role, variant = "light" }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    complaintService
      .getNotifications()
      .then((data) => setNotifications(data.notifications || []))
      .catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, []);

  const basePath = role === "admin" ? "/admin/complaints" : "/resident/complaints";
  const unreadCount = notifications.length;

  const btnClass =
    variant === "dark"
      ? "relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
      : "relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        className={btnClass}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} updates` : ""}`}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white shadow-subtle">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] animate-fade-in rounded-2xl border border-slate-200/80 bg-white p-1 shadow-modal">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Notifications & Updates</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                {unreadCount} recent
              </span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100/80">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Bell size={22} className="mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                No recent notifications or announcements
              </div>
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
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 rounded-xl"
                  onClick={() => setOpen(false)}
                >
                  <div
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.type === "important_notice" ? "bg-amber-500 ring-4 ring-amber-50" : "bg-indigo-600 ring-4 ring-indigo-50"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 leading-snug">{n.message}</p>
                    <p className="mt-1 text-[10px] text-slate-400 font-medium">
                      {formatRelativeTime(n.timestamp)}
                    </p>
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

