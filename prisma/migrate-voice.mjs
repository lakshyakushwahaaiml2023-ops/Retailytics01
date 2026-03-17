import Database from "better-sqlite3";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "../dev.db"));

db.exec("PRAGMA foreign_keys = OFF");

// Add notified column to Order table
try {
  db.exec("ALTER TABLE [Order] ADD COLUMN notified INTEGER DEFAULT 0");
  console.log("Added notified column");
} catch (e) {
  console.log("notified column already exists");
}

// Add createdAt column to Order table
try {
  db.exec("ALTER TABLE [Order] ADD COLUMN createdAt TEXT DEFAULT (datetime('now'))");
  console.log("Added createdAt column");
} catch (e) {
  console.log("createdAt column already exists");
}

// Add phone column to Order table
try {
  db.exec("ALTER TABLE [Order] ADD COLUMN phone TEXT DEFAULT ''");
  console.log("Added phone column");
} catch (e) {
  console.log("phone column already exists");
}

// Create VoiceLog table
db.exec(`CREATE TABLE IF NOT EXISTS VoiceLog (
  id TEXT PRIMARY KEY,
  orderId TEXT,
  intent TEXT,
  transcript TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
)`);
console.log("VoiceLog table ready");

db.exec("PRAGMA foreign_keys = ON");
console.log("Migration complete");
db.close();
