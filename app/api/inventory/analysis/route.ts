import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import {
  runInventoryAnalysis,
  DailySaleRecord,
  ProductInput,
} from "@/lib/analytics/inventoryEngine";
import { runInventoryAnalystAgent } from "@/lib/agents/InventoryAnalyst";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const businessId = searchParams.get("businessId") || "demo-kirana-indore";
    const budgetParam = searchParams.get("budget");
    const budget = budgetParam ? Math.max(1000, Number(budgetParam)) : 25000;

    const dbPath = path.resolve(process.cwd(), "dev.db");
    const db = new Database(dbPath);

    // 1. Fetch business details
    const business = db.prepare("SELECT * FROM Business WHERE id = ?").get(businessId) as any;
    if (!business) {
      db.close();
      return NextResponse.json(
        { error: `Business with id '${businessId}' not found.` },
        { status: 404 }
      );
    }

    // 2. Fetch products joined with supplier
    const rawProducts = db.prepare(`
      SELECT p.id, p.name, p.category, p.price, p.cost, p.stock,
             p.reorderLevel, p.leadTimeDays, p.supplierId,
             s.name as supplierName, s.reliabilityScore, s.leadTimeDays as supplierLeadTime
      FROM Product p
      LEFT JOIN Supplier s ON s.id = p.supplierId
      WHERE p.businessId = ?
      ORDER BY p.name
    `).all(businessId) as any[];

    if (!rawProducts || rawProducts.length === 0) {
      db.close();
      return NextResponse.json(
        { error: `No products found for business '${businessId}'. Run POST /api/demo/reset first.` },
        { status: 404 }
      );
    }

    // 3. Fetch past 90 days sales history
    const salesRows = db.prepare(`
      SELECT productId, date, quantity, revenue
      FROM SalesHistory
      WHERE businessId = ?
      ORDER BY date ASC
    `).all(businessId) as { productId: string; date: string; quantity: number; revenue: number }[];

    db.close();

    // Map sales by product
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

    // Format products
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

    // 4. Run core mathematical analytics engine
    const analysis = runInventoryAnalysis(businessId, products, salesByProduct, budget);

    // 5. Run InventoryAnalyst agent (Zod validated, retry once, budget enforced)
    const agentOutput = await runInventoryAnalystAgent(analysis);

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        type: business.type,
        city: business.city,
        locality: business.locality,
      },
      budgetGiven: budget,
      analytics: {
        totalSKUs: analysis.totalSKUs,
        stockHealth: analysis.stockHealth,
        abcBreakdown: analysis.abcBreakdown,
        budgetSpent: analysis.budgetSpent,
        budgetRemaining: analysis.budgetRemaining,
        metrics: analysis.metrics,
        deterministicPlan: analysis.restockPlan,
        deadStockList: analysis.deadStockList,
      },
      agentAnalysis: agentOutput,
    });
  } catch (err: any) {
    console.error("Inventory analysis route error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to analyze inventory" },
      { status: 500 }
    );
  }
}
