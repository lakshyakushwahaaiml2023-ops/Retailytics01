import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import Database from "better-sqlite3";
import path from "path";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function getDB() {
  return new Database(path.join(process.cwd(), "dev.db"));
}

export async function GET(req: NextRequest) {
  const bizId = req.nextUrl.searchParams.get("bizId") || "demo-biz";
  const db = getDB();

  // Get business profile
  const biz = db.prepare("SELECT * FROM Business WHERE id = ?").get(bizId) as any;
  if (!biz) { db.close(); return NextResponse.json({ error: "Business not found" }, { status: 404 }); }

  // Get products
  const products = db.prepare(
    "SELECT name, price, stock FROM Product WHERE businessId = ? ORDER BY stock ASC"
  ).all(bizId) as any[];

  // Get online order stats
  const orderStats = db.prepare(`
    SELECT
      COUNT(DISTINCT o.id) as totalOrders,
      SUM(oi.quantity * p.price) as onlineRevenue,
      COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) as delivered,
      COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END) as cancelled
    FROM [Order] o
    JOIN OrderItem oi ON oi.orderId = o.id
    JOIN Product p ON p.id = oi.productId
    WHERE o.businessId = ?
  `).get(bizId) as any;

  // Top selling products online
  const topOnline = db.prepare(`
    SELECT p.name, SUM(oi.quantity) as qty
    FROM OrderItem oi
    JOIN Product p ON p.id = oi.productId
    JOIN [Order] o ON o.id = oi.orderId
    WHERE o.businessId = ? AND o.status != 'cancelled'
    GROUP BY p.id ORDER BY qty DESC LIMIT 5
  `).all(bizId) as any[];

  // Offline sales stats
  let offlineStats: any = { totalSales: 0, totalRevenue: 0 };
  let topOffline: any[] = [];
  try {
    offlineStats = db.prepare(`
      SELECT COUNT(*) as totalSales, SUM(total) as totalRevenue, SUM(quantity) as totalItems
      FROM OfflineSale WHERE businessId = ?
    `).get(bizId) as any;
    topOffline = db.prepare(`
      SELECT productName, SUM(quantity) as qty, SUM(total) as revenue
      FROM OfflineSale WHERE businessId = ?
      GROUP BY productName ORDER BY qty DESC LIMIT 5
    `).all(bizId) as any[];
  } catch {}

  // Low stock items
  const lowStock = products.filter(p => p.stock <= 5);

  db.close();

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const prompt = `You are a strategic business advisor for a local Indian shop.

BUSINESS PROFILE:
  - Name: ${biz.name}
  - Type: ${biz.type} shop
  - Location: ${biz.locality}, ${biz.city}, India
  - Area: ${biz.areaType}
  - Typical customers: aged ${biz.customerAgeRange}
  - Delivery radius: ${biz.deliveryRadius} km
  - Operating hours: ${biz.operatingHours}
  - Today: ${today}

CURRENT INVENTORY (${products.length} products):
${products.slice(0, 15).map(p => `- ${p.name}: ₹${p.price}, stock: ${p.stock}`).join("\n")}
${lowStock.length > 0 ? `\nLOW STOCK ALERT: ${lowStock.map(p => p.name).join(", ")}` : ""}

ONLINE SALES DATA:
  - Total online orders: ${orderStats?.totalOrders || 0}
  - Online revenue: ₹${Math.round(orderStats?.onlineRevenue || 0)}
  - Delivered: ${orderStats?.delivered || 0}, Cancelled: ${orderStats?.cancelled || 0}
  - Top online sellers: ${topOnline.map(p => `${p.name} (${p.qty} units)`).join(", ") || "No data yet"}

OFFLINE SALES DATA:
  - Total offline sales recorded: ${offlineStats?.totalSales || 0}
  - Offline revenue: ₹${Math.round(offlineStats?.totalRevenue || 0)}
  - Top offline sellers: ${topOffline.map(p => `${p.productName} (${p.qty} units)`).join(", ") || "No data yet"}

YOUR TASK:
1. Search the web for: current news India affecting ${biz.type} retail, seasonal trends India ${new Date().toLocaleString("en-IN", { month: "long" })}, commodity prices India, consumer trends ${biz.city}
2. Analyse all the above data holistically
3. Give 6 specific, actionable strategic recommendations

Each recommendation must be one of these types:
- STOCK_UP: Add or restock a specific product
- REMOVE: Remove a slow/irrelevant product  
- PRICING: Adjust pricing strategy
- MARKETING: Local marketing opportunity
- EXPANSION: New product category to enter
- ALERT: Urgent issue needing immediate attention

Respond ONLY as valid JSON array, no markdown:
[
  {
    "type": "STOCK_UP" | "REMOVE" | "PRICING" | "MARKETING" | "EXPANSION" | "ALERT",
    "title": "short action title",
    "insight": "2-3 sentences connecting real data + world events to this recommendation",
    "action": "specific thing to do right now",
    "impact": "High" | "Medium" | "Low",
    "source": "online_data" | "offline_data" | "market_news" | "seasonal" | "inventory"
  }
]`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.3,
    });

    const raw = response.choices[0].message.content || "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return NextResponse.json({
      recommendations,
      businessName: biz.name,
      dataSnapshot: {
        totalOrders: orderStats?.totalOrders || 0,
        onlineRevenue: Math.round(orderStats?.onlineRevenue || 0),
        offlineSales: offlineStats?.totalSales || 0,
        offlineRevenue: Math.round(offlineStats?.totalRevenue || 0),
        lowStockCount: lowStock.length,
        productCount: products.length,
      }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
