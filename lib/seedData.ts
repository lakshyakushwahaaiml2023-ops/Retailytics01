import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";

export type SeedResult = {
  success: boolean;
  message: string;
  businesses: { id: string; name: string; type: string; productCount: number; salesDays: number }[];
  suppliersCount: number;
  signalsCount: number;
  recommendationsCount: number;
  totalSalesRecords: number;
};

export async function seedWorkforceData(resetExisting = false): Promise<SeedResult> {
  const dbPath = path.resolve(process.cwd(), "dev.db");
  const db = new Database(dbPath);

  db.exec("PRAGMA foreign_keys = OFF");

  try {
    // 1. Ensure all tables exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS User (
        id TEXT NOT NULL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS Business (
        id TEXT NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        city TEXT NOT NULL,
        locality TEXT NOT NULL,
        areaType TEXT NOT NULL,
        customerAgeRange TEXT NOT NULL,
        deliveryRadius INTEGER NOT NULL,
        operatingHours TEXT NOT NULL DEFAULT '9AM-9PM',
        ownerId TEXT NOT NULL,
        lat REAL NOT NULL DEFAULT 22.5518,
        lng REAL NOT NULL DEFAULT 75.7720,
        phone TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS Supplier (
        id TEXT NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        contactName TEXT,
        email TEXT,
        phone TEXT NOT NULL,
        category TEXT NOT NULL,
        leadTimeDays INTEGER NOT NULL DEFAULT 3,
        reliabilityScore REAL NOT NULL DEFAULT 0.95,
        businessId TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS Product (
        id TEXT NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        cost REAL NOT NULL DEFAULT 0.0,
        stock INTEGER NOT NULL,
        reorderLevel INTEGER NOT NULL DEFAULT 10,
        leadTimeDays INTEGER NOT NULL DEFAULT 3,
        category TEXT NOT NULL DEFAULT 'General',
        image TEXT DEFAULT '',
        businessId TEXT NOT NULL,
        supplierId TEXT
      );

      CREATE TABLE IF NOT EXISTS SalesHistory (
        id TEXT NOT NULL PRIMARY KEY,
        productId TEXT NOT NULL,
        businessId TEXT NOT NULL,
        date TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        revenue REAL NOT NULL,
        channel TEXT NOT NULL DEFAULT 'pos',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS SalesHistory_productId_date_idx ON SalesHistory(productId, date);
      CREATE INDEX IF NOT EXISTS SalesHistory_businessId_date_idx ON SalesHistory(businessId, date);

      CREATE TABLE IF NOT EXISTS Signal (
        id TEXT NOT NULL PRIMARY KEY,
        title TEXT NOT NULL,
        source TEXT NOT NULL,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        impact TEXT NOT NULL,
        multiplier REAL NOT NULL DEFAULT 1.0,
        affectedCategories TEXT NOT NULL,
        city TEXT DEFAULT 'Indore',
        active BOOLEAN NOT NULL DEFAULT 1,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS Recommendation (
        id TEXT NOT NULL PRIMARY KEY,
        businessId TEXT NOT NULL,
        productId TEXT,
        signalId TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        action TEXT NOT NULL,
        reason TEXT NOT NULL,
        suggestedQty INTEGER,
        suggestedPrice REAL,
        urgency TEXT NOT NULL DEFAULT 'Medium',
        status TEXT NOT NULL DEFAULT 'pending',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS AgentRun (
        id TEXT NOT NULL PRIMARY KEY,
        businessId TEXT NOT NULL,
        goal TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        plan TEXT,
        startedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completedAt DATETIME
      );

      CREATE TABLE IF NOT EXISTS Task (
        id TEXT NOT NULL PRIMARY KEY,
        runId TEXT NOT NULL,
        title TEXT NOT NULL,
        agentRole TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        dependencies TEXT NOT NULL DEFAULT '[]',
        input TEXT,
        output TEXT,
        retryCount INTEGER NOT NULL DEFAULT 0,
        maxRetries INTEGER NOT NULL DEFAULT 3,
        errorMessage TEXT,
        startedAt DATETIME,
        completedAt DATETIME
      );

      CREATE TABLE IF NOT EXISTS Approval (
        id TEXT NOT NULL PRIMARY KEY,
        runId TEXT,
        taskId TEXT,
        businessId TEXT NOT NULL,
        actionType TEXT NOT NULL,
        description TEXT NOT NULL,
        payload TEXT NOT NULL,
        estimatedCost REAL,
        status TEXT NOT NULL DEFAULT 'pending',
        decidedBy TEXT,
        decidedAt DATETIME,
        notes TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS AuditLog (
        id TEXT NOT NULL PRIMARY KEY,
        runId TEXT,
        businessId TEXT,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'info',
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS Escalation (
        id TEXT NOT NULL PRIMARY KEY,
        businessId TEXT NOT NULL,
        orderId TEXT,
        type TEXT NOT NULL,
        target TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retryCount INTEGER NOT NULL DEFAULT 0,
        reason TEXT NOT NULL,
        metadata TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS CustomerProfile (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        address TEXT NOT NULL,
        city TEXT DEFAULT 'Indore',
        lat REAL,
        lng REAL,
        createdAt TEXT DEFAULT (datetime('now'))
      );
    `);

    // Ensure columns exist on Product & Business
    try { db.exec("ALTER TABLE Product ADD COLUMN cost REAL DEFAULT 0.0"); } catch {}
    try { db.exec("ALTER TABLE Product ADD COLUMN reorderLevel INTEGER DEFAULT 10"); } catch {}
    try { db.exec("ALTER TABLE Product ADD COLUMN leadTimeDays INTEGER DEFAULT 3"); } catch {}
    try { db.exec("ALTER TABLE Product ADD COLUMN category TEXT DEFAULT 'General'"); } catch {}
    try { db.exec("ALTER TABLE Product ADD COLUMN image TEXT DEFAULT ''"); } catch {}
    try { db.exec("ALTER TABLE Product ADD COLUMN supplierId TEXT"); } catch {}
    try { db.exec("ALTER TABLE Business ADD COLUMN phone TEXT DEFAULT ''"); } catch {}

    const TARGET_BIZ_IDS = ["demo-kirana-indore", "demo-electronics-indore"];

    // 2. If resetting, clear old data for these target businesses
    for (const bizId of TARGET_BIZ_IDS) {
      db.prepare("DELETE FROM SalesHistory WHERE businessId = ?").run(bizId);
      db.prepare("DELETE FROM Recommendation WHERE businessId = ?").run(bizId);
      db.prepare("DELETE FROM Product WHERE businessId = ?").run(bizId);
      db.prepare("DELETE FROM Supplier WHERE businessId = ?").run(bizId);
      db.prepare("DELETE FROM Approval WHERE businessId = ?").run(bizId);
      db.prepare("DELETE FROM Task WHERE runId IN (SELECT id FROM AgentRun WHERE businessId = ?)").run(bizId);
      db.prepare("DELETE FROM AuditLog WHERE businessId = ?").run(bizId);
      db.prepare("DELETE FROM AgentRun WHERE businessId = ?").run(bizId);
      db.prepare("DELETE FROM Escalation WHERE businessId = ?").run(bizId);
    }

    // Clear old global signals if reset requested
    if (resetExisting) {
      db.prepare("DELETE FROM Signal").run();
    }

    // 3. Insert or Ensure Owners Exist
    const insertUser = db.prepare("INSERT OR IGNORE INTO User (id, email, role) VALUES (?, ?, ?)");
    insertUser.run("owner-1", "sharma@demo.com", "owner");
    insertUser.run("owner-2", "patel@demo.com", "owner");

    // 4. Upsert Two Contrasting Demo Businesses in Indore
    const insertBiz = db.prepare(`
      INSERT INTO Business (id, name, type, city, locality, areaType, customerAgeRange, deliveryRadius, operatingHours, ownerId, lat, lng, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, type=excluded.type, city=excluded.city, locality=excluded.locality,
        areaType=excluded.areaType, customerAgeRange=excluded.customerAgeRange, deliveryRadius=excluded.deliveryRadius,
        operatingHours=excluded.operatingHours, ownerId=excluded.ownerId, lat=excluded.lat, lng=excluded.lng, phone=excluded.phone
    `);

    // Business 1: Kirana Store in Indore
    insertBiz.run(
      "demo-kirana-indore",
      "Apna Indore Kirana & Superstore",
      "grocery",
      "Indore",
      "Chhappan Dukan, New Palasia",
      "Urban",
      "20-55",
      5,
      "7:30AM-10:30PM",
      "owner-1",
      22.7244,
      75.8839,
      "6268347442"
    );

    // Business 2: Electronics Shop in Indore
    insertBiz.run(
      "demo-electronics-indore",
      "Indore Tech & Gadgets Hub",
      "electronics",
      "Indore",
      "Jail Road / Silver Mall",
      "Commercial",
      "18-40",
      8,
      "10:00AM-9:30PM",
      "owner-2",
      22.7196,
      75.8577,
      "6268347442"
    );

    // 5. Seed Suppliers
    const insertSupplier = db.prepare(`
      INSERT OR REPLACE INTO Supplier (id, name, contactName, email, phone, category, leadTimeDays, reliabilityScore, businessId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Kirana Suppliers
    insertSupplier.run("sup-k1", "Malwa Agro & Grain Wholesalers", "Sunil Patidar", "malwa.agro@gmail.com", "9826011223", "Staples & Grains", 2, 0.98, "demo-kirana-indore");
    insertSupplier.run("sup-k2", "Indore FMCG & Beverage Dist.", "Amit Agarwal", "indore.fmcg@distributors.in", "9826022334", "Dairy & Beverages", 1, 0.95, "demo-kirana-indore");
    insertSupplier.run("sup-k3", "Shree Mahalakshmi Dairy Products", "Gopal Sharma", "shree.dairy.indore@gmail.com", "9826033445", "Dairy & Beverages", 1, 0.92, "demo-kirana-indore");

    // Electronics Suppliers
    insertSupplier.run("sup-e1", "MP Gadgets & Mobile Spares Hub", "Vikram Rathore", "vikram.gadgets@mptraders.com", "9826044556", "Cables & Power", 3, 0.94, "demo-electronics-indore");
    insertSupplier.run("sup-e2", "Central India Audio & Cable Importers", "Dinesh Mehta", "dinesh@centralaudio.co.in", "9826055667", "Audio & Wearables", 5, 0.91, "demo-electronics-indore");
    insertSupplier.run("sup-e3", "Smart Electronics Indore Wholesales", "Kailash Jain", "kjain@smartelectronics.in", "9826066778", "Smart Home", 4, 0.96, "demo-electronics-indore");

    // 6. Define Products for both businesses
    type ProductDef = {
      id: string;
      name: string;
      category: string;
      price: number;
      cost: number;
      stock: number;
      reorderLevel: number;
      leadTimeDays: number;
      supplierId: string;
      image: string;
      profile: "fast" | "medium" | "low_stock" | "dead";
      baseDailySales: number; // base quantity per day
    };

    const kiranaProducts: ProductDef[] = [
      // Fast movers
      { id: "k-prod-1", name: "Basmati Rice (5kg)", category: "Staples & Grains", price: 340, cost: 280, stock: 45, reorderLevel: 15, leadTimeDays: 2, supplierId: "sup-k1", image: "/uploads/Basmati Rice (5kg).jpg", profile: "fast", baseDailySales: 16 },
      { id: "k-prod-2", name: "Chakki Fresh Atta (10kg)", category: "Staples & Grains", price: 390, cost: 320, stock: 35, reorderLevel: 20, leadTimeDays: 2, supplierId: "sup-k1", image: "/uploads/Atta (10kg).jpg", profile: "fast", baseDailySales: 18 },
      { id: "k-prod-3", name: "Amul Pure Butter (500g)", category: "Dairy & Beverages", price: 280, cost: 245, stock: 28, reorderLevel: 12, leadTimeDays: 1, supplierId: "sup-k3", image: "/uploads/Amul Butter 500g.jpg", profile: "fast", baseDailySales: 14 },
      { id: "k-prod-4", name: "Toor Dal Premium (1kg)", category: "Staples & Grains", price: 145, cost: 120, stock: 50, reorderLevel: 20, leadTimeDays: 2, supplierId: "sup-k1", image: "/uploads/Toor Dal (1kg).jpg", profile: "fast", baseDailySales: 12 },
      // Average movers
      { id: "k-prod-5", name: "Fortune Sunflower Oil (1L)", category: "Oils & Ghee", price: 145, cost: 125, stock: 40, reorderLevel: 15, leadTimeDays: 2, supplierId: "sup-k1", image: "/uploads/Sunflower Oil (1L).jpg", profile: "medium", baseDailySales: 8 },
      { id: "k-prod-6", name: "Tata Salt Iodized (1kg)", category: "Staples & Grains", price: 24, cost: 19, stock: 80, reorderLevel: 30, leadTimeDays: 3, supplierId: "sup-k1", image: "/uploads/Tata Salt 1kg.jpg", profile: "medium", baseDailySales: 7 },
      // Low stock items (stock <= reorderLevel)
      { id: "k-prod-7", name: "Cold Drink (Coke 2L)", category: "Dairy & Beverages", price: 95, cost: 78, stock: 4, reorderLevel: 15, leadTimeDays: 1, supplierId: "sup-k2", image: "/uploads/Cold Drink (Coke 2L).jpg", profile: "low_stock", baseDailySales: 15 },
      { id: "k-prod-8", name: "ORS Electrolyte Powder", category: "Dairy & Beverages", price: 35, cost: 26, stock: 3, reorderLevel: 20, leadTimeDays: 1, supplierId: "sup-k2", image: "/uploads/ORS Electrolyte Powder.jpg", profile: "low_stock", baseDailySales: 12 },
      { id: "k-prod-9", name: "Electric Induction Cooktop (2000W)", category: "Home Care", price: 1599, cost: 1250, stock: 2, reorderLevel: 5, leadTimeDays: 4, supplierId: "sup-k2", image: "/uploads/Electric Induction Cooktop.jpg", profile: "low_stock", baseDailySales: 4 },
      // Dead stock (0 sales)
      { id: "k-prod-10", name: "Organic Quinoa Seeds (500g)", category: "Niche / Specialty", price: 320, cost: 270, stock: 18, reorderLevel: 5, leadTimeDays: 7, supplierId: "sup-k1", image: "", profile: "dead", baseDailySales: 0 },
      { id: "k-prod-11", name: "Canned Asparagus Spears (400g)", category: "Niche / Specialty", price: 450, cost: 380, stock: 12, reorderLevel: 3, leadTimeDays: 10, supplierId: "sup-k2", image: "", profile: "dead", baseDailySales: 0 },
      { id: "k-prod-12", name: "Handcrafted Wooden Spice Box", category: "Home Care", price: 899, cost: 650, stock: 8, reorderLevel: 2, leadTimeDays: 14, supplierId: "sup-k1", image: "", profile: "dead", baseDailySales: 0 },
    ];

    const electronicsProducts: ProductDef[] = [
      // Fast movers
      { id: "e-prod-1", name: "Fast Charging USB-C Cable (2m)", category: "Cables & Power", price: 299, cost: 120, stock: 65, reorderLevel: 20, leadTimeDays: 3, supplierId: "sup-e1", image: "/uploads/USB-C Charging Cable (2m).jpg", profile: "fast", baseDailySales: 10 },
      { id: "e-prod-2", name: "Boat Wireless Earbuds (AirDoep)", category: "Audio & Wearables", price: 1299, cost: 850, stock: 30, reorderLevel: 10, leadTimeDays: 4, supplierId: "sup-e2", image: "/uploads/Boat Earbuds (Wireless).jpg", profile: "fast", baseDailySales: 7 },
      { id: "e-prod-3", name: "10000mAh Power Bank (Fast Charge)", category: "Cables & Power", price: 1099, cost: 720, stock: 25, reorderLevel: 8, leadTimeDays: 3, supplierId: "sup-e1", image: "/uploads/Power Bank 10000mAh.jpg", profile: "fast", baseDailySales: 5 },
      { id: "e-prod-4", name: "Universal Mobile Screen Guard 9H", category: "Mobile Accessories", price: 149, cost: 35, stock: 95, reorderLevel: 30, leadTimeDays: 2, supplierId: "sup-e1", image: "/uploads/Mobile Screen Guard.jpg", profile: "fast", baseDailySales: 12 },
      // Average movers
      { id: "e-prod-5", name: "Extension Board 4-Socket Surge", category: "Cables & Power", price: 499, cost: 280, stock: 32, reorderLevel: 10, leadTimeDays: 3, supplierId: "sup-e1", image: "/uploads/Extension Board 4-Socket.jpg", profile: "medium", baseDailySales: 4 },
      { id: "e-prod-6", name: "Bluetooth Speaker Mini Portable", category: "Audio & Wearables", price: 899, cost: 550, stock: 18, reorderLevel: 6, leadTimeDays: 5, supplierId: "sup-e2", image: "/uploads/Bluetooth Speaker Mini.jpg", profile: "medium", baseDailySales: 3 },
      // Low stock items (stock <= reorderLevel)
      { id: "e-prod-7", name: "Laptop Cooling Pad Dual-Fan", category: "PC Accessories", price: 699, cost: 420, stock: 3, reorderLevel: 8, leadTimeDays: 4, supplierId: "sup-e1", image: "/uploads/Laptop Cooling Pad.jpg", profile: "low_stock", baseDailySales: 5 },
      { id: "e-prod-8", name: "HDMI Cable 1.5m High-Speed", category: "Cables & Power", price: 349, cost: 160, stock: 2, reorderLevel: 10, leadTimeDays: 3, supplierId: "sup-e1", image: "/uploads/HDMI Cable 1.5m.jpg", profile: "low_stock", baseDailySales: 4 },
      { id: "e-prod-9", name: "Smart Plug (Wi-Fi 16A)", category: "Smart Home", price: 799, cost: 490, stock: 4, reorderLevel: 12, leadTimeDays: 5, supplierId: "sup-e3", image: "/uploads/Smart Plug (Wi-Fi).jpg", profile: "low_stock", baseDailySales: 4 },
      // Dead stock (0 sales)
      { id: "e-prod-10", name: "Micro-USB to 30-Pin Apple Adapter", category: "Dead / Obsolete", price: 199, cost: 110, stock: 25, reorderLevel: 5, leadTimeDays: 10, supplierId: "sup-e1", image: "", profile: "dead", baseDailySales: 0 },
      { id: "e-prod-11", name: "VGA to DVI Analog Monitor Splitter", category: "Dead / Obsolete", price: 350, cost: 220, stock: 15, reorderLevel: 4, leadTimeDays: 12, supplierId: "sup-e1", image: "", profile: "dead", baseDailySales: 0 },
      { id: "e-prod-12", name: "Mini-CD 8cm Rewritable Discs (5pk)", category: "Dead / Obsolete", price: 240, cost: 150, stock: 20, reorderLevel: 3, leadTimeDays: 15, supplierId: "sup-e1", image: "", profile: "dead", baseDailySales: 0 },
    ];

    const insertProduct = db.prepare(`
      INSERT INTO Product (id, name, price, cost, stock, reorderLevel, leadTimeDays, category, image, businessId, supplierId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of kiranaProducts) {
      insertProduct.run(p.id, p.name, p.price, p.cost, p.stock, p.reorderLevel, p.leadTimeDays, p.category, p.image, "demo-kirana-indore", p.supplierId);
    }
    for (const p of electronicsProducts) {
      insertProduct.run(p.id, p.name, p.price, p.cost, p.stock, p.reorderLevel, p.leadTimeDays, p.category, p.image, "demo-electronics-indore", p.supplierId);
    }

    // 7. Generate 90 Days of Realistic Daily Sales per Product with Weekday Seasonality
    const insertSale = db.prepare(`
      INSERT INTO SalesHistory (id, productId, businessId, date, quantity, revenue, channel)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Weekday multipliers: Sunday (0) to Saturday (6)
    // Weekend surge in retail footfalls in Indore
    const weekdayMultipliers = [
      1.55, // Sunday
      1.10, // Monday
      0.85, // Tuesday
      0.90, // Wednesday
      0.95, // Thursday
      1.25, // Friday
      1.60, // Saturday
    ];

    const today = new Date();
    let totalSalesRecords = 0;

    const seedSalesForProducts = (products: ProductDef[], businessId: string) => {
      // Deterministic PRNG seed offset so sales look natural but consistent
      let seedCounter = 42;
      const pseudoRandom = () => {
        seedCounter = (seedCounter * 16807) % 2147483647;
        return (seedCounter - 1) / 2147483646;
      };

      for (let dayOffset = 89; dayOffset >= 0; dayOffset--) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() - dayOffset);
        const dateStr = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD
        const dayOfWeek = currentDate.getDay(); // 0 - 6
        const dayMultiplier = weekdayMultipliers[dayOfWeek];

        for (const prod of products) {
          if (prod.profile === "dead") {
            // Dead stock: exactly 0 sales across all 90 days
            insertSale.run(randomUUID(), prod.id, businessId, dateStr, 0, 0, "pos");
            totalSalesRecords++;
            continue;
          }

          // Random variation around the base daily sales
          const noise = 0.85 + pseudoRandom() * 0.3; // 0.85 - 1.15
          let qty = Math.round(prod.baseDailySales * dayMultiplier * noise);
          if (qty < 1 && prod.baseDailySales > 0) qty = 1;

          const revenue = Math.round(qty * prod.price);
          const channel = pseudoRandom() > 0.7 ? "online" : "pos";

          insertSale.run(randomUUID(), prod.id, businessId, dateStr, qty, revenue, channel);
          totalSalesRecords++;
        }
      }
    };

    seedSalesForProducts(kiranaProducts, "demo-kirana-indore");
    seedSalesForProducts(electronicsProducts, "demo-electronics-indore");

    // 8. Seed Signals (Market, Weather, Supply Chain, Festivals)
    const insertSignal = db.prepare(`
      INSERT OR REPLACE INTO Signal (id, title, source, category, summary, impact, multiplier, affectedCategories, city, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSignal.run(
      "sig-heatwave-2026",
      "Severe Heatwave Alert Across Indore & Malwa (42°C+)",
      "IMD Weather Bulletin",
      "WeatherEvent",
      "Indore meteorological center issues yellow alert with temperatures projected to hover above 42°C. Local demand for cold beverages, hydration powders, and cooling electronics is surging.",
      "High",
      1.85,
      "Dairy & Beverages,PC Accessories",
      "Indore",
      1
    );

    insertSignal.run(
      "sig-lpg-disruption",
      "LPG Commercial Cylinder Price Spike & Distribution Delays",
      "National Energy Journal",
      "SupplyChain",
      "Global supply chain shocks cause 18% spike in commercial and domestic LPG cylinder refill delays in western MP. Households and local eateries are actively purchasing induction cooktops as backups.",
      "High",
      2.10,
      "Home Care,Cables & Power",
      "Indore",
      1
    );

    insertSignal.run(
      "sig-chhappan-festival",
      "Indore Chhappan Dukan Night Food Festival Weekend",
      "Indore Municipal Corporation",
      "LocalEvent",
      "Expected 80,000+ visitors to New Palasia / Chhappan Dukan food strip this weekend. Local convenience stores and kiranas experience peak beverage and snack run-rates.",
      "Medium",
      1.50,
      "Dairy & Beverages,Snacks & Packaged",
      "Indore",
      1
    );

    insertSignal.run(
      "sig-tech-diwali",
      "Festive Electronics & Mobile Upgrade Wave",
      "Retail Association of India",
      "Festival",
      "Pre-festive consumer tech sales spike across Jail Road and Silver Mall electronics corridors. Fast-charging accessories and wireless audio see 40% uptick.",
      "Medium",
      1.60,
      "Cables & Power,Audio & Wearables,Smart Home",
      "Indore",
      1
    );

    // 9. Seed Initial Strategic Recommendations
    const insertRec = db.prepare(`
      INSERT OR REPLACE INTO Recommendation (id, businessId, productId, signalId, type, title, action, reason, suggestedQty, suggestedPrice, urgency, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Kirana Recommendations
    insertRec.run(
      "rec-k1",
      "demo-kirana-indore",
      "k-prod-8",
      "sig-heatwave-2026",
      "STOCK_UP",
      "Urgent Restock: ORS Electrolyte Drink",
      "Place purchase order for 60 units with Indore FMCG Dist.",
      "Extreme heatwave warning in Indore (42°C+). Current inventory has dropped to 3 units vs reorder threshold of 20.",
      60,
      35,
      "High",
      "pending"
    );

    insertRec.run(
      "rec-k2",
      "demo-kirana-indore",
      "k-prod-7",
      "sig-chhappan-festival",
      "STOCK_UP",
      "Restock Cold Drinks (Coke 2L) for Weekend Rush",
      "Order 48 units immediately before Friday afternoon delivery cut-off.",
      "High summer temperatures combined with Chhappan Dukan festival footfall. Stock is at 4 units and will stock out within 24 hours.",
      48,
      95,
      "High",
      "pending"
    );

    insertRec.run(
      "rec-k3",
      "demo-kirana-indore",
      "k-prod-9",
      "sig-lpg-disruption",
      "STOCK_UP",
      "Capitalize on LPG Shortage with Induction Cooktops",
      "Order 8 Induction Cooktop units from Malwa distributor.",
      "LPG supply disruption has driven 2.1x surge in induction interest. Store has only 2 units left in stock.",
      8,
      1599,
      "High",
      "pending"
    );

    insertRec.run(
      "rec-k4",
      "demo-kirana-indore",
      "k-prod-11",
      null,
      "REMOVE",
      "De-list Dead Stock: Canned Asparagus",
      "Discount 50% for clearance or write off and remove from shelf.",
      "Zero sales over the past 90 days. Frees up shelf space for fast-moving summer hydration items.",
      null,
      225,
      "Medium",
      "pending"
    );

    // Electronics Recommendations
    insertRec.run(
      "rec-e1",
      "demo-electronics-indore",
      "e-prod-7",
      "sig-heatwave-2026",
      "STOCK_UP",
      "Emergency Restock: Laptop Cooling Pads",
      "Order 25 dual-fan aluminum cooling pads from MP Gadgets Hub.",
      "Ambient heat in Indore causing widespread laptop throttling. Current inventory is critically low at 3 units.",
      25,
      699,
      "High",
      "pending"
    );

    insertRec.run(
      "rec-e2",
      "demo-electronics-indore",
      "e-prod-8",
      null,
      "STOCK_UP",
      "Restock High-Speed HDMI Cables",
      "Order 20 units from MP Gadgets Hub.",
      "Only 2 units remaining against reorder level of 10. Lead time is 3 days.",
      20,
      349,
      "High",
      "pending"
    );

    insertRec.run(
      "rec-e3",
      "demo-electronics-indore",
      "e-prod-10",
      null,
      "REMOVE",
      "Scrap Obsolete 30-Pin Apple Adapters",
      "Remove 25 units of obsolete dead stock from physical display and inventory catalog.",
      "0 sales in past 90 consecutive days. Connector format is obsolete for modern devices.",
      null,
      null,
      "Medium",
      "pending"
    );

    db.exec("PRAGMA foreign_keys = ON");

    return {
      success: true,
      message: "Successfully seeded 90 days of sales history, suppliers, products, signals, and recommendations for 2 Indore businesses.",
      businesses: [
        { id: "demo-kirana-indore", name: "Apna Indore Kirana & Superstore", type: "grocery", productCount: kiranaProducts.length, salesDays: 90 },
        { id: "demo-electronics-indore", name: "Indore Tech & Gadgets Hub", type: "electronics", productCount: electronicsProducts.length, salesDays: 90 },
      ],
      suppliersCount: 6,
      signalsCount: 4,
      recommendationsCount: 7,
      totalSalesRecords,
    };
  } finally {
    db.close();
  }
}
