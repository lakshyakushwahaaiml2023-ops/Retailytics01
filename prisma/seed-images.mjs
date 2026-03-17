import Database from "better-sqlite3";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "../dev.db"));

// Exact and fuzzy mappings — filename (without .jpg) → product name pattern
const mappings = [
  ["A4 Printer Paper 500 sheets",        "A4 Printer Paper"],
  ["Amul Butter 500g",                   "Amul Butter"],
  ["Antacid Tablets (Strip)",            "Antacid Tablets"],
  ["Ariel Detergent 1kg",                "Ariel Detergent"],
  ["Atta (10kg)",                        "Atta"],
  ["Ball Pen Pack of 10",                "Ball Pen"],
  ["Bandage Roll (5cm)",                 "Bandage Roll"],
  ["Basmati Rice (5kg)",                 "Basmati Rice"],
  ["Blood Pressure Monitor",             "Blood Pressure Monitor"],
  ["Bluetooth Speaker Mini",             "Bluetooth Speaker"],
  ["Boat Earbuds (Wireless)",            "Boat Earbuds"],
  ["Classmate Notebook 200pg",           "Classmate Notebook"],
  ["Cold Drink (Coke 2L)",               "Cold Drink"],
  ["Colgate Toothpaste 300g",            "Colgate Toothpaste"],
  ["Correction Pen Fluid",               "Correction Pen"],
  ["Cough Syrup 100ml",                  "Cough Syrup"],
  ["Dairy Milk Chocolate 100g",          "Dairy Milk"],
  ["Dettol Antiseptic 250ml",            "Dettol Antiseptic"],
  ["Digital Thermometer",                "Digital Thermometer"],
  ["Electric Induction Cooktop",         "Electric Induction Cooktop"],
  ["Extension Board 4-Socket",           "Extension Board"],
  ["Geometry Box Set",                   "Geometry Box"],
  ["Glucometer Test Strips",             "Glucometer Test Strips"],
  ["Hand Sanitizer 200ml",               "Hand Sanitizer"],
  ["HDMI Cable 1.5m",                    "HDMI Cable"],
  ["Highlighter Set 6 colors",           "Highlighter Set"],
  ["Laptop Cooling Pad",                 "Laptop Cooling Pad"],
  ["Lays Chips Family Pack",             "Lays Chips"],
  ["LED Bulb 9W (Pack of 4)",            "LED Bulb"],
  ["Lifebuoy Soap Pack of 4",            "Lifebuoy Soap"],
  ["Maggi Noodles Pack of 8",            "Maggi Noodles"],
  ["Mobile Screen Guard",                "Mobile Screen Guard"],
  ["Mosquito Repellent Spray",           "Mosquito Repellent"],
  ["Namkeen Snacks Assorted",            "Namkeen Snacks"],
  ["ORS Electrolyte Powder",             "ORS Electrolyte"],
  ["Packaged Drinking Water (20L)",      "Packaged Water"],
  ["Paracetamol 500mg (Strip)",          "Paracetamol"],
  ["Parle-G Biscuits 1kg",               "Parle-G Biscuits"],
  ["Pencil Box Plastic",                 "Pencil Box"],
  ["Power Bank 10000mAh",                "Power Bank"],
  ["Scientific Calculator",              "Scientific Calculator"],
  ["Sketch Pen Set 24 colors",           "Sketch Pen Set"],
  ["Smart Plug (Wi-Fi)",                 "Smart Plug"],
  ["Sticky Notes Multicolor",            "Sticky Notes"],
  ["Sugar (1kg)",                        "Sugar"],
  ["Sunflower Oil (1L)",                 "Sunflower Oil"],
  ["Tata Salt 1kg",                      "Tata Salt"],
  ["Thermometer Digital",                "Digital Thermometer"],
  ["Toor Dal (1kg)",                     "Toor Dal"],
  ["USB-C Charging Cable (2m)",          "USB-C Cable"],
  ["Vitamin C 500mg (30 tabs)",          "Vitamin C"],
];

// Ensure image column exists
try {
  db.exec("ALTER TABLE Product ADD COLUMN image TEXT DEFAULT ''");
  console.log("Added image column");
} catch {}

let updated = 0;
let notFound = 0;

for (const [filename, searchTerm] of mappings) {
  const imageUrl = `/uploads/${filename}.jpg`;

  // Try exact match first, then LIKE
  const result = db.prepare(
    "UPDATE Product SET image = ? WHERE name LIKE ? AND (image IS NULL OR image = '')"
  ).run(imageUrl, `%${searchTerm}%`);

  if (result.changes > 0) {
    console.log(`✅ ${searchTerm} → ${imageUrl} (${result.changes} product${result.changes > 1 ? "s" : ""})`);
    updated += result.changes;
  } else {
    // Try updating even if image already set
    const result2 = db.prepare(
      "UPDATE Product SET image = ? WHERE name LIKE ?"
    ).run(imageUrl, `%${searchTerm}%`);

    if (result2.changes > 0) {
      console.log(`🔄 ${searchTerm} → updated ${result2.changes} product(s)`);
      updated += result2.changes;
    } else {
      console.log(`❌ Not found: ${searchTerm}`);
      notFound++;
    }
  }
}

// Summary
console.log(`\n✅ Updated: ${updated} products`);
console.log(`❌ Not matched: ${notFound} images`);

// Show all products with images
const withImages = db.prepare("SELECT name, image FROM Product WHERE image != '' AND image IS NOT NULL").all();
console.log(`\n📸 Products with images (${withImages.length}):`);
withImages.forEach((p: any) => console.log(`  ${p.name} → ${p.image}`));

db.close();
