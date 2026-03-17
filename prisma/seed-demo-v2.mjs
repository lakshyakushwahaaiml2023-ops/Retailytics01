import Database from "better-sqlite3";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "../dev.db"));

db.exec("PRAGMA foreign_keys = OFF");

// Add columns if missing
try { db.exec("ALTER TABLE Business ADD COLUMN lat REAL DEFAULT 22.5524"); } catch (e) {}
try { db.exec("ALTER TABLE Business ADD COLUMN lng REAL DEFAULT 75.7565"); } catch (e) {}
try { db.exec("ALTER TABLE Business ADD COLUMN phone TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE [Order] ADD COLUMN notified INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE [Order] ADD COLUMN createdAt TEXT DEFAULT (datetime('now'))"); } catch (e) {}
try { db.exec("ALTER TABLE [Order] ADD COLUMN phone TEXT DEFAULT ''"); } catch (e) {}
db.exec(`CREATE TABLE IF NOT EXISTS CustomerProfile (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL, city TEXT DEFAULT 'Indore',
  lat REAL, lng REAL, createdAt TEXT DEFAULT (datetime('now'))
)`);
db.exec(`CREATE TABLE IF NOT EXISTS VoiceLog (
  id TEXT PRIMARY KEY, orderId TEXT, intent TEXT,
  transcript TEXT, createdAt TEXT DEFAULT (datetime('now'))
)`);

// ── Demo owners ──
const insertUser = db.prepare(`INSERT OR IGNORE INTO User (id, email, role) VALUES (?, ?, ?)`);
insertUser.run("owner-1", "sharma@demo.com", "owner");
insertUser.run("owner-2", "patel@demo.com",  "owner");
insertUser.run("owner-3", "khan@demo.com",   "owner");
insertUser.run("owner-4", "gupta@demo.com",  "owner");
insertUser.run("owner-5", "verma@demo.com",  "owner");

