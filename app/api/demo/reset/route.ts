import { NextRequest, NextResponse } from "next/server";
import { seedWorkforceData } from "@/lib/seedData";
import Database from "better-sqlite3";
import path from "path";

type ResetBody = {
  resetAll?: boolean;
};

type CountRow = {
  count: number;
  revenue?: number;
};

export async function POST(req: NextRequest) {
  try {
    let body: ResetBody = {};
    try {
      body = (await req.json()) as ResetBody;
    } catch {
      // Body is optional
    }

    const resetAll = body?.resetAll !== false; // default true
    console.log(`🔄 Triggering demo reset (resetAll=${resetAll})...`);

    const result = await seedWorkforceData(resetAll);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to reset demo data";
    console.error("Demo reset error:", err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const dbPath = path.resolve(process.cwd(), "dev.db");
    const db = new Database(dbPath);

    const businesses = db.prepare(`
      SELECT b.id, b.name, b.type, b.city, b.locality,
             (SELECT COUNT(*) FROM Product WHERE businessId = b.id) as productCount,
             (SELECT COUNT(*) FROM SalesHistory WHERE businessId = b.id) as salesRecordCount,
             (SELECT COUNT(*) FROM Supplier WHERE businessId = b.id) as supplierCount,
             (SELECT COUNT(*) FROM Recommendation WHERE businessId = b.id) as recommendationCount
      FROM Business b
      WHERE b.id IN ('demo-kirana-indore', 'demo-electronics-indore')
         OR b.id LIKE 'demo-%'
      ORDER BY b.name
    `).all();

    const signalRow = db.prepare("SELECT COUNT(*) as count FROM Signal").get() as CountRow | undefined;
    const salesRow = db.prepare("SELECT COUNT(*) as count, SUM(revenue) as revenue FROM SalesHistory").get() as CountRow | undefined;

    db.close();

    return NextResponse.json({
      status: "ready",
      demoBusinesses: businesses,
      totalSignals: signalRow?.count || 0,
      totalSalesHistoryRecords: salesRow?.count || 0,
      totalHistoricalRevenue: Math.round(salesRow?.revenue || 0),
      instructions: "Send POST /api/demo/reset to reseed 90 days of sales history, suppliers, signals, and recommendations.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch demo state";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
