import React, { useEffect } from "react";
import Navbar from "./components/Navbar.jsx";
import AmbientBackground from "./components/AmbientBackground.jsx";
import Hero from "./components/Hero.jsx";
import BentoGrid from "./components/BentoGrid.jsx";
import ProductShowcase from "./components/ProductShowcase.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import IntelligenceSection from "./components/IntelligenceSection.jsx";
import CapabilitiesStrip from "./components/CapabilitiesStrip.jsx";
import CtaSection from "./components/CtaSection.jsx";
import Footer from "./components/Footer.jsx";
import { useScrollReveal } from "./useScrollReveal.js";

export default function LandingPage() {
  useScrollReveal();

  useEffect(() => {
    document.title = "NIVARA — Intelligent Property Operations Platform";
  }, []);

  return (
    <div className="relative min-h-screen bg-[#090d16] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* 0. Ambient Slow-Moving Aurora & Grid Background (Sits behind everything) */}
      <AmbientBackground />

      {/* Foreground Content Stack */}
      <div className="relative z-10">
        {/* 1. Sticky Navigation Bar */}
        <Navbar />

        {/* 2. Hero Section with Operations Network Topology & live Command Center preview */}
        <Hero />

        {/* 3. Product Capabilities Bento Grid with Spotlight effects */}
        <BentoGrid />

        {/* 4. Layered Product Surfaces Showcase */}
        <ProductShowcase />

        {/* 5. How It Works 3-Step Lifecycle */}
        <HowItWorks />

        {/* 6. Intelligence & Future AI Triage Architecture */}
        <IntelligenceSection />

        {/* 7. Real Technical Capabilities & Trust Strip */}
        <CapabilitiesStrip />

        {/* 8. Final CTA Section */}
        <CtaSection />

        {/* 9. SaaS Footer */}
        <Footer />
      </div>
    </div>
  );
}
