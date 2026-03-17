import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "../dev.db"));

db.exec(`
  INSERT OR IGNORE INTO User (id, email, role) 
  VALUES ('demo-user', 'owner@demo.com', 'owner');

  INSERT OR IGNORE INTO Business (id, name, type, city, locality, areaType, customerAgeRange, deliveryRadius, ownerId)
  VALUES ('demo-biz', 'Sharma General Store', 'grocery', 'Pithampur', 'Sector 1', 'Urban', '25-50', 5, 'demo-user');
`);

const products = [
  ['Basmati Rice (5kg)', 320, 40],
  ['Sunflower Oil (1L)', 140, 25],
  ['Toor Dal (1kg)', 130, 30],
  ['Electric Induction Cooktop', 1499, 5],
  ['Atta (10kg)', 380, 20],
  ['Sugar (1kg)', 45, 50],
  ['Cold Drink (Coke 2L)', 90, 24],
  ['Mosquito Repellent Spray', 110, 15],
  ['Packaged Drinking Water (20L)', 60, 18],
  ['Namkeen Snacks Assorted', 30, 60],
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO Product (id, name, price, stock, businessId)
  VALUES (lower(hex(randomblob(16))), ?, ?, ?, 'demo-biz')
`);

for (const [name, price, stock] of products) {
  insert.run(name, price, stock);
}

console.log("Seeded successfully");
db.close();