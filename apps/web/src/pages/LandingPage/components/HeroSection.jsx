import React from "react";

export default function HeroSection() {
  return (
    <section className="sanctum-hero">
      <div className="sanctum-hero-glow"></div>

      <div className="sanctum-hero-content">
        <p className="sanctum-eyebrow">Build Belonging</p>

        <h1>
          Your community doesn't need another server.
          <span> It needs a world.</span>
        </h1>

        <p className="sanctum-hero-text">
          Sanctum helps creators build beautiful digital homes where members
          belong, brands come alive, and communities grow together.
        </p>

        <div className="sanctum-hero-actions">
          <a href="/register" className="sanctum-btn sanctum-btn-primary">
            Create Your World
          </a>

          <a href="/login" className="sanctum-btn sanctum-btn-secondary">
            Enter Sanctum
          </a>
        </div>
      </div>
    </section>
  );
} 