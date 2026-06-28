import React from "react";
import "./LandingPage.css";
import HeroSection from "./components/HeroSection";

export default function LandingPage() {
  return (
    <main className="sanctum-landing">
      <nav className="sanctum-nav">
        <div className="sanctum-logo">Sanctum</div>

        <div className="sanctum-nav-links">
          <a href="/login">Login</a>
          <a href="/register" className="sanctum-nav-cta">
            Create World
          </a>
        </div>
      </nav>

      <HeroSection />
    </main>
  );
} 