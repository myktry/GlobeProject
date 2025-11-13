// src/pages/PlayGame.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import InteractiveGlobe from "../components/InteractiveGlobe"; // <-- your globe
import Button, { IconButton } from "../components/UIButton";
// We won't use CountryInfo here; game only needs clicks

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
  const [q, setQ] = useState(null);      // current question
  const [round, setRound] = useState(1); // 1..TOTAL_ROUNDS
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [state, setState] = useState("loading"); // loading | asking | wrong | correct | locked | summary
  const [showCorrect, setShowCorrect] = useState(false);
  const lastQuestionIndexRef = useRef(-1);

  // Normalize country names and handle common aliases
  function normalizeCountryName(name) {
    if (!name) return '';
    const base = name
      .toString()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // strip accents
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ') // remove punctuation/symbols
      .replace(/\s+/g, ' ') // collapse spaces
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
      'cote d’ivoire': 'cote d ivoire',
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
        nextQuestion(); // Automatically proceed to next question
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // When user runs out of attempts (locked), show message briefly then reset the game
  useEffect(() => {
    if (state === "locked") {
      const t = setTimeout(() => {
        // Show a short "game over" then automatically restart
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
        const found =
          map.get(name.toLowerCase()) ||
          null;
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
  

  // Called by your InteractiveGlobe; it sends a country object
  const onCountryClick = (countryData) => {
    if (state === "locked" || state === "summary" || !q) return;

    // Support both shapes: either a plain countryData (your GlobePage),
    // or a GeoJSON feature if InteractiveGlobe passes that.
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
        @keyframes popInGreen {
          0% { transform: scale(0.6) translateY(8px); opacity: 0 }
          70% { transform: scale(1.06) translateY(-6px); opacity: 1 }
          100% { transform: scale(1) translateY(0); opacity: 1 }
        }
        @keyframes popInRed {
          0% { transform: scale(0.9) translateY(0); opacity: 0 }
          50% { transform: scale(1.04) translateY(-4px); opacity: 1 }
          100% { transform: scale(1) translateY(0); opacity: 1 }
        }
        .pill-pop-green { animation: popInGreen 320ms cubic-bezier(.2,.9,.2,1) both; }
        .pill-pop-red { animation: popInRed 260ms cubic-bezier(.2,.9,.2,1) both; }

  /* Revert question card to previous wider layout */
  .question-card { max-width: 1100px !important; padding: 22px 34px !important; border-radius: 16px !important; }
  .bottom-restart-wrap { /* centered by parent flex; no manual offset */ }
        /* smaller width, taller button */
        .bottom-restart-btn { width: 280px; display: inline-flex; justify-content: center; padding: 18px 20px !important; font-size: 18px !important; }
        .bottom-restart-btn.pulse { animation: pulse 2200ms ease-in-out infinite; }

        @keyframes pulse {
          0% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0); }
        }

        @media (max-width: 900px) {
          .question-card { max-width: 760px !important; padding: 18px 22px !important; }
          .bottom-restart-btn { width: 260px; }
        }
        @media (max-width: 640px) {
          .question-card { max-width: 92vw !important; padding: 12px 14px !important; }
          .pill-pop-green, .pill-pop-red { transform-origin: center bottom; }
          .bottom-restart-btn { width: 86vw !important; font-size: 16px !important; padding: 16px 14px !important; }
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
            {/* help removed per design — keep header minimal */}
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

          {/* Large Spacer - Forces space between stats and question */}
          {state !== "summary" && (
            <div style={{ height: '20px' }}></div>
          )}

          {/* Question Section */}
          {state !== "summary" && (
            <div className="px-6 py-8 bg-gradient-to-r from-black/30 via-black/20 to-black/30 backdrop-blur-md">
              <div className="text-center">
                <div
                  className="question-card"
                  style={{
                    display: 'inline-block',
                    maxWidth: 1100,
                    padding: '22px 34px',
                    borderRadius: 16,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                    border: '1px solid rgba(124,58,237,0.10)',
                    boxShadow: '0 14px 40px rgba(2,6,23,0.66), inset 0 1px 0 rgba(255,255,255,0.02)',
                  }}
                >
                  <div className="text-3xl md:text-4xl font-extrabold leading-tight" style={{ color: '#fff', textShadow: '0 6px 28px rgba(124,58,237,0.08), 0 2px 8px rgba(0,0,0,0.6)' }}>
                    {loading
                      ? "Loading question…"
                      : questionBank.length === 0
                        ? (
                          <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                            No questions available at the moment.
                          </span>
                        )
                        : (q?.prompt || "Loading…")}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <small style={{ color: '#9ca3af', fontSize: 14 }}>Tap a country on the globe to answer</small>
                  </div>
                </div>
                {/* Correct feedback that disappears after 3 seconds */}
                {showCorrect && (
                  <div className="mt-4" style={{ display: 'flex', justifyContent: 'center' }}>
                    <div
                      className="pill-pop-green inline-flex items-center gap-3 px-8 py-4 rounded-full font-extrabold"
                      style={{
                        background: 'linear-gradient(90deg,#34d399,#10b981)',
                        color: '#04282b',
                        boxShadow: '0 26px 80px rgba(16,185,129,0.32), inset 0 1px 0 rgba(255,255,255,0.08)',
                        borderRadius: 999
                      }}
                    >
                      <svg width="50" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <circle cx="12" cy="12" r="10" fill="#fff" fillOpacity="0.95" />
                        <path d="M7 13l2.5 2.5L17 8" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span style={{ fontSize: 18, color: '#04282b' }}>Correct!</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {state === "summary" ? (
            <div className="grid place-items-center mt-10 text-center">
              <div className="max-w-md p-6 rounded-2xl bg-white/10">
                <h3 className="text-2xl font-bold">Game Over</h3>
                <p className="mt-2">Final Score</p>
                <div className="text-4xl font-extrabold my-2">
                  {score}/{totalRounds}
                </div>
                {/* Play Again Button - Below Final Score */}
                <button
                  onClick={startGame}
                  style={{
                    padding: "14px 28px",
                    borderRadius: 16,
                    fontWeight: 800,
                    fontSize: 18,
                    letterSpacing: 0.5,
                    textDecoration: "none",
                    display: "inline-block",
                    margin: 8,
                    cursor: "pointer",
                    background: "#7c3aed",
                    color: "#fff",
                    border: "2.5px solid #4c1d95",
                    boxShadow: "0 0 8px 2px #7c3aed, 0 0 16px 4px #7c3aed99, 0 0 2px #fff",
                    outline: "none",
                    transition: "background 0.3s cubic-bezier(.4,0,.2,1), color 0.3s cubic-bezier(.4,0,.2,1), border-color 0.3s cubic-bezier(.4,0,.2,1), box-shadow 0.4s cubic-bezier(.4,0,.2,1), transform .18s cubic-bezier(.4,0,.2,1)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "#a78bfa";
                    e.currentTarget.style.border = "2.5px solid #5b21b6";
                    e.currentTarget.style.boxShadow = "0 0 16px 4px #a78bfa, 0 0 32px 8px #a78bfaBB, 0 0 8px 2px #fff";
                    e.currentTarget.style.transform = "scale(1.07)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "#7c3aed";
                    e.currentTarget.style.border = "2.5px solid #4c1d95";
                    e.currentTarget.style.boxShadow = "0 0 8px 2px #7c3aed, 0 0 16px 4px #7c3aed99, 0 0 2px #fff";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                  tabIndex={0}
                >
                  Play Again
                </button>
              </div>
            </div>
          ) : null}


          {state !== "summary" && (
            <>

              <div className="max-w-4xl mx-auto px-6 mt-4 flex justify-center">
                {state === "wrong" && (
                  <div className="pill-pop-red inline-flex items-center gap-3 px-8 py-4 rounded-full font-extrabold" style={{
                    background: 'linear-gradient(90deg,#f87171,#ef4444)',
                    color: '#fff',
                    boxShadow: '0 26px 80px rgba(239,68,68,0.22), inset 0 1px 0 rgba(255,255,255,0.06)',
                    borderRadius: 999
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <circle cx="12" cy="12" r="10" fill="#fff" fillOpacity="0.95" />
                      <path d="M15 9l-6 6M9 9l6 6" stroke="#dc2626" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: 16, color: '#fff' }}>Incorrect. Try again!</span>
                  </div>
                )}
                {state === "locked" && (
                  <Pill className="bg-red-600/80">❌ Out of attempts. Game Over</Pill>
                )}
              </div>

              {/* Action Buttons (centered, consistent) */}
              <div className="flex justify-center gap-6 px-6 py-4">
                {state === "locked" && (
                  <Button onClick={startGame} variant="danger" size="md">Restart Now</Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

  {/* Fixed bottom restart button (visible during gameplay) */}
  <BottomRestart onRestart={startGame} visible={state !== 'summary'} />

    </>
  );
}

// render BottomRestart inside default export area by exposing it

  // Fixed bottom restart control (visible during gameplay)
  function BottomRestart({ onRestart, visible }) {
    if (!visible) return null;
    return (
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 22, zIndex: 2200, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div className="bottom-restart-wrap" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>
            <Button className="bottom-restart-btn pulse" onClick={() => { setTimeout(() => onRestart(), 60); }} 
            variant="primary" size="lg" style={{ boxShadow: '0 28px 84px rgba(124,58,237,0.28)', borderRadius: 999, background: 'linear-gradient(90deg,#7c3aed,#5b21b6)', color: '#fff', letterSpacing: 0.6, border: '2px solid rgba(76,29,149,0.9)' }}>
              <span style={{ display: 'inline-block', lineHeight: 1, fontWeight: 800, letterSpacing: 0.4 }}>Restart</span>
          </Button>
        </div>
      </div>
    );
  }

function Badge({ children }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-white/10 shadow-sm">
      {children}
    </div>
  );
}
function Pill({ children, className = "" }) {
  return (
    <span className={`px-3 py-2 rounded-lg inline-flex items-center gap-2 font-semibold ${className}`} style={{ boxShadow: '0 6px 18px rgba(2,6,23,0.6)' }}>{children}</span>
  );
}
