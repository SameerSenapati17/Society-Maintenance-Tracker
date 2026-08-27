import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ArrowRight, Shield } from "lucide-react";
import NivaraLogo from "../../components/NivaraLogo.jsx";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Platform", href: "#overview" },
    { label: "Capabilities", href: "#capabilities" },
    { label: "Showcase", href: "#showcase" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Intelligence", href: "#intelligence" }
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "border-b border-slate-800/90 bg-[#090d16]/90 backdrop-blur-md shadow-card"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <Link to="/" className="flex items-center gap-2 focus:outline-none">
          <NivaraLogo size={28} subtitle="Property Operations" />
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs font-semibold text-slate-300 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: Auth Action CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-white"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="group inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-subtle transition-all hover:bg-indigo-500 hover:shadow-indigo-500/25 active:scale-95 cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            to="/login"
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-300"
          >
            Sign In
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-800 bg-[#090d16] px-4 py-5 shadow-elevated md:hidden animate-fade-in">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
              <Link
                to="/register"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>Get Started as Resident / Admin</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
