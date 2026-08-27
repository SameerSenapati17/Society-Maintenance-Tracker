import React from "react";
import { KeyRound, Users, History, Timer, Image, Mail } from "lucide-react";

export default function CapabilitiesStrip() {
  const capabilities = [
    {
      icon: KeyRound,
      title: "JWT Authentication",
      desc: "Bcrypt salted hashing & stateless token auth"
    },
    {
      icon: Users,
      title: "Role-Based Access Control",
      desc: "Strict resident vs admin privilege isolation"
    },
    {
      icon: History,
      title: "Immutable Status History",
      desc: "Tamper-proof audit logs for every resolution"
    },
    {
      icon: Timer,
      title: "Automated SLA Engine",
      desc: "Real-time overdue calculation & alerting"
    },
    {
      icon: Image,
      title: "Cloud Photo Evidence",
      desc: "Secure media storage for issue verification"
    },
    {
      icon: Mail,
      title: "SMTP Automated Delivery",
      desc: "Instant email updates on ticket milestones"
    }
  ];

  return (
    <section className="relative bg-[#090d16]/85 py-20 text-white border-t border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal-on-scroll text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Engineered for High-Reliability Operations
          </span>
          <h2 className="mt-2 text-xl sm:text-2xl font-bold text-white">
            Built on robust, production-grade architecture.
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {capabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className={`reveal-on-scroll delay-${(idx % 3 + 1) * 100} interactive-card flex flex-col items-center text-center rounded-xl border border-slate-800/90 bg-[#0b0f19] p-4`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 mb-3">
                  <Icon size={18} />
                </div>
                <h3 className="text-xs font-bold text-white leading-snug">{cap.title}</h3>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{cap.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
