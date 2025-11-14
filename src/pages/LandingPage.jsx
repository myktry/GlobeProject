// src/pages/LandingPage.jsx
import React from "react";
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

const LandingPage = () => (
  <Page>
    <Starfield />

    {/* Animated Admin Panel Button */}
    <Link
  to="/admin/login"
  aria-label="Open admin panel"
  style={{
    position: "fixed",
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 12,
    border: "2px solid #34d399",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
    background: "#1f293833", // semi-transparent dark background
    boxShadow: "0 0 8px #34d39955",
    cursor: "pointer",
    animation: "pulse 2s infinite",
    transition: "all 0.2s ease-in-out",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = "#22c55e55"; // brighter on hover
    e.currentTarget.style.boxShadow = "0 0 16px #34d399";
    e.currentTarget.style.transform = "scale(1.15)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = "#1f293833";
    e.currentTarget.style.boxShadow = "0 0 8px #34d39955";
    e.currentTarget.style.transform = "scale(1)";
  }}
>
  {/* Admin icon */}
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM4 20v-2c0-2.21 3.58-4 8-4s8 1.79 8 4v2H4z"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</Link>    

<div style={{ position: "relative", zIndex: 1, padding: "64px 24px" }}>
      <header style={{ textAlign: "center", marginTop: 40 }}>
        <h1
          style={{
            fontSize: 52,
            lineHeight: 1.1,
            marginBottom: 8,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: 1.2,
            textAlign: "center",
            textShadow: "0 0 8px #38bdf8, 0 0 16px #34d399, 0 0 2px #fff",
            WebkitTextStroke: "2px #34d399",
          }}
        >
          <span
            className="arcade-font"
            style={{
              background:
                "linear-gradient(90deg, #34d399 0%, #38bdf8 60%, #0b1b3a 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow:
                "0 0 16px #38bdf8, 0 0 24px #34d399, 0 0 4px #fff",
              WebkitTextStroke: "2px #38bdf8",
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

    {/* Pulse keyframes */}
    <style>
      {`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 8px #34d39955;
          }
          50% {
            box-shadow: 0 0 16px #34d399aa;
          }
          100% {
            box-shadow: 0 0 8px #34d39955;
          }
        }
      `}
    </style>
  </Page>
);

export default LandingPage;
