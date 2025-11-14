// src/pages/LandingPage.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Starfield from "../components/Starfield.jsx";
import Button from "../components/UIButton";

// Simple wrapper for page background + theme
const Page = ({ children, style }) => (
  <div
    style={{
      minHeight: "100vh",
      color: "white",
      background:
        "radial-gradient(1200px 600px at 20% 0%, #0b1b3a 0%, #050a18 60%, #02040a 100%)",
      overflow: "hidden",
      ...(style || {}),
    }}
  >
    {children}
  </div>
);

// (Using shared Button component imported from src/components/UIButton)

const LandingPage = () => (
  <Page>
    <Starfield />
    {/* Hidden admin link in the upper-right corner */}
    <Link
      to="/admin/login"
      aria-label="Open admin panel"
      style={{
        position: "fixed",
        top: 8,
        right: 8,
        width: 40,
        height: 40,
        opacity: 100,
        zIndex: 50,
        borderRadius: 8,
        outline: "none",
      }}

      onFocus={(e) => {
        // Make it visible on keyboard focus for accessibility
        e.currentTarget.style.opacity = 0.6;
        e.currentTarget.style.background = "#22c55e33";
      }}
      onBlur={(e) => {
        e.currentTarget.style.opacity = 0;
        e.currentTarget.style.background = "transparent";
      }}
    />

    <div style={{ position: "relative", zIndex: 1, padding: "64px 24px" }}>
      <header style={{ textAlign: "center", marginTop: 40 }}>
        <h1
          style={{
            fontSize: 52,
            lineHeight: 1.1,
            marginBottom: 8,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: 1.2,
            textAlign: 'center',
            textShadow:
              '0 0 8px #38bdf8, 0 0 16px #34d399, 0 0 2px #fff',
            WebkitTextStroke: '2px #34d399',
          }}
        >
          <span className="arcade-font"
            style={{
              background: 'linear-gradient(90deg, #34d399 0%, #38bdf8 60%, #0b1b3a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow:
                '0 0 16px #38bdf8, 0 0 24px #34d399, 0 0 4px #fff',
              WebkitTextStroke: '2px #38bdf8',
            }}
          >
            Journey Around Earth
          </span>
        </h1>
        <p style={{ opacity: 0.85, maxWidth: 760, margin: "12px auto 0" }}>
          Explore countries on a 3D globe or play a quick guessing game.
        </p>
      </header>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 36,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Button to="/explore">Explore Countries</Button>
        <Button to="/play">Play Game</Button>
      </div>
    </div>
  </Page>
);

export default LandingPage;
