import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

function getDB() {
  return new Database(path.join(process.cwd(), "dev.db"));
}

export async function GET(req: NextRequest) {
  const bizId = req.nextUrl.searchParams.get("bizId");
  const db = getDB();

  // Orders pending for more than 1 minute, not yet notified
  const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();

  let staleOrders: any[] = [];
  try {
    const query = bizId
      ? `SELECT o.id, o.customerName, o.address, o.phone, o.status,
               o.businessId, o.createdAt, o.notified,
               b.name as shopName, b.operatingHours, b.phone as ownerPhone,
               GROUP_CONCAT(p.name || ' x' || oi.quantity, ', ') as itemsSummary,
               ROUND(SUM(oi.quantity * p.price), 0) as total
         FROM [Order] o
         JOIN Business b ON b.id = o.businessId
         JOIN OrderItem oi ON oi.orderId = o.id
         JOIN Product p ON p.id = oi.productId
         WHERE o.status = 'pending' AND o.notified = 0
           AND o.createdAt IS NOT NULL AND o.createdAt <= ?
           AND o.businessId = ?
         GROUP BY o.id`
      : `SELECT o.id, o.customerName, o.address, o.phone, o.status,
               o.businessId, o.createdAt, o.notified,
               b.name as shopName, b.operatingHours, b.phone as ownerPhone,
               GROUP_CONCAT(p.name || ' x' || oi.quantity, ', ') as itemsSummary,
               ROUND(SUM(oi.quantity * p.price), 0) as total
         FROM [Order] o
         JOIN Business b ON b.id = o.businessId
         JOIN OrderItem oi ON oi.orderId = o.id
         JOIN Product p ON p.id = oi.productId
         WHERE o.status = 'pending' AND o.notified = 0
           AND o.createdAt IS NOT NULL AND o.createdAt <= ?
         GROUP BY o.id`;

    staleOrders = bizId
      ? db.prepare(query).all(oneMinuteAgo, bizId) as any[]
      : db.prepare(query).all(oneMinuteAgo) as any[];
  } catch (e) {
    console.error("check-orders error:", e);
    staleOrders = [];
  }

  db.close();
  return NextResponse.json({ staleOrders });
}

export async function POST(req: NextRequest) {
  const { orderId } = await req.json();
  const db = getDB();
  try {
    db.prepare("UPDATE [Order] SET notified = 1 WHERE id = ?").run(orderId);
  } catch (e) {
    try {
      db.exec("ALTER TABLE [Order] ADD COLUMN notified INTEGER DEFAULT 0");
      db.prepare("UPDATE [Order] SET notified = 1 WHERE id = ?").run(orderId);
    } catch {}
  }
  db.close();
  return NextResponse.json({ success: true });
}
