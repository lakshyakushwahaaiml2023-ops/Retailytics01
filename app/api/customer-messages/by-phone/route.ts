import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone") || "";
  if (!phone) return NextResponse.json([]);

  const db = new Database(path.join(process.cwd(), "dev.db"));
  try {
    const messages = db.prepare(`
      SELECT cm.orderId, cm.message, cm.status, cm.createdAt,
             o.status as orderStatus
      FROM CustomerMessage cm
      JOIN [Order] o ON o.id = cm.orderId
      WHERE cm.customerPhone = ?
      ORDER BY cm.createdAt DESC
    `).all(phone) as any[];
    db.close();
    return NextResponse.json(messages);
  } catch {
    db.close();
    return NextResponse.json([]);
  }
}
