// Demo: Same product in 3 stores, different prices/distances
const demoProducts = [
  // Basmati Rice (5kg) in 3 stores
  { name: "Basmati Rice (5kg)", price: 320, stock: 20, biz: "biz-1" }, // Sharma General Store
  { name: "Basmati Rice (5kg)", price: 340, stock: 15, biz: "biz-5" }, // Verma Kirana & Provisions
  { name: "Basmati Rice (5kg)", price: 320, stock: 10, biz: "biz-3" }, // Khan Medical Store (same price, different location)
  // Sunflower Oil (1L) in 3 stores
  { name: "Sunflower Oil (1L)", price: 140, stock: 10, biz: "biz-1" },
  { name: "Sunflower Oil (1L)", price: 145, stock: 8, biz: "biz-5" },
  { name: "Sunflower Oil (1L)", price: 140, stock: 12, biz: "biz-3" },
  // Toor Dal (1kg) in 3 stores
  { name: "Toor Dal (1kg)", price: 130, stock: 18, biz: "biz-1" },
  { name: "Toor Dal (1kg)", price: 135, stock: 14, biz: "biz-5" },
  { name: "Toor Dal (1kg)", price: 130, stock: 16, biz: "biz-3" },
];
for (const p of demoProducts) {
  insertProduct.run(p.name, p.price, p.stock, p.biz);
}
import Database from "better-sqlite3";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "../dev.db"));

db.exec("PRAGMA foreign_keys = OFF");

// Add lat/lng columns if missing
try { db.exec("ALTER TABLE Business ADD COLUMN lat REAL DEFAULT 22.5524"); } catch (e) {}
try { db.exec("ALTER TABLE Business ADD COLUMN lng REAL DEFAULT 75.7565"); } catch (e) {}

// Users
const insertUser = db.prepare(`INSERT OR IGNORE INTO User (id, email, role) VALUES (?, ?, ?)`);
insertUser.run("owner-1", "sharma@demo.com", "owner");
insertUser.run("owner-2", "patel@demo.com",  "owner");
insertUser.run("owner-3", "khan@demo.com",   "owner");
insertUser.run("owner-4", "gupta@demo.com",  "owner");
insertUser.run("owner-5", "verma@demo.com",  "owner");

// Businesses — all at real Mhow locations
// Sadar Bazar: 22.5524, 75.7563
// Ambedkar Chowk: 22.5551, 75.7528
// Cantonment/Station Rd: 22.5497, 75.7601
// Gandhi Chowk: 22.5538, 75.7548
// Bus Stand area: 22.5512, 75.7572
const insertBiz = db.prepare(`
  INSERT OR REPLACE INTO Business
  (id, name, type, city, locality, areaType, customerAgeRange, deliveryRadius, operatingHours, ownerId, lat, lng)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
insertBiz.run("biz-1", "Sharma General Store",    "grocery",     "Mhow", "Sadar Bazar",       "Urban", "25-50", 3, "8AM-10PM", "owner-1", 22.5524, 75.7563);
insertBiz.run("biz-2", "Patel Electronics",        "electronics", "Mhow", "Station Road",      "Urban", "18-35", 5, "10AM-9PM", "owner-2", 22.5497, 75.7601);
insertBiz.run("biz-3", "Khan Medical Store",        "pharmacy",    "Mhow", "Ambedkar Chowk",    "Urban", "30-60", 2, "8AM-11PM", "owner-3", 22.5551, 75.7528);
insertBiz.run("biz-4", "Gupta Stationery & Books",  "stationery",  "Mhow", "Gandhi Chowk",      "Urban", "13-25", 3, "9AM-8PM",  "owner-4", 22.5538, 75.7548);
insertBiz.run("biz-5", "Verma Kirana & Provisions", "grocery",     "Mhow", "Bus Stand Area",    "Urban", "25-55", 4, "7AM-10PM", "owner-5", 22.5512, 75.7572);

// Products
const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO Product (id, name, price, stock, businessId)
  VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)
`);

const groceryProducts = [
  ["Basmati Rice (5kg)", 320, 40], ["Sunflower Oil (1L)", 140, 25],
  ["Toor Dal (1kg)", 130, 30], ["Electric Induction Cooktop", 1499, 5],
  ["Atta (10kg)", 380, 20], ["Sugar (1kg)", 45, 50],
  ["Cold Drink (Coke 2L)", 90, 24], ["Mosquito Repellent Spray", 110, 15],
  ["Packaged Water (20L)", 60, 18], ["Namkeen Snacks Assorted", 30, 60],
];
const electronicsProducts = [
  ["USB-C Cable (2m)", 299, 35], ["Boat Earbuds Wireless", 1299, 12],
  ["Power Bank 10000mAh", 899, 8], ["LED Bulb 9W Pack of 4", 199, 40],
  ["Extension Board 4-Socket", 449, 20], ["Mobile Screen Guard", 99, 60],
  ["Bluetooth Speaker Mini", 799, 10], ["Laptop Cooling Pad", 599, 7],
  ["HDMI Cable 1.5m", 249, 15], ["Smart Plug Wi-Fi", 649, 9],
];
const pharmacyProducts = [
  ["Paracetamol 500mg Strip", 25, 100], ["ORS Electrolyte Powder", 35, 80],
  ["Vitamin C 500mg 30 tabs", 120, 45], ["Hand Sanitizer 200ml", 85, 60],
  ["Blood Pressure Monitor", 1299, 4], ["Glucometer Test Strips", 399, 20],
  ["Bandage Roll 5cm", 45, 50], ["Cough Syrup 100ml", 75, 35],
  ["Antacid Tablets Strip", 30, 90], ["Digital Thermometer", 249, 15],
];
const stationeryProducts = [
  ["Classmate Notebook 200pg", 65, 80], ["Geometry Box Set", 120, 35],
  ["Ball Pen Pack of 10", 45, 100], ["A4 Printer Paper 500 sheets", 280, 25],
  ["Sticky Notes Multicolor", 55, 60], ["Highlighter Set 6 colors", 89, 40],
  ["Scientific Calculator", 399, 15], ["Sketch Pen Set 24 colors", 149, 30],
  ["Pencil Box Plastic", 75, 45], ["Correction Pen Fluid", 35, 70],
];
const kiranaProducts2 = [
  ["Tata Salt 1kg", 22, 100], ["Amul Butter 500g", 275, 30],
  ["Maggi Noodles Pack of 8", 112, 45], ["Parle-G Biscuits 1kg", 55, 60],
  ["Lifebuoy Soap Pack of 4", 88, 40], ["Ariel Detergent 1kg", 185, 25],
  ["Dettol Antiseptic 250ml", 130, 20], ["Colgate Toothpaste 300g", 115, 35],
  ["Lays Chips Family Pack", 60, 50], ["Dairy Milk Chocolate 100g", 90, 40],
];

for (const [n,p,s] of groceryProducts)    insertProduct.run(n,p,s,"biz-1");
for (const [n,p,s] of electronicsProducts) insertProduct.run(n,p,s,"biz-2");
for (const [n,p,s] of pharmacyProducts)   insertProduct.run(n,p,s,"biz-3");
for (const [n,p,s] of stationeryProducts) insertProduct.run(n,p,s,"biz-4");
for (const [n,p,s] of kiranaProducts2)    insertProduct.run(n,p,s,"biz-5");

db.exec("PRAGMA foreign_keys = ON");
console.log("Seeded 5 real Mhow shops with accurate coordinates");
db.close();