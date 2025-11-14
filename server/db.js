// server/db.js (sql.js / wasm-backed SQLite implementation)
import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlitePath = path.join(__dirname, "data.sqlite");

let SQL;
let db;

function persist() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(sqlitePath, Buffer.from(data));
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    if (params && params.length) stmt.bind(params);
    if (!stmt.step()) return null;
    return stmt.getAsObject();
  } finally {
    stmt.free();
  }
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  const rows = [];
  try {
    if (params && params.length) stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    return rows;
  } finally {
    stmt.free();
  }
}

export async function initDB() {
  SQL = await initSqlJs();

  // Load file if present, otherwise create empty DB
  if (fs.existsSync(sqlitePath)) {
    const buf = fs.readFileSync(sqlitePath);
    db = new SQL.Database(new Uint8Array(buf));
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`CREATE TABLE IF NOT EXISTS admin (username TEXT NOT NULL, password TEXT NOT NULL);`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK (id = 1), rounds INTEGER, attempts INTEGER);`);
  db.run(`CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, text TEXT, answer TEXT);`);
  db.run(`CREATE TABLE IF NOT EXISTS tourist_spots (id TEXT PRIMARY KEY, country TEXT, name TEXT, description TEXT);`);

  // compute existing counts
  const adminCountRow = queryOne(`SELECT COUNT(*) as c FROM admin`);
  const settingsCountRow = queryOne(`SELECT COUNT(*) as c FROM settings`);
  const questionsCountRow = queryOne(`SELECT COUNT(*) as c FROM questions`);
  let adminCount = adminCountRow ? adminCountRow.c : 0;
  let settingsCount = settingsCountRow ? settingsCountRow.c : 0;
  let questionsCount = questionsCountRow ? questionsCountRow.c : 0;

  if (adminCount === 0) db.run(`INSERT INTO admin (username, password) VALUES (?, ?);`, ["admin", "admin"]);
  if (settingsCount === 0) db.run(`INSERT INTO settings (id, rounds, attempts) VALUES (1, ?, ?);`, [5, 3]);
  persist();
}

export function getAdmin() {
  return queryOne(`SELECT username, password FROM admin LIMIT 1`) || null;
}

export function setAdmin(username, password) {
  const existsRow = queryOne(`SELECT COUNT(*) as c FROM admin`);
  const exists = existsRow ? existsRow.c : 0;
  if (exists) db.run(`UPDATE admin SET username = ?, password = ?;`, [username, password]);
  else db.run(`INSERT INTO admin (username, password) VALUES (?, ?);`, [username, password]);
  persist();
}

export function getSettings() {
  return queryOne(`SELECT rounds, attempts FROM settings WHERE id = 1`) || { rounds: 5, attempts: 3 };
}

export function setSettings(rounds, attempts) {
  const existsRow = queryOne(`SELECT COUNT(*) as c FROM settings`);
  const exists = existsRow ? existsRow.c : 0;
  if (exists) db.run(`UPDATE settings SET rounds = ?, attempts = ? WHERE id = 1;`, [rounds, attempts]);
  else db.run(`INSERT INTO settings (id, rounds, attempts) VALUES (1, ?, ?);`, [rounds, attempts]);
  persist();
}

export function getQuestions() {
  return queryAll(`SELECT id, text, answer FROM questions ORDER BY rowid ASC`);
}

export function getSpotsByCountry(country) {
  if (!country) return [];
  return queryAll(`SELECT id, country, name, description FROM tourist_spots WHERE country = ? ORDER BY rowid ASC`, [country]);
}

export function addSpot({ id, country, name, description }) {
  const generatedId = id || Math.random().toString(36).substr(2, 8);
  try {
    db.run(`INSERT INTO tourist_spots (id, country, name, description) VALUES (?, ?, ?, ?);`, [generatedId, country, name, description ?? ""]);
    persist();
    return { id: generatedId, country, name, description };
  } catch (err) {
    console.error('DB addSpot error:', err && err.message ? err.message : err);
    throw err;
  }
}

export function updateSpot(id, name, description) {
  db.run(`UPDATE tourist_spots SET name = ?, description = ? WHERE id = ?;`, [name, description, id]);
  const row = queryOne(`SELECT id, country, name, description FROM tourist_spots WHERE id = ?`, [id]);
  persist();
  return row || null;
}

export function deleteSpot(id) {
  db.run(`DELETE FROM tourist_spots WHERE id = ?;`, [id]);
  persist();
  const row = queryOne(`SELECT COUNT(*) as c FROM tourist_spots WHERE id = ?`, [id]);
  return row ? row.c === 0 : true;
}

export function deleteAllSpotsByCountry(country) {
  db.run(`DELETE FROM tourist_spots WHERE country = ?;`, [country]);
  persist();
}

export function addQuestion({ id, text, answer }) {
  if (!text || !text.toString().trim()) {
    throw new Error('Invalid question text');
  }
  const normalized = text.toString().trim().toLowerCase();
  // Prevent duplicates by comparing normalized text
  const existing = queryOne(`SELECT id FROM questions WHERE lower(trim(text)) = ? LIMIT 1`, [normalized]);
  if (existing) {
    const e = new Error('Question already exists');
    e.code = 'DUPLICATE_QUESTION';
    throw e;
  }

  const generatedId = id || Math.random().toString(36).substr(2, 8);
  db.run(`INSERT INTO questions (id, text, answer) VALUES (?, ?, ?);`, [generatedId, text, answer ?? ""]);
  persist();
  return { id: generatedId, text, answer };
}

export function updateQuestion(id, text, answer) {
  db.run(`UPDATE questions SET text = ?, answer = ? WHERE id = ?;`, [text, answer, id]);
  // sql.js doesn't provide rowcount directly; query to verify
  const row = queryOne(`SELECT id, text, answer FROM questions WHERE id = ?`, [id]);
  return row || null;
}

export function deleteQuestion(id) {
  db.run(`DELETE FROM questions WHERE id = ?;`, [id]);
  persist();
  const row = queryOne(`SELECT COUNT(*) as c FROM questions WHERE id = ?`, [id]);
  return row ? row.c === 0 : true;
}

export function deleteAllQuestions() {
  db.run(`DELETE FROM questions;`);
  persist();
}

