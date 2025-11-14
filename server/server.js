import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
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
const PORT = process.env.SERVER_PORT || 8000;
const VITE_PORT = Number(process.env.VITE_PORT || 5173);

// JWT secret
const JWT_SECRET = "your-secret-key";

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

/* ------------------------------
   JWT AUTH MIDDLEWARE
--------------------------------*/
function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ loggedIn: false });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ loggedIn: false });
  }
}

/* ------------------------------
   LOGIN
--------------------------------*/
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const admin = getAdmin();

  if (!admin) {
    return res.status(500).json({ message: "Admin not set in DB" });
  }

  // Compare raw password (your db.js stores plain password)
  if (username !== admin.username || password !== admin.password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { username: admin.username, role: "admin" },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // true only if using https
  });

  return res.json({ success: true });
});

/* ------------------------------
   LOGOUT
--------------------------------*/
app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ success: true });
});

/* ------------------------------
   CHECK SESSION
--------------------------------*/
app.get("/api/me", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ loggedIn: false });

  try {
    const user = jwt.verify(token, JWT_SECRET);
    return res.json({ loggedIn: true, user });
  } catch {
    return res.json({ loggedIn: false });
  }
});

/* ------------------------------
   PROTECTED ROUTES
--------------------------------*/
app.get("/api/questions", requireAuth, (req, res) => {
  res.json(getQuestions());
});

app.post("/api/questions", requireAuth, (req, res) => {
  const { text, answer } = req.body;
  const newQuestion = addQuestion({ text, answer });
  res.json(newQuestion);
});

app.put("/api/questions/:id", requireAuth, (req, res) => {
  const updated = updateQuestion(req.params.id, req.body.text, req.body.answer);
  res.json(updated);
});

app.delete("/api/questions/:id", requireAuth, (req, res) => {
  deleteQuestion(req.params.id);
  res.json({ success: true });
});

app.delete("/api/questions", requireAuth, (req, res) => {
  deleteAllQuestions();
  res.json({ success: true });
});

/* SETTINGS */
app.get("/api/settings", requireAuth, (req, res) => {
  res.json(getSettings());
});

app.post("/api/settings", requireAuth, (req, res) => {
  const { rounds, attempts } = req.body;
  setSettings(rounds, attempts);
  res.json({ success: true });
});

/* SPOTS */
app.get('/api/spots', requireAuth, (req, res) => {
  const spots = getSpotsByCountry(req.query.country);
  res.json(spots);
});

app.post('/api/spots', requireAuth, (req, res) => {
  const spot = addSpot(req.body);
  res.json(spot);
});

app.put('/api/spots/:id', requireAuth, (req, res) => {
  const updated = updateSpot(req.params.id, req.body.name, req.body.description);
  res.json(updated);
});

app.delete('/api/spots/:id', requireAuth, (req, res) => {
  deleteSpot(req.params.id);
  res.json({ success: true });
});

/* ADMIN ACCOUNT UPDATE */
app.post("/api/admin", requireAuth, (req, res) => {
  setAdmin(req.body.username, req.body.password);
  res.json({ success: true });
});

/* START SERVER */
(async () => {
  await initDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();
