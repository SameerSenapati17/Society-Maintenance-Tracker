import React from "react";
import { Link } from "react-router-dom";
import NivaraLogo from "../../components/NivaraLogo.jsx";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-[#070a12] py-14 text-slate-400 text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <NivaraLogo size={26} subtitle="Property Operations" />
            <p className="max-w-sm text-slate-400 leading-relaxed text-[11px] pt-1">
              NIVARA is the intelligent property operations platform designed to eliminate maintenance chaos for residential communities, building managers, and resident councils.
            </p>
          </div>

          {/* Column 1: Platform */}
          <div>
            <span className="font-bold text-white uppercase tracking-wider text-[10px] block mb-3">
              Platform
            </span>
            <ul className="space-y-2">
              <li>
                <a href="#overview" className="hover:text-white transition-colors">
                  Overview
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-white transition-colors">
                  Capabilities
                </a>
              </li>
              <li>
                <a href="#showcase" className="hover:text-white transition-colors">
                  Product Surfaces
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Operations & Intelligence */}
          <div>
            <span className="font-bold text-white uppercase tracking-wider text-[10px] block mb-3">
              Operations
            </span>
            <ul className="space-y-2">
              <li>
                <span className="text-slate-400">Work Orders</span>
              </li>
              <li>
                <span className="text-slate-400">SLA Engine</span>
              </li>
              <li>
                <span className="text-slate-400">Notice Broadcasts</span>
              </li>
              <li>
                <a href="#intelligence" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  AI Triage (Phase 3)
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Access */}
          <div>
            <span className="font-bold text-white uppercase tracking-wider text-[10px] block mb-3">
              Account
            </span>
            <ul className="space-y-2">
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Sign In to Console
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Create Resident Account
                </Link>
              </li>
              <li>
                <span className="text-slate-400">Role-Based Access</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-slate-800/80 pt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>© 2026 Nivara. All rights reserved.</p>
          <div className="flex gap-6">
            <span>Intelligent Property Operations Platform</span>
            <span className="font-mono">v2.4</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
