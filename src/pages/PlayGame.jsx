// src/pages/PlayGame.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import InteractiveGlobe from "../components/InteractiveGlobe";
import Button, { IconButton } from "../components/UIButton";

export default function PlayGame() {
  // ==== reuse your GlobePage data shape ====
  const [countries, setCountries] = useState({ features: [] });
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ rounds: 3, attempts: 2 });
  const [questionBank, setQuestionBank] = useState([]);
  const [backendReached, setBackendReached] = useState(true);

  // Effective rounds cannot exceed available questions
  const totalRounds = Math.min(settings.rounds, Array.isArray(questionBank) ? questionBank.length : 0);

  // ==== game state ====
  const [q, setQ] = useState(null);
  const [round, setRound] = useState(1);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [state, setState] = useState("loading");
  const [showCorrect, setShowCorrect] = useState(false);
  const lastQuestionIndexRef = useRef(-1);

  // Normalize country names and handle common aliases
  function normalizeCountryName(name) {
    if (!name) return '';
    const base = name
      .toString()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const aliases = {
      'united states of america': 'united states',
      'usa': 'united states',
      'us': 'united states',
      'u s a': 'united states',
      'u s': 'united states',
      'united kingdom of great britain and northern ireland': 'united kingdom',
      'uk': 'united kingdom',
      'u k': 'united kingdom',
      'england': 'united kingdom',
      'ivory coast': 'cote d ivoire',
      'cote d\'ivoire': 'cote d ivoire',
      'cote d ivoire': 'cote d ivoire',
      'swaziland': 'eswatini',
      'east timor': 'timor leste',
      'burma': 'myanmar',
      'vatican city': 'holy see',
      'russia': 'russian federation'
    };
    return aliases[base] || base;
  }

  // Handle correct state and auto-proceed to next question after 2 seconds
  useEffect(() => {
    if (state === "correct") {
      setShowCorrect(true);
      const timer = setTimeout(() => {
        setShowCorrect(false);
        nextQuestion();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // When user runs out of attempts (locked), show message briefly then reset the game
  useEffect(() => {
    if (state === "locked") {
      const t = setTimeout(() => {
        startGame();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [state]);

  // When user answers wrong, show the 'Incorrect' pill briefly then automatically return to asking
  useEffect(() => {
    if (state === 'wrong') {
      const t = setTimeout(() => {
        setState('asking');
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [state]);

  // Debug state changes
  useEffect(() => {
    console.log("Game state changed to:", state);
  }, [state]);

  useEffect(() => {
    console.log("Loaded questionBank:", questionBank);
    console.log("Current question:", q);
  }, [questionBank, q]);

  // ---- data fetch (globe + settings + questions) ----
  async function fetchAll() {
    try {
      // ✅ fetch settings (always latest)
      const s = await fetch("http://localhost:8000/api/settings").then(r => r.ok ? r.json() : null);
      if (s && typeof s.rounds === "number" && typeof s.attempts === "number") {
        setSettings({ rounds: s.rounds, attempts: s.attempts });
      }

      // ✅ fetch latest questions
      const respQs = await fetch("http://localhost:8000/api/questions");
      if (respQs.ok) {
        setBackendReached(true);
        const qs = await respQs.json();
        const normalized = Array.isArray(qs)
          ? qs.map(q => ({ prompt: q.text ?? "", answer: q.answer ?? "" }))
            .filter(q => q.prompt && q.answer)
          : [];
        setQuestionBank(normalized);
      }

      // ✅ globe data
      const geoJsonResponse = await fetch(
        "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
      );
      const geoJsonData = await geoJsonResponse.json();

      let countriesData = [];
      try {
        const resp = await fetch(
          "https://restcountries.com/v3.1/all?fields=name,population,languages,capital,region"
        );
        if (resp.ok) countriesData = await resp.json();
      } catch (_) { }

      const map = new Map();
      countriesData.forEach((c) => {
        if (c?.name?.common) map.set(c.name.common.toLowerCase(), c);
      });

      const features = geoJsonData.features.map((f) => {
        const name =
          f.properties?.NAME ||
          f.properties?.name ||
          f.properties?.ADMIN ||
          "Unknown Country";
        const found = map.get(name.toLowerCase()) || null;
        return {
          ...f,
          properties: {
            ...f.properties,
            name,
            countryData:
              found ||
              {
                name: { common: name, official: name },
                capital: [],
                population: 0,
                region: "—",
                languages: {},
              },
          },
        };
      });

      setCountries({ features });
    } catch (err) {
      console.error("Game: failed to load globe data", err);
    } finally {
      setLoading(false);
    }
  }

  // ✅ run only once on mount
  useEffect(() => {
    fetchAll();
  }, []);

  // ✅ Start the game automatically once questions are loaded
  useEffect(() => {
    if (!loading && questionBank.length > 0 && !q) {
      console.log("✅ Starting game now — questions loaded:", questionBank.length);
      startGame();
    }
  }, [loading, questionBank]);

  // ---- game control ----
  function randomQuestion() {
    if (!Array.isArray(questionBank) || questionBank.length === 0) return null;
    if (questionBank.length === 1) {
      lastQuestionIndexRef.current = 0;
      return questionBank[0];
    }
    let idx = Math.floor(Math.random() * questionBank.length);
    if (idx === lastQuestionIndexRef.current) {
      idx = (idx + 1) % questionBank.length;
    }
    lastQuestionIndexRef.current = idx;
    return questionBank[idx];
  }

  function startGame() {
    setScore(0);
    setRound(1);
    setAttempts(0);
    if (questionBank.length > 0) {
      setQ(randomQuestion());
      setState("asking");
    } else {
      setQ(null);
      setState("asking");
    }
  }

  function nextQuestion() {
    if (round >= totalRounds) {
      setState("summary");
      return;
    }
    setRound((r) => r + 1);
    setAttempts(0);
    setQ(randomQuestion());
    setState("asking");
  }

  // Called by your InteractiveGlobe
  const onCountryClick = (countryData) => {
    if (state === "locked" || state === "summary" || !q) return;

    const clickedName =
      countryData?.name?.common ||
      countryData?.properties?.name ||
      countryData?.properties?.countryData?.name?.common ||
      "";

    const correct =
      normalizeCountryName(clickedName) === normalizeCountryName(q.answer);

    if (correct) {
      setScore((s) => s + 1);
      setState("correct");
      return;
    }
    setAttempts((a) => {
      const n = a + 1;
      if (n >= settings.attempts) setState("locked");
      else setState("wrong");
      return n;
    });
  };

  return (
    <>
      <style>{`
        @keyframes popInModal {
          0% { transform: scale(0.5) translateY(-50px); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        
        .arcade-modal {
          animation: popInModal 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9999;
          padding: 30px 50px;
          border-radius: 20px;
          font-family: 'Arial Black', sans-serif;
          text-align: center;
          box-shadow: 
            0 0 0 4px rgba(0,0,0,0.8),
            0 0 0 8px currentColor,
            0 20px 50px rgba(0,0,0,0.5),
            inset 0 2px 0 rgba(255,255,255,0.3);
        }
        
        .arcade-modal.correct {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          border: 4px solid #064e3b;
        }
        
        .arcade-modal.wrong {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #fff;
          border: 4px solid #7f1d1d;
          animation: popInModal 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), shake 0.5s ease-in-out 0.3s;
        }
        
        .arcade-modal.locked {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #fff;
          border: 4px solid #312e81;
        }
        
        .arcade-modal-text {
          font-size: 32px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 2px;
          text-shadow: 3px 3px 0 rgba(0,0,0,0.4);
          margin: 0;
        }
        
        .arcade-modal-icon {
          font-size: 48px;
          margin-bottom: 10px;
          display: block;
          animation: bounce 0.6s ease-in-out 0.2s;
        }

        /* Question card with visible background */
        .question-card { 
          max-width: 100% !important; 
          padding: 16px 28px !important; 
          border-radius: 16px !important;
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 13, 50, 0.92) 100%) !important;
          border: 4px solid rgba(124, 58, 237, 0.4) !important;
          box-shadow: 
            0 0 0 2px rgba(0,0,0,0.8),
            0 20px 60px rgba(0,0,0,0.6),
            inset 0 2px 0 rgba(255,255,255,0.1) !important;
          backdrop-filter: blur(10px) !important;
        }
        
        .question-section {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 40px);
          max-width: 1200px;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }
        
        .question-content {
          flex: 0 1 auto;
          max-width: 700px;
        }
        
        /* Arcade-style buttons */
        .arcade-btn {
          position: relative;
          padding: 16px 32px;
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Arial Black', sans-serif;
          box-shadow: 
            0 0 0 3px rgba(0,0,0,0.8),
            0 0 0 6px currentColor,
            0 8px 0 rgba(0,0,0,0.4),
            0 12px 20px rgba(0,0,0,0.3);
        }
        
        .arcade-btn:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 0 0 3px rgba(0,0,0,0.8),
            0 0 0 6px currentColor,
            0 10px 0 rgba(0,0,0,0.4),
            0 14px 25px rgba(0,0,0,0.4);
        }
        
        .arcade-btn:active {
          transform: translateY(4px);
          box-shadow: 
            0 0 0 3px rgba(0,0,0,0.8),
            0 0 0 6px currentColor,
            0 4px 0 rgba(0,0,0,0.4),
            0 8px 15px rgba(0,0,0,0.3);
        }
        
        .arcade-btn-restart {
          background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
          color: #fff;
          border: none;
        }
        
        .arcade-btn-restart:hover {
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
        }
        
        .arcade-btn-next {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          border: none;
        }
        
        .arcade-btn-next:hover {
          background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
        }
        
        .arcade-btn-skip {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #fff;
          border: none;
        }
        
        .arcade-btn-skip:hover {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        }
        
        .side-btn {
          flex-shrink: 0;
          padding: 14px 20px !important;
          min-width: 140px;
        }

        @media (max-width: 900px) {
          .question-card { padding: 14px 24px !important; }
          .question-section { bottom: 20px; width: calc(100% - 20px); gap: 14px; }
          .side-btn { min-width: 120px; padding: 12px 16px !important; font-size: 16px; }
          .arcade-modal { padding: 25px 40px; }
          .arcade-modal-text { font-size: 26px; }
        }
        @media (max-width: 640px) {
          .question-card { padding: 12px 20px !important; }
          .question-section { 
            flex-direction: column; 
            bottom: 15px; 
            gap: 10px;
          }
          .side-btn { min-width: 100%; padding: 12px 20px !important; font-size: 15px; }
          .arcade-modal { padding: 20px 30px; }
          .arcade-modal-text { font-size: 22px; }
          .arcade-modal-icon { font-size: 36px; }
        }
      `}</style>
      
      <div className="min-h-screen text-white relative"
        style={{
          background:
            "radial-gradient(1200px 600px at 20% 0%, #0b1b3a 0%, #050a18 60%, #02040a 100%)",
        }}>
        {/* Globe background that extends behind everything */}
        <div className="absolute inset-0 z-0">
          <InteractiveGlobe
            countries={countries}
            onCountryClick={onCountryClick}
            selectedCountry={null}
            loading={loading}
            onBackgroundClick={() => { }}
          />
        </div>

        {/* Content overlay */}
        <div className="relative z-10">
          {/* Header Section */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-black/30 via-black/20 to-black/30 backdrop-blur-md">
  <Link
    to="/"
    aria-label="Back to Home"
    className="inline-flex items-center gap-2"
    style={{ marginLeft: "12px", marginTop: "8px" }}
  >

              <IconButton ariaLabel="Back to home" size={40} style={{ backdropFilter: 'blur(6px)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </IconButton>
            </Link>
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent tracking-wider">
              GEOGRAPHY QUIZ
            </h2>
            <div style={{ width: '40px' }}></div>
          </div>

          {/* Game Stats Section */}
          {state !== "summary" && (
            <div className="px-6 py-5 bg-gradient-to-r from-black/25 via-black/15 to-black/25 backdrop-blur-md">
              <div className="grid grid-cols-3 gap-2 max-w-4xl mx-auto">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 justify-center">
                  <span className="text-purple-300 font-semibold">Round:</span>
                  <span className="text-white font-bold text-lg">{round}/{totalRounds}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 justify-center">
                  <span className="text-green-300 font-semibold">Score:</span>
                  <span className="text-white font-bold text-lg">{score}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 justify-center">
                  <span className="text-yellow-300 font-semibold">Attempts:</span>
                  <span className="text-white font-bold text-lg">{Math.max(0, settings.attempts - attempts)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Large Spacer */}
          {state !== "summary" && (
            <div style={{ height: '60px' }}></div>
          )}

          {/* Question Section - Fixed at bottom */}
          {state !== "summary" && (
            <div className="question-section">
              {/* Left: Restart Button */}
              <button onClick={startGame} className="arcade-btn arcade-btn-restart side-btn">
                🔄 Restart
              </button>
              
              {/* Center: Question */}
  <div className="question-content">
    <div className="question-card">
      <div className="text-xl md:text-2xl font-extrabold leading-tight text-center" style={{ color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.8), 0 0 30px rgba(124,58,237,0.3)' }}>
        {loading
          ? "Loading question…"
          : questionBank.length === 0
            ? <span style={{ color: '#cbd5e1', fontWeight: 600 }}>No questions available.</span>
            : (q?.prompt || "Loading…")}
      </div>
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <small style={{ color: '#a5b4fc', fontSize: 13, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>Click a country on the globe to answer</small>
      </div>
    </div>
  </div>
              
              {/* Right: Skip Button (always visible) */}
  <div className="side-btn" style={{ minWidth: '140px' }}>
    <button onClick={nextQuestion} className="arcade-btn arcade-btn-skip" style={{ width: '100%' }}>
      ⏭ Skip
    </button>
  </div>
</div>
          )}

          {/* Summary Screen */}
          {state === "summary" ? (
            <div className="grid place-items-center mt-10 text-center">
              <div className="max-w-md p-6 rounded-2xl bg-white/10">
                <h3 className="text-2xl font-bold">Game Over</h3>
                <p className="mt-2">Final Score</p>
                <div className="text-4xl font-extrabold my-2">
                  {score}/{totalRounds}
                </div>
                <button
                  onClick={startGame}
                  className="arcade-btn arcade-btn-restart"
                  style={{ marginTop: '20px' }}
                >
                  Play Again
                </button>
              </div>
            </div>
          ) : null}

          {/* Arcade Modal Feedback and Action Buttons */}
          {state !== "summary" && (
            <>
              {/* Arcade-style modal feedback */}
              {showCorrect && (
  <div className="arcade-modal correct">
    <span className="arcade-modal-icon">✓</span>
    <p className="arcade-modal-text">Correct!</p>
  </div>
)}
              
              {state === "wrong" && (
  <div className="arcade-modal wrong">
    <span className="arcade-modal-icon">✗</span>
    <p className="arcade-modal-text">Try Again!</p>
  </div>
)}
              
              {state === "locked" && (
  <div className="arcade-modal locked">
    <span className="arcade-modal-icon">💀</span>
    <p className="arcade-modal-text">Game Over!</p>
  </div>
)}
            </>
          )}
        </div>
      </div>
    </>
  );
}