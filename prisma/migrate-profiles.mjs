import Database from "better-sqlite3";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "../dev.db"));

db.exec("PRAGMA foreign_keys = OFF");

// Add phone to Business
try { db.exec("ALTER TABLE Business ADD COLUMN phone TEXT DEFAULT ''"); console.log("Added phone to Business"); }
catch (e) { console.log("Business.phone already exists"); }

// Create CustomerProfile table
db.exec(`
  CREATE TABLE IF NOT EXISTS CustomerProfile (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    phone     TEXT UNIQUE NOT NULL,
    address   TEXT NOT NULL,
    city      TEXT DEFAULT 'Indore',
    lat       REAL,
    lng       REAL,
    createdAt TEXT DEFAULT (datetime('now'))
  )
`);
console.log("CustomerProfile table ready");

db.exec("PRAGMA foreign_keys = ON");
console.log("Migration complete");
db.close();
