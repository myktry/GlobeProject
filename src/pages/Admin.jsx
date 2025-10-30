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
  const [editSaving, setEditSaving] = React.useState(false);
  const [countryOptions, setCountryOptions] = React.useState([]);
  const [toast, setToast] = React.useState("");
  const backupRef = React.useRef(null);
  const [undoVisible, setUndoVisible] = React.useState(false);
  const undoTimerRef = React.useRef(null);
  const [undoData, setUndoData] = React.useState(null);
  const confirmActionRef = React.useRef(null);
  const [confirmVisible, setConfirmVisible] = React.useState(false);
  const [confirmMessage, setConfirmMessage] = React.useState("");
  const [resultModalVisible, setResultModalVisible] = React.useState(false);
  const [resultModalMessage, setResultModalMessage] = React.useState("");
  const [resultModalHasUndo, setResultModalHasUndo] = React.useState(false);
  const [resultModalType, setResultModalType] = React.useState('success');

  // Refs to align card heights: measure Settings card and apply its height to Admin Account
  const settingsRef = React.useRef(null);
  const [settingsHeight, setSettingsHeight] = React.useState(null);

  React.useEffect(() => {
    function measure() {
      try {
        const h = settingsRef.current?.offsetHeight || null;
        setSettingsHeight(h);
      } catch (e) { /* ignore */ }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [settings, questions]);

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
        let options = list
          .map(c => c?.name?.common)
          .filter(Boolean);

        // Ensure 'England' is available as an option even though some country
        // datasets return it as part of 'United Kingdom' rather than a top-level
        // country name. Add it if missing, then dedupe and sort.
        if (!options.includes("England")) options.push("England");

        options = Array.from(new Set(options)).sort((a, b) => a.localeCompare(b));
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
      // show success modal instead of toast
      setResultModalType('success');
      setResultModalMessage('Question added');
      setResultModalHasUndo(false);
      setResultModalVisible(true);
    } catch (err) {
      // show error modal
      setResultModalType('error');
      setResultModalMessage(err.message || "Unable to add question. Please try again.");
      setResultModalHasUndo(false);
      setResultModalVisible(true);
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
    try {
      const res = await fetch(`${API_BASE}/api/${resource}/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error('Failed to delete');
      if (resource === "questions") {
        setQuestions(prev => prev.filter(r => r.id !== id));
        // show success modal for delete
        setResultModalType('success');
        setResultModalMessage('Question deleted');
        setResultModalHasUndo(false);
        setResultModalVisible(true);
      }
    } catch (err) {
      // show error modal
      setResultModalType('error');
      setResultModalMessage(err.message || 'Unable to delete item');
      setResultModalHasUndo(false);
      setResultModalVisible(true);
    }
  }

  async function startEditQuestion(q) {
    setEditingQuestionId(q.id);
    setEditingQuestion({ text: q.text, answer: q.answer });
  }

  async function saveEditQuestion(e) {
    e.preventDefault();
    if (!editingQuestionId) return;
    const text = (editingQuestion.text || "").trim();
    const answer = (editingQuestion.answer || "").trim();
    if (!text || !answer) {
      setResultModalType('error');
      setResultModalMessage('Please provide both prompt and answer');
      setResultModalHasUndo(false);
      setResultModalVisible(true);
      return;
    }

    try {
      setEditSaving(true);
      const res = await fetch(`${API_BASE}/api/questions/${editingQuestionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text, answer }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to update question');
      }

      const updated = await res.json();
      setQuestions(prev => prev.map(q => (q.id === updated.id ? updated : q)));
      setEditingQuestionId(null);
      setEditingQuestion({ text: "", answer: "" });
  // show success modal instead of toast
  setResultModalType('success');
  setResultModalMessage('Question updated');
  setResultModalHasUndo(false);
  setResultModalVisible(true);
    } catch (err) {
      setResultModalType('error');
      setResultModalMessage(err.message || 'Unable to update question');
      setResultModalHasUndo(false);
      setResultModalVisible(true);
    } finally {
      setEditSaving(false);
    }
  }

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  React.useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  async function handleUndo() {
    if (!undoData?.items || !Array.isArray(undoData.items) || undoData.items.length === 0) {
      setUndoVisible(false);
      setUndoData(null);
      backupRef.current = null;
      return;
    }

    // Recreate questions on server (best-effort). Keep order.
    try {
      const recreated = [];
      for (const q of undoData.items) {
        // If q already has id, we'll ignore id and re-post text/answer
        const res = await fetch(`${API_BASE}/api/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text: q.text, answer: q.answer }),
        });
        if (res.ok) {
          const created = await res.json();
          recreated.push(created);
        }
      }
      // replace questions list with recreated ones (append any remaining original questions that might have been added meanwhile)
      setQuestions(recreated);
      setToast("Questions restored");
    } catch (err) {
      setResultModalType('error');
      setResultModalMessage(err.message || 'Unable to restore questions');
      setResultModalHasUndo(false);
      setResultModalVisible(true);
    } finally {
      setUndoVisible(false);
      setUndoData(null);
      backupRef.current = null;
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        color: "#e5e7eb",
        background:
          "radial-gradient(1200px 600px at 20% 0%, #0b1b3a 0%, #050a18 60%, #02040a 100%)",
        padding: "24px",
        boxSizing: 'border-box',
        fontFamily: "Roboto, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", height: '100%', display: 'flex', flexDirection: 'column' }}>
        {toast && (
          <div style={{ position: 'fixed', bottom: 88, right: 16, background: '#0b1224', border: '1px solid #1f2a44', padding: '10px 14px', borderRadius: 10, boxShadow: '0 6px 18px rgba(0,0,0,.35)', zIndex: 1000 }}>
            <span style={{ color: '#c7f9cc', fontWeight: 800 }}>{toast}</span>
          </div>
        )}

        {undoVisible && (
          <div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8, alignItems: 'center', zIndex: 1001 }}>
            <div style={{ background: '#0b1224', border: '1px solid #1f2a44', padding: '10px 14px', borderRadius: 10, boxShadow: '0 6px 18px rgba(0,0,0,.35)' }}>
              <span style={{ color: '#fda4af', fontWeight: 700 }}>Questions deleted</span>
            </div>
            <button className="admin-btn btn-save btn-sm" onClick={handleUndo}>
              Undo
            </button>
          </div>
        )}

        {confirmVisible && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div style={{ width: 420, maxWidth: '92%', background: '#071028', border: '1px solid #213148', padding: 20, borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
              <div style={{ marginBottom: 12, color: '#fff', fontWeight: 800, fontSize: 16 }}>{confirmMessage}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="admin-btn btn-neutral btn-sm" onClick={() => setConfirmVisible(false)}>Cancel</button>
                <button className="admin-btn btn-danger btn-sm" onClick={() => { try { confirmActionRef.current && confirmActionRef.current(); } catch (e) { setConfirmVisible(false); } }}>Confirm</button>
              </div>
            </div>
          </div>
        )}

        {resultModalVisible && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2001 }}>
            <div style={{ width: 420, maxWidth: '92%', background: '#071028', border: '1px solid #213148', padding: 20, borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
                {/* Icon based on resultModalType */}
                <div style={{ width: 56, height: 56, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: resultModalType === 'success' ? '#064e3b' : resultModalType === 'error' ? '#6b021f' : '#0b2540' }}>
                  {resultModalType === 'success' ? (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17l-5-5" stroke="#9AE6B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : resultModalType === 'error' ? (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6l12 12" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM11 10h2v6h-2v-6zm0-4h2v2h-2V6z" fill="#93C5FD" />
                    </svg>
                  )}
                </div>

                <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{resultModalMessage}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                {resultModalHasUndo ? (
                  <>
                    <button className="admin-btn btn-save btn-sm" onClick={() => { handleUndo(); setResultModalVisible(false); }}>Undo</button>
                    <button className="admin-btn btn-neutral btn-sm" onClick={() => setResultModalVisible(false)}>Close</button>
                  </>
                ) : (
                  <button className="admin-btn btn-primary btn-sm" onClick={() => setResultModalVisible(false)}>OK</button>
                )}
              </div>
            </div>
          </div>
        )}
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Link
              to="/"
              className="admin-btn btn-primary btn-sm"
              style={{ textDecoration: 'none' }}
            >
              Back Home
            </Link>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>Admin Panel</h1>
          </header>

        <section
          style={{
            marginTop: 24,
            display: "grid",
            // make left column slightly narrower so there's visible space between columns
            gridTemplateColumns: "420px 1fr",
            gap: 24,
            // Constrain section height so header stays visible and inner columns fit
            maxHeight: 'calc(100vh - 140px)',
            overflow: 'hidden',
          }}
        >
          {/* LEFT COLUMN */}
          {/* LEFT COLUMN: place settings and admin account side-by-side, non-scrollable */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, paddingRight: 12, paddingLeft: 6, alignItems: 'start' }}>
            {/* SETTINGS CARD */}
            <div
              ref={settingsRef}
              style={{
                background: "#0b1224",
                border: "1px solid #1f2a44",
                borderRadius: 12,
                padding: 16,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start', // align content to the top
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
                Settings
              </h2>
              <form
                onSubmit={saveSettings}
                style={{ display: "grid", gap: 8, width: '100%', maxWidth: 320, alignItems: 'center' }}
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
                    width: '100%'
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
                    width: '100%'
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
                      className={`admin-btn ${justSavedSettings ? 'btn-save' : (invalid || savingSettings) ? 'btn-neutral' : 'btn-primary'} btn-sm ${invalid || savingSettings ? 'disabled' : ''}`}
                      style={{ marginTop: 6, width: 'auto', padding: '6px 10px' }}
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
                boxSizing: 'border-box',
                minHeight: settingsHeight ? settingsHeight : undefined,
                height: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start', // align content to the top
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
                  if (!username || !password) {
                    // show in-app error modal instead of browser alert
                    setResultModalType('error');
                    setResultModalMessage('Both fields required');
                    setResultModalHasUndo(false);
                    setResultModalVisible(true);
                    return;
                  }

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
                    // show error in modal instead of alert
                    setResultModalType('error');
                    setResultModalMessage(err.message || "Error updating admin credentials");
                    setResultModalHasUndo(false);
                    setResultModalVisible(true);
                  }
                }}
                style={{ display: "grid", gap: 8, width: '100%', maxWidth: 320, alignItems: 'center' }}
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
                    width: '100%'
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
                    width: '100%'
                  }}
                />

                <button
                  type="submit"
                  className="admin-btn btn-save btn-sm"
                  style={{ marginTop: 6, width: 'auto', padding: '6px 10px' }}
                >
                  Save
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
              overflowY: 'auto',
              maxHeight: '100%',
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

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    // show in-app confirmation modal instead of browser confirm
                    setConfirmMessage('Clear the form? This will discard unsaved inputs.');
                    confirmActionRef.current = () => {
                      setNewQuestion({ text: "", answer: "" });
                      setEditingQuestionId(null);
                      setEditingQuestion({ text: "", answer: "" });
                      setToast("Form cleared");
                      setConfirmVisible(false);
                      // show result modal for feedback
                      setResultModalMessage('Form cleared');
                      setResultModalHasUndo(false);
                      setResultModalType('success');
                      setResultModalVisible(true);
                    };
                    setConfirmVisible(true);
                  }}
                  className="admin-btn btn-neutral btn-sm"
                >
                  Clear Form
                </button>

                <button
                  onClick={() => {
                    // show in-app confirmation modal for deleting all questions
                    setConfirmMessage('Delete ALL questions? This cannot be undone.');
                    confirmActionRef.current = async () => {
                      // backup current questions in memory for undo
                      backupRef.current = Array.isArray(questions) ? [...questions] : [];
                      try {
                        const res = await fetch(`${API_BASE}/api/questions`, {
                          method: "DELETE",
                          credentials: "include",
                        });
                        if (!res.ok) throw new Error("Failed to delete questions");
                        setQuestions([]);
                        setToast("All questions deleted");
                        // show undo snackbar
                        setUndoData({ items: backupRef.current });
                        setUndoVisible(true);
                        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                        undoTimerRef.current = setTimeout(() => {
                          setUndoVisible(false);
                          setUndoData(null);
                          backupRef.current = null;
                          undoTimerRef.current = null;
                        }, 6000);
                        // show result modal with undo option
                        setResultModalMessage('All questions deleted');
                        setResultModalHasUndo(true);
                        setResultModalType('success');
                        setResultModalVisible(true);
                      } catch (err) {
                        // show error in modal instead of browser alert
                        setResultModalType('error');
                        setResultModalMessage(err.message || "Unable to delete questions. Please try again.");
                        setResultModalHasUndo(false);
                        setResultModalVisible(true);
                        backupRef.current = null;
                      } finally {
                        setConfirmVisible(false);
                      }
                    };
                    setConfirmVisible(true);
                  }}
                  className="admin-btn btn-danger btn-sm"
                >
                  Clear All
                </button>
              </div>
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
                className={`admin-btn ${savingQuestion || !(newQuestion.text.trim() && newQuestion.answer.trim()) ? 'btn-neutral btn-sm disabled' : 'btn-primary btn-md'}`}
                style={{ borderRadius: 10 }}
              >
                {savingQuestion ? "Adding…" : "Add Question"}
              </button>
            </form>

            {/* LIST QUESTIONS */}
            <div className="admin-scroll" style={{ marginTop: 12, maxHeight: 'calc(100% - 220px)', overflowY: 'auto', paddingRight: 8 }}>
              <ul style={{ display: "grid", gap: 8 }}>
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
                          disabled={editSaving}
                          className="admin-btn btn-save btn-sm"
                        >
                          {editSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingQuestionId(null)}
                          className="admin-btn btn-neutral btn-sm"
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
                          className="admin-btn btn-primary btn-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            // Ask for confirmation before deleting a single question and allow undo
                            setConfirmMessage('Delete this question? You will be able to undo for a short time.');
                            confirmActionRef.current = async () => {
                              backupRef.current = [q];
                              try {
                                const res = await fetch(`${API_BASE}/api/questions/${q.id}`, {
                                  method: "DELETE",
                                  credentials: "include",
                                });
                                if (!res.ok) throw new Error('Failed to delete question');
                                setQuestions(prev => prev.filter(r => r.id !== q.id));

                                // show undo snackbar
                                setUndoData({ items: backupRef.current });
                                setUndoVisible(true);
                                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                                undoTimerRef.current = setTimeout(() => {
                                  setUndoVisible(false);
                                  setUndoData(null);
                                  backupRef.current = null;
                                  undoTimerRef.current = null;
                                }, 6000);

                                // show result modal with undo option
                                setResultModalType('success');
                                setResultModalMessage('Question deleted');
                                setResultModalHasUndo(true);
                                setResultModalVisible(true);
                              } catch (err) {
                                setResultModalType('error');
                                setResultModalMessage(err.message || 'Unable to delete question. Please try again.');
                                setResultModalHasUndo(false);
                                setResultModalVisible(true);
                                backupRef.current = null;
                              } finally {
                                setConfirmVisible(false);
                              }
                            };
                            setConfirmVisible(true);
                          }}
                          className="admin-btn btn-danger btn-sm"
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
          </div>
        </section>
      </div>
    </div>
  );
};

export default Admin;