// ── Demo businesses — all with phone 6268347442 ──
// Real Mhow locations:
// Sadar Bazar: 22.5524, 75.7563
// Ambedkar Chowk: 22.5551, 75.7528
// Station Road / Cantonment: 22.5497, 75.7601
// Gandhi Chowk: 22.5538, 75.7548
// Bus Stand: 22.5512, 75.7572
const insertBiz = db.prepare(`
  INSERT OR REPLACE INTO Business
  (id, name, type, city, locality, areaType, customerAgeRange, deliveryRadius, operatingHours, ownerId, lat, lng, phone)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
insertBiz.run("biz-1","Sharma General Store",    "grocery",    "Mhow","Sadar Bazar",       "Urban","25-50",3,"8AM-10PM","owner-1",22.5524,75.7563,"6268347442");
insertBiz.run("biz-2","Patel Electronics",        "electronics","Mhow","Station Road",      "Urban","18-35",5,"10AM-9PM","owner-2",22.5497,75.7601,"6268347442");
insertBiz.run("biz-3","Khan Medical Store",        "pharmacy",   "Mhow","Ambedkar Chowk",   "Urban","30-60",2,"8AM-11PM","owner-3",22.5551,75.7528,"6268347442");
insertBiz.run("biz-4","Gupta Stationery & Books",  "stationery", "Mhow","Gandhi Chowk",     "Urban","13-25",3,"9AM-8PM", "owner-4",22.5538,75.7548,"6268347442");
insertBiz.run("biz-5","Verma Kirana & Provisions","grocery",    "Mhow","Bus Stand Area",    "Urban","25-55",4,"7AM-10PM","owner-5",22.5512,75.7572,"6268347442");

// ── Products ──
const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO Product (id, name, price, stock, businessId)
  VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)
`);
const groceryProducts = [
  ["Basmati Rice (5kg)",320,40],["Sunflower Oil (1L)",140,25],["Toor Dal (1kg)",130,30],
  ["Electric Induction Cooktop",1499,5],["Atta (10kg)",380,20],["Sugar (1kg)",45,50],
  ["Cold Drink (Coke 2L)",90,24],["Mosquito Repellent Spray",110,15],
  ["Packaged Water (20L)",60,18],["Namkeen Snacks Assorted",30,60],
];
const electronicsProducts = [
  ["USB-C Cable (2m)",299,35],["Boat Earbuds Wireless",1299,12],["Power Bank 10000mAh",899,8],
  ["LED Bulb 9W Pack of 4",199,40],["Extension Board 4-Socket",449,20],["Mobile Screen Guard",99,60],
  ["Bluetooth Speaker Mini",799,10],["Laptop Cooling Pad",599,7],["HDMI Cable 1.5m",249,15],["Smart Plug Wi-Fi",649,9],
];
const pharmacyProducts = [
  ["Paracetamol 500mg Strip",25,100],["ORS Electrolyte Powder",35,80],["Vitamin C 500mg 30 tabs",120,45],
  ["Hand Sanitizer 200ml",85,60],["Blood Pressure Monitor",1299,4],["Glucometer Test Strips",399,20],
  ["Bandage Roll 5cm",45,50],["Cough Syrup 100ml",75,35],["Antacid Tablets Strip",30,90],["Digital Thermometer",249,15],
];
const stationeryProducts = [
  ["Classmate Notebook 200pg",65,80],["Geometry Box Set",120,35],["Ball Pen Pack of 10",45,100],
  ["A4 Printer Paper 500 sheets",280,25],["Sticky Notes Multicolor",55,60],["Highlighter Set 6 colors",89,40],
  ["Scientific Calculator",399,15],["Sketch Pen Set 24 colors",149,30],["Pencil Box Plastic",75,45],["Correction Pen",35,70],
];
const kiranaProducts2 = [
  ["Tata Salt 1kg",22,100],["Amul Butter 500g",275,30],["Maggi Noodles Pack of 8",112,45],
  ["Parle-G Biscuits 1kg",55,60],["Lifebuoy Soap Pack of 4",88,40],["Ariel Detergent 1kg",185,25],
  ["Dettol Antiseptic 250ml",130,20],["Colgate Toothpaste 300g",115,35],["Lays Chips Family Pack",60,50],["Dairy Milk 100g",90,40],
];
for (const [n,p,s] of groceryProducts)    insertProduct.run(n,p,s,"biz-1");
for (const [n,p,s] of electronicsProducts) insertProduct.run(n,p,s,"biz-2");
for (const [n,p,s] of pharmacyProducts)   insertProduct.run(n,p,s,"biz-3");
for (const [n,p,s] of stationeryProducts) insertProduct.run(n,p,s,"biz-4");
for (const [n,p,s] of kiranaProducts2)    insertProduct.run(n,p,s,"biz-5");

// ── Demo customer profiles ──
// Geocoded approximate coordinates for Indore area addresses
const insertCustomer = db.prepare(`
  INSERT OR REPLACE INTO CustomerProfile (id, name, phone, address, city, lat, lng)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
insertCustomer.run(randomUUID(), "Monty",   "8109030045", "Rau, Indore",               "Indore", 22.6462, 75.7495);
insertCustomer.run(randomUUID(), "Kunal",   "9302139664", "Rau Bypass, Indore",         "Indore", 22.6410, 75.7520);
insertCustomer.run(randomUUID(), "Riya",    "8770648942", "Narmada Chauraha, Indore",   "Indore", 22.7127, 75.8681);
insertCustomer.run(randomUUID(), "Ishant",  "9669666845", "Sudama Nagar, Indore",       "Indore", 22.7196, 75.8823);
insertCustomer.run(randomUUID(), "Lakshya", "6268347442", "Mhow, Indore",               "Indore", 22.5524, 75.7565);

db.exec("PRAGMA foreign_keys = ON");
console.log("Seeded 5 Mhow shops + 5 customer profiles");
db.close();
