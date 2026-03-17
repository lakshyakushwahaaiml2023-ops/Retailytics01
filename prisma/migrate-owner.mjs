import Database from "better-sqlite3";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "../dev.db"));

db.exec("PRAGMA foreign_keys = OFF");

// Add image column to Product
try {
  db.exec("ALTER TABLE Product ADD COLUMN image TEXT DEFAULT ''");
  console.log("Added image column to Product");
} catch (e) { console.log("Product.image already exists"); }

// Create OfflineSale table
db.exec(`
  CREATE TABLE IF NOT EXISTS OfflineSale (
    id          TEXT PRIMARY KEY,
    businessId  TEXT NOT NULL,
    productId   TEXT,
    productName TEXT NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    price       REAL NOT NULL,
    total       REAL NOT NULL,
    note        TEXT DEFAULT '',
    soldAt      TEXT DEFAULT (datetime('now')),
    createdAt   TEXT DEFAULT (datetime('now'))
  )
`);
console.log("OfflineSale table ready");

// Create uploads directory
try {
  mkdirSync(join(__dirname, "../public/uploads"), { recursive: true });
  console.log("public/uploads directory ready");
} catch (e) {}

db.exec("PRAGMA foreign_keys = ON");
console.log("Migration complete");
db.close();
