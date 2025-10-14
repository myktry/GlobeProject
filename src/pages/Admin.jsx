// src/pages/Admin.jsx
import React from "react";
import { Link } from "react-router-dom";

const API_BASE = "http://localhost:8000"; // ✅ Backend base URL

const Admin = () => {
  const [settings, setSettings] = React.useState({ rounds: 3, attempts: 2 });
  const [questions, setQuestions] = React.useState([]);

  const [editSettings, setEditSettings] = React.useState({ rounds: 3, attempts: 2 });
  const [newQuestion, setNewQuestion] = React.useState({ text: "", answer: "" });
  const [savingQuestion, setSavingQuestion] = React.useState(false);
  const [editingQuestionId, setEditingQuestionId] = React.useState(null);
  const [editingQuestion, setEditingQuestion] = React.useState({ text: "", answer: "" });
  const [countryOptions, setCountryOptions] = React.useState([]);
  const [toast, setToast] = React.useState("");

  React.useEffect(() => {
    // ✅ check authentication + load settings + questions
    Promise.all([
      fetch(`${API_BASE}/api/me`, { credentials: "include" }).then(r => r.json())
    ])
      .then(([me]) => {
        if (!me?.authenticated) {
          window.location.href = "/admin/login";
          return;
        }
        Promise.all([
          fetch(`${API_BASE}/api/settings`, { credentials: "include" }).then(r => r.json()),
          fetch(`${API_BASE}/api/questions`, { credentials: "include" }).then(r => r.json()),
        ])
          .then(([s, q]) => {
            setSettings(s);
            setEditSettings(s);
            setQuestions(q);
          })
          .catch(() => { });
      })
      .catch(() => {
        window.location.href = "/admin/login";
      });

    // ✅ load country names
    fetch("https://restcountries.com/v3.1/all?fields=name")
      .then(r => r.json())
      .then(list => {
        const options = list
          .map(c => c?.name?.common)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        setCountryOptions(options);
      })
      .catch(() => setCountryOptions([]));
  }, []);


  async function addQuestion(e) {
    e.preventDefault();
    const text = (newQuestion.text || "").trim();
    const answer = (newQuestion.answer || "").trim();
    if (!text || !answer) return; // guard
    try {
      setSavingQuestion(true);
      const res = await fetch(`${API_BASE}/api/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text, answer }),
      });
      if (!res.ok) throw new Error("Failed to add question");
      const created = await res.json();
      setQuestions(prev => [...prev, created]);
      setNewQuestion({ text: "", answer: "" });
      setToast("Question added");
    } catch (err) {
      alert(err.message || "Unable to add question. Please try again.");
    } finally {
      setSavingQuestion(false);
    }
  }

  const [savingSettings, setSavingSettings] = React.useState(false);
  const [justSavedSettings, setJustSavedSettings] = React.useState(false);

  async function saveSettings(e) {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editSettings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      const saved = await res.json();
      setSettings(saved);
      setJustSavedSettings(true);
      setTimeout(() => setJustSavedSettings(false), 1500);
      setToast("Settings saved");
    } finally {
      setSavingSettings(false);
    }
  }

  React.useEffect(() => { setJustSavedSettings(false); }, [editSettings.rounds, editSettings.attempts]);

  async function remove(resource, id) {
    await fetch(`${API_BASE}/api/${resource}/${id}`, { method: "DELETE", credentials: "include" });
    if (resource === "questions") setQuestions(prev => prev.filter(r => r.id !== id));
    if (resource === "questions") setToast("Question deleted");
  }

  async function startEditQuestion(q) {
    setEditingQuestionId(q.id);
    setEditingQuestion({ text: q.text, answer: q.answer });
  }

  async function saveEditQuestion(e) {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/api/questions/${editingQuestionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(editingQuestion),
    });
    const updated = await res.json();
    setQuestions(prev => prev.map(q => (q.id === updated.id ? updated : q)));
    setEditingQuestionId(null);
    setEditingQuestion({ text: "", answer: "" });
    setToast("Question updated");
  }

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "#e5e7eb",
        background:
          "radial-gradient(1200px 600px at 20% 0%, #0b1b3a 0%, #050a18 60%, #02040a 100%)",
        padding: "32px 20px",
        fontFamily: "Roboto, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {toast && (
          <div style={{ position: 'fixed', bottom: 16, right: 16, background: '#0b1224', border: '1px solid #1f2a44', padding: '10px 14px', borderRadius: 10, boxShadow: '0 6px 18px rgba(0,0,0,.35)', zIndex: 1000 }}>
            <span style={{ color: '#c7f9cc', fontWeight: 800 }}>{toast}</span>
          </div>
        )}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Admin Panel</h1>
          <Link
            to="/"
            style={{
              textDecoration: "none",
              background: "#0ea5e9",
              color: "white",
              fontWeight: 700,
              padding: "10px 16px",
              borderRadius: 10,
              border: "2px solid #0369a1",
              boxShadow: "0 0 10px #0ea5e980",
            }}
          >
            Back Home
          </Link>
        </header>

        <section
  style={{
    marginTop: 24,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
  }}
>
  {/* LEFT COLUMN */}
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {/* SETTINGS CARD */}
    <div
      style={{
        background: "#0b1224",
        border: "1px solid #1f2a44",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
        Settings
      </h2>
      <form
        onSubmit={saveSettings}
        style={{ display: "grid", gap: 8, maxWidth: 380 }}
      >
        <label style={{ color: "#cbd5e1", fontSize: 13 }}>Rounds</label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={editSettings.rounds}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              setEditSettings((s) => ({ ...s, rounds: "" }));
              return;
            }
            const cleaned = raw.replace(/^0+(?=\d)/, "");
            if (/^\d+$/.test(cleaned)) {
              setEditSettings((s) => ({ ...s, rounds: parseInt(cleaned, 10) }));
            }
          }}
          onBlur={(e) => {
            const raw = e.target.value;
            const n = Math.max(1, parseInt(raw || "1", 10));
            setEditSettings((s) => ({ ...s, rounds: n }));
          }}
          onKeyDown={(e) => {
            if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
          }}
          placeholder="Rounds"
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #263455",
            background: "#0a1020",
            color: "#e5e7eb",
          }}
        />
        <label style={{ color: "#cbd5e1", fontSize: 13 }}>Attempts</label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={editSettings.attempts}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              setEditSettings((s) => ({ ...s, attempts: "" }));
              return;
            }
            const cleaned = raw.replace(/^0+(?=\d)/, "");
            if (/^\d+$/.test(cleaned)) {
              setEditSettings((s) => ({
                ...s,
                attempts: parseInt(cleaned, 10),
              }));
            }
          }}
          onBlur={(e) => {
            const raw = e.target.value;
            const n = Math.max(1, parseInt(raw || "1", 10));
            setEditSettings((s) => ({ ...s, attempts: n }));
          }}
          onKeyDown={(e) => {
            if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
          }}
          placeholder="Attempts"
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #263455",
            background: "#0a1020",
            color: "#e5e7eb",
          }}
        />

        {(() => {
          const invalid =
            !editSettings.rounds ||
            !editSettings.attempts ||
            (Array.isArray(questions) &&
              Number(editSettings.rounds) > questions.length);
          const bg = justSavedSettings
            ? "#065f46"
            : invalid
            ? "#155e75"
            : "#10b981";
          const cursor = invalid || savingSettings ? "not-allowed" : "pointer";
          const opacity = invalid || savingSettings ? 0.7 : 1;
          const label = savingSettings
            ? "Saving…"
            : justSavedSettings
            ? "Saved"
            : "Save Settings";
          const title = !editSettings.rounds || !editSettings.attempts
            ? "Please enter both values"
            : Array.isArray(questions) &&
              Number(editSettings.rounds) > questions.length
            ? `Rounds cannot exceed number of questions (${questions.length})`
            : undefined;
          return (
            <button
              type="submit"
              disabled={invalid || savingSettings}
              title={title}
              style={{
                background: bg,
                border: "1px solid #065f46",
                color: "#06261f",
                fontWeight: 800,
                padding: "8px 10px",
                borderRadius: 10,
                marginTop: 6,
                cursor,
                opacity,
              }}
            >
              {label}
            </button>
          );
        })()}
      </form>
      <div style={{ marginTop: 12, color: "#93c5fd", fontSize: 14 }}>
        Current: {settings.rounds} rounds, {settings.attempts} attempts
      </div>
      {Array.isArray(questions) && (
        <div style={{ marginTop: 6, color: "#cbd5e1", fontSize: 12 }}>
          Available questions: {questions.length}
        </div>
      )}
    </div>

    {/* ADMIN ACCOUNT CARD */}
    <div
      style={{
        background: "#0b1224",
        border: "1px solid #1f2a44",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
        Admin Account
      </h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const username = e.target.username.value.trim();
          const password = e.target.password.value.trim();
          if (!username || !password) return alert("Both fields required");

          try {
            const res = await fetch(`${API_BASE}/api/admin`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ username, password }),
            });
            if (!res.ok) throw new Error("Failed to update admin credentials");
            const data = await res.json();
            setToast("Admin credentials updated");
            e.target.reset();
            // Optionally log out to refresh credentials
            setTimeout(() => {
              window.location.href = "/admin/login";
            }, 1500);
          } catch (err) {
            alert(err.message || "Error updating admin credentials");
          }
        }}
        style={{ display: "grid", gap: 8, maxWidth: 380 }}
      >
        <label style={{ color: "#cbd5e1", fontSize: 13 }}>Username</label>
        <input
          type="text"
          name="username"
          placeholder="Enter new username"
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #263455",
            background: "#0a1020",
            color: "#e5e7eb",
          }}
        />

        <label style={{ color: "#cbd5e1", fontSize: 13 }}>Password</label>
        <input
          type="password"
          name="password"
          placeholder="Enter new password"
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #263455",
            background: "#0a1020",
            color: "#e5e7eb",
          }}
        />

        <button
          type="submit"
          style={{
            background: "#3b82f6",
            border: "1px solid #1d4ed8",
            color: "#f9fafb",
            fontWeight: 800,
            padding: "8px 10px",
            borderRadius: 10,
            marginTop: 6,
            cursor: "pointer",
          }}
        >
          Save Admin Account
        </button>
      </form>
    </div>
  </div>

  {/* QUESTIONS CARD */}
  <div
    style={{
      background: "#0b1224",
      border: "1px solid #1f2a44",
      borderRadius: 12,
      padding: 16,
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 800 }}>Questions</h2>

      <button
        onClick={async () => {
          if (!confirm("Delete ALL questions? This cannot be undone.")) return;
          try {
            const res = await fetch(`${API_BASE}/api/questions`, {
              method: "DELETE",
              credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to delete questions");
            setQuestions([]);
            setToast("All questions deleted");
          } catch (err) {
            alert(err.message || "Unable to delete questions. Please try again.");
          }
        }}
        style={{
          background: "#ef4444",
          border: "1px solid #7f1d1d",
          color: "#fff",
          fontWeight: 800,
          padding: "6px 10px",
          borderRadius: 8,
        }}
      >
        Clear All
      </button>
    </div>

    {/* ADD QUESTION FORM */}
    <form onSubmit={addQuestion} style={{ display: "grid", gap: 8 }}>
      <input
        value={newQuestion.text}
        onChange={(e) =>
          setNewQuestion((s) => ({ ...s, text: e.target.value }))
        }
        placeholder="Prompt (e.g., Where do Japanese live?)"
        style={{
          padding: 8,
          borderRadius: 8,
          border: "1px solid #263455",
          background: "#0a1020",
          color: "#e5e7eb",
        }}
      />
      <select
        value={newQuestion.answer}
        onChange={(e) =>
          setNewQuestion((s) => ({ ...s, answer: e.target.value }))
        }
        style={{
          padding: 8,
          borderRadius: 8,
          border: "1px solid #263455",
          background: "#0a1020",
          color: "#e5e7eb",
        }}
      >
        <option value="">Select answer country…</option>
        {countryOptions.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={
          savingQuestion ||
          !(newQuestion.text.trim() && newQuestion.answer.trim())
        }
        style={{
          background:
            savingQuestion ||
            !(newQuestion.text.trim() && newQuestion.answer.trim())
              ? "#155e75"
              : "#10b981",
          border: "1px solid #065f46",
          color: "#06261f",
          fontWeight: 800,
          padding: "8px 10px",
          borderRadius: 10,
          cursor:
            savingQuestion ||
            !(newQuestion.text.trim() && newQuestion.answer.trim())
              ? "not-allowed"
              : "pointer",
          opacity:
            savingQuestion ||
            !(newQuestion.text.trim() && newQuestion.answer.trim())
              ? 0.7
              : 1,
        }}
      >
        {savingQuestion ? "Adding…" : "Add Question"}
      </button>
    </form>

    {/* LIST QUESTIONS */}
    <ul style={{ marginTop: 12, display: "grid", gap: 8 }}>
      {questions.map((q) => (
        <li
          key={q.id}
          style={{
            background: "#0a1020",
            border: "1px solid #263455",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          {editingQuestionId === q.id ? (
            <form onSubmit={saveEditQuestion} style={{ display: "grid", gap: 8 }}>
              <input
                value={editingQuestion.text}
                onChange={(e) =>
                  setEditingQuestion((s) => ({ ...s, text: e.target.value }))
                }
                placeholder="Prompt"
                style={{
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #263455",
                  background: "#0a1020",
                  color: "#e5e7eb",
                }}
              />
              <select
                value={editingQuestion.answer}
                onChange={(e) =>
                  setEditingQuestion((s) => ({ ...s, answer: e.target.value }))
                }
                style={{
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #263455",
                  background: "#0a1020",
                  color: "#e5e7eb",
                }}
              >
                <option value="">Select answer country…</option>
                {countryOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="submit"
                  style={{
                    background: "#10b981",
                    border: "1px solid #065f46",
                    color: "#06261f",
                    fontWeight: 800,
                    padding: "8px 10px",
                    borderRadius: 10,
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingQuestionId(null)}
                  style={{
                    background: "#475569",
                    border: "1px solid #334155",
                    color: "#e2e8f0",
                    fontWeight: 800,
                    padding: "8px 10px",
                    borderRadius: 10,
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                {q.text} · Ans: {q.answer}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => startEditQuestion(q)}
                  style={{
                    background: "#22c55e",
                    border: "1px solid #15803d",
                    color: "#052e16",
                    fontWeight: 800,
                    padding: "6px 10px",
                    borderRadius: 8,
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => remove("questions", q.id)}
                  style={{
                    background: "#ef4444",
                    border: "1px solid #7f1d1d",
                    color: "#fff",
                    fontWeight: 800,
                    padding: "6px 10px",
                    borderRadius: 8,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  </div>
</section>

      </div>
    </div>
  );
};

export default Admin;


