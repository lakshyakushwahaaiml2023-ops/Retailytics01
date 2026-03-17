import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET(req: NextRequest) {
  const bizId = req.nextUrl.searchParams.get("bizId") || "demo-biz";

  try {
    const db = new Database(path.join(process.cwd(), "dev.db"));

    // Ensure VoiceLog table exists
    db.exec(`CREATE TABLE IF NOT EXISTS VoiceLog (
      id TEXT PRIMARY KEY,
      orderId TEXT,
      intent TEXT,
      transcript TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )`);

    const logs = db.prepare(`
      SELECT vl.id, vl.orderId, vl.intent, vl.transcript, vl.createdAt,
             o.customerName, o.status
      FROM VoiceLog vl
      JOIN [Order] o ON o.id = vl.orderId
      WHERE o.businessId = ?
      ORDER BY vl.createdAt DESC
      LIMIT 10
    `).all(bizId) as any[];

    db.close();
    return NextResponse.json(logs);
  } catch {
    return NextResponse.json([]);
  }
}
