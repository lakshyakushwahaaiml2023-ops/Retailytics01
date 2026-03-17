import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import Database from "better-sqlite3";
import path from "path";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function getDB() {
  return new Database(path.join(process.cwd(), "dev.db"));
}

function getBusinessContext(bizId: string, page: string) {
  const db = getDB();

  const biz = db.prepare("SELECT * FROM Business WHERE id = ?").get(bizId) as any;
  if (!biz) { db.close(); return null; }

  const products = db.prepare(
    "SELECT name, price, stock, COALESCE(image,'') as image FROM Product WHERE businessId = ? ORDER BY stock ASC"
  ).all(bizId) as any[];

  const orderStats = db.prepare(`
    SELECT
      COUNT(DISTINCT o.id) as totalOrders,
      SUM(oi.quantity * p.price) as revenue,
      COUNT(DISTINCT CASE WHEN o.status='delivered' THEN o.id END) as delivered,
      COUNT(DISTINCT CASE WHEN o.status='cancelled' THEN o.id END) as cancelled,
      COUNT(DISTINCT CASE WHEN o.status='pending' THEN o.id END) as pending
    FROM [Order] o
    JOIN OrderItem oi ON oi.orderId = o.id
    JOIN Product p ON p.id = oi.productId
    WHERE o.businessId = ?
  `).get(bizId) as any;

  const topSelling = db.prepare(`
    SELECT p.name, SUM(oi.quantity) as qty, SUM(oi.quantity * p.price) as revenue
    FROM OrderItem oi
    JOIN Product p ON p.id = oi.productId
    JOIN [Order] o ON o.id = oi.orderId
    WHERE o.businessId = ? AND o.status != 'cancelled'
    GROUP BY p.id ORDER BY qty DESC LIMIT 8
  `).all(bizId) as any[];

  const recentOrders = db.prepare(`
    SELECT o.id, o.customerName, o.status, o.createdAt
    FROM [Order] o WHERE o.businessId = ?
    ORDER BY o.rowid DESC LIMIT 5
  `).all(bizId) as any[];

  let offlineStats: any = {};
  let offlineTop: any[] = [];
  try {
    offlineStats = db.prepare(`
      SELECT COUNT(*) as sales, SUM(total) as revenue, SUM(quantity) as items
      FROM OfflineSale WHERE businessId = ?
    `).get(bizId) as any;
    offlineTop = db.prepare(`
      SELECT productName, SUM(quantity) as qty, SUM(total) as revenue
      FROM OfflineSale WHERE businessId = ?
      GROUP BY productName ORDER BY qty DESC LIMIT 8
    `).all(bizId) as any[];
  } catch {}

  db.close();

  const lowStock = products.filter((p: any) => p.stock <= 5);
  const outOfStock = products.filter((p: any) => p.stock === 0);

  const month = new Date().getMonth() + 1;
  const season =
    month >= 3 && month <= 5 ? "Summer (March-May) — extreme heat in MP, 40°C+ temperatures" :
    month >= 6 && month <= 9 ? "Monsoon (June-September) — heavy rains in MP" :
    month >= 10 && month <= 11 ? "Festive Season (Oct-Nov) — Diwali, Navratri" :
    "Winter (Dec-Feb) — cold nights in MP";

  return {
    biz, products, orderStats, topSelling, recentOrders,
    offlineStats, offlineTop, lowStock, outOfStock, season,
  };
}

function buildSystemPrompt(page: string, ctx: any) {
  const { biz, products, orderStats, topSelling, offlineStats, offlineTop, lowStock, outOfStock, season, recentOrders } = ctx;

  const base = `You are an intelligent AI business advisor embedded inside a shop management app called Retailytics.
You are talking directly to the shop owner. Be concise, specific, and actionable.
Use bullet points for lists. Keep answers under 200 words unless asked for detail.
Always refer to their actual data — never give generic advice.

SHOP: ${biz.name} (${biz.type})
LOCATION: ${biz.locality}, ${biz.city}, MP, India
CUSTOMERS: Aged ${biz.customerAgeRange}, ${biz.areaType} area
SEASON: ${season}
CURRENT WORLD CONTEXT: Middle East tensions affecting LPG supply, summer approaching in MP, post-budget India 2026

INVENTORY SUMMARY:
- Total products: ${products.length}
- Low stock (≤5): ${lowStock.map((p: any) => p.name).join(", ") || "None"}
- Out of stock: ${outOfStock.map((p: any) => p.name).join(", ") || "None"}

ONLINE SALES:
- Total orders: ${orderStats?.totalOrders || 0} | Revenue: ₹${Math.round(orderStats?.revenue || 0).toLocaleString("en-IN")}
- Delivered: ${orderStats?.delivered || 0} | Cancelled: ${orderStats?.cancelled || 0} | Pending: ${orderStats?.pending || 0}
- Top sellers: ${topSelling.slice(0, 5).map((p: any) => `${p.name} (${p.qty} units)`).join(", ") || "No data"}

OFFLINE SALES:
- Recorded sales: ${offlineStats?.sales || 0} | Revenue: ₹${Math.round(offlineStats?.revenue || 0).toLocaleString("en-IN")}
- Top offline: ${offlineTop.slice(0, 5).map((p: any) => `${p.productName} (${p.qty} units)`).join(", ") || "No data"}`;

  const pageContext: Record<string, string> = {
    catalog: `\nCURRENT PAGE: Product Catalog
You can suggest which products to ADD (new items that would sell well given the season/events),
which to REMOVE (slow movers, expired relevance), and pricing adjustments.
Full product list: ${products.map((p: any) => `${p.name} ₹${p.price} (${p.stock} left)`).join(", ")}`,

    dashboard: `\nCURRENT PAGE: Owner Dashboard
You can see all metrics. Help the owner understand what's happening with their business today.
Recent orders: ${recentOrders.map((o: any) => `${o.customerName} — ${o.status}`).join(", ")}`,

    analytics: `\nCURRENT PAGE: Analytics
Help interpret sales patterns, revenue trends, and give growth advice.`,

    "offline-sales": `\nCURRENT PAGE: Offline Sales Recorder
Help the owner understand their offline sales patterns and compare with online.
Offline top products: ${offlineTop.map((p: any) => `${p.productName}: ${p.qty} units, ₹${Math.round(p.revenue)}`).join(", ") || "No offline data yet"}`,

    orders: `\nCURRENT PAGE: Order Management
Help manage and prioritize orders. Identify patterns in cancellations or delays.`,
  };

  return base + (pageContext[page] || "");
}

export async function POST(req: NextRequest) {
  const { bizId, page, question, pageData, history } = await req.json();

  if (!question?.trim()) return NextResponse.json({ error: "No question" }, { status: 400 });

  const ctx = getBusinessContext(bizId, page);
  if (!ctx) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const systemPrompt = buildSystemPrompt(page, ctx);

  // Build conversation history
  const conversationMessages = [
    ...(history || []).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: question },
  ];

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
      ],
      max_tokens: 600,
      temperature: 0.5,
    });

    const answer = response.choices[0].message.content || "I couldn't generate a response.";
    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error("AI Agent error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
