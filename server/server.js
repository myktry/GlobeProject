// server/server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 8000;
const __dirname = path.resolve();

// Middleware
app.use(cors({
  origin: "http://localhost:5173", // your Vite frontend
  credentials: true,
}));
app.use(express.json());

// Path to db.json
const dbPath = path.join(__dirname, "db.json");

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
