// server/server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
const dbPath = path.join(__dirname, "db.json");

// Ensure db.json exists with a minimal structure to avoid read errors on fresh clones
if (!fs.existsSync(dbPath)) {
  const initial = {
    admin: { username: "admin", password: "admin" },
    settings: { rounds: 5, attempts: 3 },
    questions: [],
  };
  fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2), "utf-8");
}

// Helper: read/write DB
function readDB() {
  const data = fs.readFileSync(dbPath, "utf-8");
  return JSON.parse(data);
}
function writeDB(newData) {
  fs.writeFileSync(dbPath, JSON.stringify(newData, null, 2), "utf-8");
}

// ✅ Login endpoint
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const admin = db.admin;

  if (username === admin.username && password === admin.password) {
    return res.json({ success: true, message: "Login successful" });
  }
  res.status(401).json({ success: false, message: "Invalid credentials" });
});

// ✅ Get authenticated user (mock)
app.get("/api/me", (req, res) => {
  const db = readDB();
  res.json({ authenticated: true, user: db.admin.username });
});

// ✅ Get all questions
app.get("/api/questions", (req, res) => {
  const db = readDB();
  res.json(db.questions);
});

// ✅ Add a new question
app.post("/api/questions", (req, res) => {
    const db = readDB();
    const { text, answer } = req.body;
  
    if (!text || !answer) {
      return res.status(400).json({ message: "Invalid question data" });
    }
  
    const newQuestion = {
      id: Math.random().toString(36).substr(2, 8),
      text,
      answer
    };
  
    db.questions.push(newQuestion);
    writeDB(db);
  
    // ✅ Return the new question so frontend can update instantly
    res.json(newQuestion);
  });

// ✅ Update a question by id
app.put("/api/questions/:id", (req, res) => {
  const { id } = req.params;
  const { text, answer } = req.body;
  if (!text || !answer) return res.status(400).json({ message: "Invalid question data" });

  const db = readDB();
  const idx = db.questions.findIndex((q) => q.id === id);
  if (idx === -1) return res.status(404).json({ message: "Question not found" });

  db.questions[idx] = { ...db.questions[idx], text, answer };
  writeDB(db);
  res.json(db.questions[idx]);
});

// ✅ Delete a question by id
app.delete("/api/questions/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const before = db.questions.length;
  db.questions = db.questions.filter((q) => q.id !== id);
  if (db.questions.length === before) return res.status(404).json({ message: "Question not found" });
  writeDB(db);
  res.json({ success: true, message: "Question deleted" });
});
  
// ✅ Get settings
app.get("/api/settings", (req, res) => {
  const db = readDB();
  res.json(db.settings);
});

// ✅ Update settings
app.post("/api/settings", (req, res) => {
  const db = readDB();
  const { rounds, attempts } = req.body;

  if (typeof rounds !== "number" || typeof attempts !== "number") {
    return res.status(400).json({ message: "Invalid settings format" });
  }

  db.settings = { rounds, attempts };
  writeDB(db);
  res.json({ success: true, message: "Settings updated successfully" });
});

// ✅ Delete ALL questions
app.delete("/api/questions", (req, res) => {
    const db = readDB();
    db.questions = [];
    writeDB(db);
    res.json({ success: true, message: "All questions deleted" });
  });
  
  // ✅ Update admin credentials
app.post("/api/admin", (req, res) => {
  const db = readDB();
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  db.admin.username = username;
  db.admin.password = password;
  writeDB(db);

  res.json({ success: true, message: "Admin credentials updated successfully" });
});


// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Express server running on http://localhost:${PORT}`);
});
