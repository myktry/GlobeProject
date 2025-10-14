// src/pages/PlayGame.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import InteractiveGlobe from "../components/InteractiveGlobe"; // <-- your globe
// We won't use CountryInfo here; game only needs clicks

// Optional local questions (used only if backend is unreachable)
const LOCAL_DEMO_QUESTIONS = [
  { prompt: "Which country do Filipinos live?", answer: "Philippines" },
  { prompt: "Where do Japanese live?", answer: "Japan" },
  { prompt: "Which country do Brazilians live?", answer: "Brazil" },
  { prompt: "Which country do Egyptians live?", answer: "Egypt" },
  { prompt: "Which country do Canadians live?", answer: "Canada" },
  { prompt: "Where do French people live?", answer: "France" },
  { prompt: "Which country do Indians live?", answer: "India" },
];

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

  // Debug state changes
  useEffect(() => {
    console.log("Game state changed to:", state);
  }, [state]);

  // ---- data fetch (globe + settings + questions) ----
  useEffect(() => {
    const fetchAll = async () => {
      try {
        // settings
        try {
          const s = await fetch('/api/settings').then(r => r.ok ? r.json() : null);
          if (s && typeof s.rounds === 'number' && typeof s.attempts === 'number') {
            setSettings({ rounds: s.rounds, attempts: s.attempts });
          }
        } catch (_) {}

        // questions
        try {
          const respQs = await fetch('/api/questions');
          if (respQs.ok) {
            setBackendReached(true);
            const qs = await respQs.json();
            const normalized = Array.isArray(qs)
              ? qs.map(q => ({ prompt: q.text ?? '', answer: q.answer ?? '' }))
                  .filter(q => q.prompt && q.answer)
              : [];
            setQuestionBank(normalized);
          } else {
            setBackendReached(false);
            setQuestionBank(LOCAL_DEMO_QUESTIONS);
          }
        } catch (_) {
          setBackendReached(false);
          setQuestionBank(LOCAL_DEMO_QUESTIONS);
        }

        // globe data
        const geoJsonResponse = await fetch(
          "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
        );
        const geoJsonData = await geoJsonResponse.json();

        // Try REST Countries v3.1 minimal fields
        let countriesData = [];
        try {
          const resp = await fetch(
            "https://restcountries.com/v3.1/all?fields=name,population,languages,capital,region"
          );
          if (resp.ok) countriesData = await resp.json();
        } catch (_) {
          countriesData = []; // fall back to basic names
        }

        // Map names for lookup (lowercased)
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
            null; // may be null; we’ll still allow clicking
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
        startGame();
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  function tryAgainSameQuestion() {
    setAttempts(0);
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
            onBackgroundClick={() => {}}
            hoverHighlightOnly={true}
          />
        </div>
        
        {/* Content overlay */}
        <div className="relative z-10">
        {/* Header Section */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-black/30 via-black/20 to-black/30 backdrop-blur-md">
          <Link 
            to="/" 
            className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition-all duration-300 text-white font-bold text-lg shadow-lg hover:shadow-xl border border-purple-500 hover:border-purple-400 transform hover:scale-105 active:scale-95"
        >
          ← Back
        </Link>
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent tracking-wider">
            GEOGRAPHY QUIZ
          </h2>
          <div className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white cursor-pointer border border-white/20">
            [Help]
          </div>
      </div>

        {/* Game Stats Section */}
        {state !== "summary" && (
          <div className="px-6 py-5 bg-gradient-to-r from-black/25 via-black/15 to-black/25 backdrop-blur-md">
            <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-white/10 justify-center">
                <span className="text-purple-300 font-semibold">Round:</span>
                <span className="text-white font-bold text-lg">{round}/{totalRounds}</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-white/10 justify-center">
                <span className="text-green-300 font-semibold">Score:</span>
                <span className="text-white font-bold text-lg">{score}</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-white/10 justify-center">
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
              <div className="text-2xl text-white font-bold tracking-wide leading-relaxed">
                {loading
                  ? "Loading question…"
                  : questionBank.length === 0
                    ? (
                      <span>
                        No questions available at the moment.
                      </span>
                    )
                    : (q?.prompt || "Loading…")}
              </div>
              {/* Correct feedback that disappears after 3 seconds */}
              {showCorrect && (
                <div className="mt-4 animate-fade-in">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-400/50 backdrop-blur-sm">
                    <span className="text-green-300 font-semibold text-lg">✅ Correct!</span>
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

          <div className="flex gap-3 px-5 mt-3 bg-black/20 backdrop-blur-sm py-3">
            {state === "wrong" && (
              <Pill className="bg-red-500/70">Incorrect. Try again!</Pill>
            )}
            {state === "locked" && (
              <Pill className="bg-red-600/80">
                ❌ Out of attempts. Try Again or go Next.
              </Pill>
            )}
          </div>

          {/* Globe Indicator */}


          {/* Action Buttons */}
          <div className="flex justify-center gap-6 px-6 py-4">
            {state === "locked" && (
              <button onClick={tryAgainSameQuestion}
                      className="px-8 py-4 rounded-lg bg-orange-600 hover:bg-orange-700 transition-all duration-300 text-white font-bold text-lg shadow-lg hover:shadow-xl border border-orange-500 hover:border-orange-400 transform hover:scale-105 active:scale-95">
                🔄 Try Again
              </button>
            )}
            {state === "correct" && (
              <button onClick={nextQuestion}
                      className="px-10 py-4 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 transition-all duration-300 text-white font-bold text-lg shadow-lg hover:shadow-xl border border-violet-500 hover:border-violet-400 transform hover:scale-105 active:scale-95">
                ➡️ Next
              </button>
            )}
            {state === "locked" && (
              <button onClick={nextQuestion}
                      className="px-10 py-4 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 transition-all duration-300 text-white font-bold text-lg shadow-lg hover:shadow-xl border border-violet-500 hover:border-violet-400 transform hover:scale-105 active:scale-95">
                ➡️ Next
              </button>
            )}
          </div>

          {/* Restart Game Button */}
          <div className="flex justify-center py-8">
            <button
              onClick={startGame}
              className="px-12 py-5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 transition-all duration-300 text-white font-bold text-xl shadow-lg hover:shadow-xl border border-red-500 hover:border-red-400 transform hover:scale-105 active:scale-95 flex items-center gap-3"
            >
              <span className="text-2xl">🔄</span>
              <span>Restart Game</span>
            </button>
          </div>
        </>
      )}
    </div>
      </div>

    </>
  );
}

function Badge({ children }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-white/10">
      {children}
    </div>
  );
}
function Pill({ children, className = "" }) {
  return (
    <span className={`px-3 py-2 rounded-lg ${className}`}>{children}</span>
  );
}
