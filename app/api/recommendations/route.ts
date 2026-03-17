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

  const business = db.prepare("SELECT * FROM Business WHERE id = ?").get(bizId) as any;
  if (!business) { db.close(); return NextResponse.json({ error: "Business not found" }, { status: 404 }); }

  const products = db.prepare("SELECT name, price, stock FROM Product WHERE businessId = ?").all(bizId) as any[];

  const topSelling = db.prepare(`
    SELECT p.name, SUM(oi.quantity) as totalSold
    FROM OrderItem oi
    JOIN Product p ON p.id = oi.productId
    JOIN [Order] o ON o.id = oi.orderId
    WHERE o.businessId = ? AND o.status != 'cancelled'
    GROUP BY p.id ORDER BY totalSold DESC LIMIT 5
  `).all(bizId) as any[];

  let offlineTop: any[] = [];
  try {
    offlineTop = db.prepare(`
      SELECT productName, SUM(quantity) as totalSold
      FROM OfflineSale WHERE businessId = ?
      GROUP BY productName ORDER BY totalSold DESC LIMIT 5
    `).all(bizId) as any[];
  } catch {}

  db.close();

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const month = new Date().getMonth() + 1;
  const season =
    month >= 3 && month <= 5 ? "Summer — extreme heat in MP, high demand for cold drinks, ORS, cooling items" :
    month >= 6 && month <= 9 ? "Monsoon — rain, mosquitoes, flooding, demand for repellents and rain gear" :
    month >= 10 && month <= 11 ? "Festive season — Diwali/Navratri, gifting, sweets, decorations" :
    "Winter — cold nights in MP, demand for warm items and health supplements";

  const prompt = `You are an expert retail advisor for Indian local shops. Give stock recommendations based on current real-world context.

BUSINESS: ${business.name} (${business.type} shop)
LOCATION: ${business.locality}, ${business.city}, Madhya Pradesh, India
AREA: ${business.areaType}, customers aged ${business.customerAgeRange}
TODAY: ${today}
SEASON: ${season}

CURRENT STOCK:
${products.slice(0, 15).map((p: any) => `- ${p.name}: ₹${p.price}, stock: ${p.stock}`).join("\n")}

TOP SELLERS (online): ${topSelling.map((p: any) => `${p.name} (${p.totalSold} units)`).join(", ") || "No data yet"}
TOP SELLERS (offline): ${offlineTop.map((p: any) => `${p.productName} (${p.totalSold} units)`).join(", ") || "No data yet"}

CURRENT WORLD CONTEXT (March 2026):
- Middle East tensions affecting global oil and LPG supply chains
- LPG prices volatile in India — electric induction cooktops demand rising sharply
- Summer approaching in central India — temperatures crossing 38°C in MP
- Indian rupee under pressure — imported goods getting costlier
- Post-budget consumer spending patterns shifting toward value products
- Rural MP spending picking up — local festivals and harvest season

Based on ALL of the above — season, world events, customer behaviour, current stock — suggest exactly 5 products this shop should stock or restock THIS WEEK.

Respond ONLY as a valid JSON array, no markdown:
[
  {
    "product": "specific product name",
    "reason": "3 sentences connecting world events + season + local demand to this product",
    "urgency": "High",
    "category": "category name",
    "trend": "rising"
  }
]

urgency must be exactly "High", "Medium", or "Low"
trend must be exactly "rising", "stable", or "new_opportunity"`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.4,
    });

    const raw = response.choices[0].message.content || "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return NextResponse.json({ recommendations, businessName: business.name });
  } catch (err: any) {
    console.error("Recommendations error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
