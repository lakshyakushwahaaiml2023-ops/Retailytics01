import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

function getDB() {
  return new Database(path.join(process.cwd(), "dev.db"));
}

export async function GET(req: NextRequest) {
  const bizId = req.nextUrl.searchParams.get("bizId");
  const db = getDB();

  try {
    db.exec(`CREATE TABLE IF NOT EXISTS CustomerMessage (
      id TEXT PRIMARY KEY, orderId TEXT, customerName TEXT,
      customerPhone TEXT, message TEXT, status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now'))
    )`);

    // If no bizId, return all — useful for debugging
    const messages = bizId
      ? db.prepare(`
          SELECT cm.*, o.status as orderStatus, b.name as shopName
          FROM CustomerMessage cm
          JOIN [Order] o ON o.id = cm.orderId
          JOIN Business b ON b.id = o.businessId
          WHERE o.businessId = ?
          ORDER BY cm.createdAt DESC
          LIMIT 20
        `).all(bizId) as any[]
      : db.prepare(`
          SELECT cm.*, o.status as orderStatus, b.name as shopName
          FROM CustomerMessage cm
          JOIN [Order] o ON o.id = cm.orderId
          JOIN Business b ON b.id = o.businessId
          ORDER BY cm.createdAt DESC
          LIMIT 20
        `).all() as any[];

    db.close();
    return NextResponse.json(messages);
  } catch (e: any) {
    db.close();
    console.error("customer-messages error:", e.message);
    return NextResponse.json([]);
  }
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json();
  const db = getDB();
  db.prepare("UPDATE CustomerMessage SET status = 'sent' WHERE id = ?").run(id);
  db.close();
  return NextResponse.json({ success: true });
}