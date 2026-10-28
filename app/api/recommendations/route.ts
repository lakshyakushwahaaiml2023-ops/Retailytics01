import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import Database from "better-sqlite3";
import path from "path";
import {
  runInventoryAnalysis,
  DailySaleRecord,
  ProductInput,
} from "@/lib/analytics/inventoryEngine";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function getDB() {
  return new Database(path.join(process.cwd(), "dev.db"));
}

export async function GET(req: NextRequest) {
  const bizId = req.nextUrl.searchParams.get("bizId") || "demo-kirana-indore";
  const db = getDB();

  const business = db.prepare("SELECT * FROM Business WHERE id = ?").get(bizId) as any;
  if (!business) {
    db.close();
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // 1. Fetch products
  const rawProducts = db.prepare(`
    SELECT p.id, p.name, p.category, p.price, p.cost, p.stock,
           p.reorderLevel, p.leadTimeDays, p.supplierId,
           s.name as supplierName, s.leadTimeDays as supplierLeadTime
    FROM Product p
    LEFT JOIN Supplier s ON s.id = p.supplierId
    WHERE p.businessId = ?
    ORDER BY p.name
  `).all(bizId) as any[];

  // 2. Fetch sales history
  const salesRows = db.prepare(`
    SELECT productId, date, quantity, revenue
    FROM SalesHistory
    WHERE businessId = ?
    ORDER BY date ASC
  `).all(bizId) as { productId: string; date: string; quantity: number; revenue: number }[];

  db.close();

  // If no products exist
  if (!rawProducts || rawProducts.length === 0) {
    return NextResponse.json({
      recommendations: [],
      businessName: business.name,
    });
  }

  // 3. Map sales by product
  const salesByProduct = new Map<string, DailySaleRecord[]>();
  for (const row of salesRows) {
    if (!salesByProduct.has(row.productId)) {
      salesByProduct.set(row.productId, []);
    }
    salesByProduct.get(row.productId)!.push({
      date: row.date,
      quantity: row.quantity,
      revenue: row.revenue,
    });
  }

  const products: ProductInput[] = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category || "General",
    price: Number(p.price),
    cost: Number(p.cost) || Number((p.price * 0.75).toFixed(2)),
    stock: Number(p.stock),
    reorderLevel: Number(p.reorderLevel) || 10,
    leadTimeDays: Number(p.leadTimeDays) || Number(p.supplierLeadTime) || 3,
    supplierId: p.supplierId,
    supplierName: p.supplierName,
  }));

  // 4. Compute real analytics metrics
  const analysis = runInventoryAnalysis(bizId, products, salesByProduct, 25000);

  // If we have active computed metrics, build recommendations directly citing the numbers
  const criticalItems = analysis.metrics
    .filter((m) => m.needsRestock || m.isDeadStock)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // Format LLM prompt with real numbers
  const prompt = `You are an expert retail inventory strategist for an Indian shop.
Generate stock recommendations citing the EXACT COMPUTED METRICS provided below.

BUSINESS: ${business.name} (${business.type} shop in ${business.locality}, ${business.city}, India)

COMPUTED METRIC EVIDENCE:
${criticalItems
  .slice(0, 8)
  .map(
    (m) =>
      `- ${m.name} (${m.category}): Stock=${m.stock}, Velocity7d=${m.velocity7d}/day, Velocity30d=${m.velocity30d}/day, DaysLeft=${m.daysOfStockLeft}d, ReorderPoint=${m.reorderPoint}, ABC=${m.abcClass}, DeadStock=${m.isDeadStock}`
  )
  .join("\n")}

YOUR TASK:
Provide exactly 5 strategic recommendations.
Every recommendation MUST cite the exact numbers (e.g. "Velocity of ${criticalItems[0]?.velocity7d || 10} units/day with only ${criticalItems[0]?.daysOfStockLeft || 2} days of stock remaining...").
For dead stock items, recommend clearance discounts or bundles citing 0 sales in 90 days.

Respond ONLY as a valid JSON array matching this format:
[
  {
    "product": "exact product name",
    "reason": "specific explanation citing velocity, days of stock left, or reorder point",
    "urgency": "High" | "Medium" | "Low",
    "category": "category name",
    "trend": "rising" | "stable" | "new_opportunity"
  }
]`;

  try {
    if (process.env.GROQ_API_KEY) {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1200,
        temperature: 0.2,
      });

      const raw = response.choices[0]?.message?.content || "[]";
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const recommendations = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          recommendations,
          businessName: business.name,
          analyticsSummary: {
            totalSKUs: analysis.totalSKUs,
            budgetSpent: analysis.budgetSpent,
            healthyCount: analysis.stockHealth.healthyCount,
            lowStockCount: analysis.stockHealth.lowStockCount,
            deadStockCount: analysis.stockHealth.deadStockCount,
          },
        });
      }
    }
  } catch (err: any) {
    console.warn("Groq recommendations error, falling back to deterministic:", err.message);
  }

  // Fallback: Deterministic recommendations constructed directly from computed numbers
  const fallbackRecs = criticalItems.slice(0, 5).map((m) => {
    let urgency: "High" | "Medium" | "Low" = "Medium";
    let trend: "rising" | "stable" | "new_opportunity" = "stable";
    let reason = "";

    if (m.isDeadStock) {
      urgency = "Low";
      trend = "stable";
      reason = `Zero sales recorded over 90 days. Holding ${m.stock} units with ₹${Math.round(m.stock * m.cost)} tied up. Liquidate via flash clearance or bundling.`;
    } else {
      if (m.daysOfStockLeft <= m.leadTimeDays) urgency = "High";
      else if (m.daysOfStockLeft <= m.leadTimeDays * 2) urgency = "Medium";
      else urgency = "Low";

      if (m.trendDirection === "accelerating") trend = "rising";

      reason = `Velocity is ${m.velocity7d} units/day with only ${m.daysOfStockLeft} days of inventory remaining. Reorder point is ${m.reorderPoint} units (Safety stock: ${m.safetyStock}). Recommended restock: ${m.suggestedRestockQty} units.`;
    }

    return {
      product: m.name,
      reason,
      urgency,
      category: m.category,
      trend,
    };
  });

  return NextResponse.json({
    recommendations: fallbackRecs,
    businessName: business.name,
    analyticsSummary: {
      totalSKUs: analysis.totalSKUs,
      budgetSpent: analysis.budgetSpent,
      healthyCount: analysis.stockHealth.healthyCount,
      lowStockCount: analysis.stockHealth.lowStockCount,
      deadStockCount: analysis.stockHealth.deadStockCount,
    },
  });
}
