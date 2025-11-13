import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB, getQuestions } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlitePath = path.join(__dirname, '..', 'data.sqlite');

async function main() {
  const sqlArg = process.argv.slice(2).join(' ').trim();

  // If no SQL provided, use the exported helper to print questions
  if (!sqlArg) {
    await initDB();
    const rows = getQuestions();
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  // Run arbitrary read-only SQL directly using sql.js against data.sqlite
  if (!fs.existsSync(sqlitePath)) {
    console.error('No data.sqlite found at', sqlitePath);
    process.exitCode = 3;
    return;
  }

  const SQL = await initSqlJs();
  const buf = fs.readFileSync(sqlitePath);
  const db = new SQL.Database(new Uint8Array(buf));

  try {
    const stmt = db.prepare(sqlArg);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Query failed:', err && err.message ? err.message : err);
    process.exitCode = 2;
  } finally {
    try { db.close(); } catch (e) { /* ignore */ }
  }
}

main();
