// server/server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  initDB,
  getAdmin,
  setAdmin,
  getSettings,
  setSettings,
  getQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  deleteAllQuestions,
  getSpotsByCountry,
  addSpot,
  updateSpot,
  deleteSpot,
  deleteAllSpotsByCountry,
} from "./db.js";

const app = express();
// Read ports from environment with sensible defaults
const PORT = Number(process.env.SERVER_PORT || 8000);
const VITE_PORT = Number(process.env.VITE_PORT || 5173);
// Determine this file's directory (works regardless of process.cwd())
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
// Allow the configured Vite port and a common next-port fallback so the
// frontend can talk to this API even when Vite auto-increments its port.
app.use(
  cors({
    origin: [
      `http://localhost:${VITE_PORT}`,
      `http://localhost:${VITE_PORT + 1}`,
    ],
    credentials: true,
  })
);
app.use(express.json());

// Path to db.json
// Initialize DB (migrates from db.json if present) and start server after initialization
// initDB is async now (sql.js/wasi), so start the server inside an async IIFE

// ✅ Login endpoint
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const admin = getAdmin();

  if (admin && username === admin.username && password === admin.password) {
    return res.json({ success: true, message: "Login successful" });
  }
  res.status(401).json({ success: false, message: "Invalid credentials" });
});

// ✅ Get authenticated user (mock)
app.get("/api/me", (req, res) => {
  const admin = getAdmin();
  res.json({ authenticated: true, user: admin ? admin.username : null });
});

// ✅ Get all questions
app.get("/api/questions", (req, res) => {
  res.json(getQuestions());
});

// ✅ Add a new question
app.post("/api/questions", (req, res) => {
  const { text, answer } = req.body;

  if (!text || !answer) {
    return res.status(400).json({ message: "Invalid question data" });
  }

  const newQuestion = addQuestion({ text, answer });
  res.json(newQuestion);
  });

// ✅ Update a question by id
app.put("/api/questions/:id", (req, res) => {
  const { id } = req.params;
  const { text, answer } = req.body;
  if (!text || !answer) return res.status(400).json({ message: "Invalid question data" });
  const updated = updateQuestion(id, text, answer);
  if (!updated) return res.status(404).json({ message: "Question not found" });
  res.json(updated);
});

// ✅ Delete a question by id
app.delete("/api/questions/:id", (req, res) => {
  const { id } = req.params;
  const ok = deleteQuestion(id);
  if (!ok) return res.status(404).json({ message: "Question not found" });
  res.json({ success: true, message: "Question deleted" });
});
  
// ✅ Get settings
app.get("/api/settings", (req, res) => {
  res.json(getSettings());
});

// ✅ Update settings
app.post("/api/settings", (req, res) => {
  const { rounds, attempts } = req.body;

  if (typeof rounds !== "number" || typeof attempts !== "number") {
    return res.status(400).json({ message: "Invalid settings format" });
  }

  setSettings(rounds, attempts);
  res.json({ success: true, message: "Settings updated successfully" });
});

// ✅ Delete ALL questions
app.delete("/api/questions", (req, res) => {
  deleteAllQuestions();
  res.json({ success: true, message: "All questions deleted" });
  });

// ✅ Get tourist spots by country
app.get('/api/spots', (req, res) => {
  const country = req.query.country;
  if (!country) return res.status(400).json({ message: 'country query parameter required' });
  try {
    const spots = getSpotsByCountry(country);
    res.json(spots);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load spots' });
  }
});

// ✅ Add a tourist spot
app.post('/api/spots', (req, res) => {
  const { country, name, description } = req.body;
  console.log('POST /api/spots body:', req.body);
  if (!country || !name) return res.status(400).json({ message: 'country and name required' });
  try {
    const spot = addSpot({ country, name, description });
    console.log('Spot created:', spot && spot.id);
    res.json(spot);
  } catch (err) {
    console.error('Error adding spot:', err);
    res.status(500).json({ message: err.message || 'Failed to add spot' });
  }
});

// ✅ Update a spot
app.put('/api/spots/:id', (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'name required' });
  try {
    const updated = updateSpot(id, name, description);
    if (!updated) return res.status(404).json({ message: 'Spot not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update spot' });
  }
});

// ✅ Delete a spot
app.delete('/api/spots/:id', (req, res) => {
  const { id } = req.params;
  try {
    const ok = deleteSpot(id);
    if (!ok) return res.status(404).json({ message: 'Spot not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete spot' });
  }
});

// ✅ Delete all spots for a country
app.delete('/api/spots', (req, res) => {
  const country = req.query.country;
  if (!country) return res.status(400).json({ message: 'country query parameter required' });
  try {
    deleteAllSpotsByCountry(country);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete spots' });
  }
});
  
  // ✅ Update admin credentials
app.post("/api/admin", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  setAdmin(username, password);

  res.json({ success: true, message: "Admin credentials updated successfully" });
});


// Start after DB init
(async () => {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`✅ Express server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize DB:', err);
    process.exit(1);
  }
})();
