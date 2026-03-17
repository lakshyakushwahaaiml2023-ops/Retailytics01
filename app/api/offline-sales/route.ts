import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";

function getDB() {
  return new Database(path.join(process.cwd(), "dev.db"));
}

export async function GET(req: NextRequest) {
  const bizId = req.nextUrl.searchParams.get("bizId") || "demo-biz";
  const db = getDB();

  const sales = db.prepare(`
    SELECT * FROM OfflineSale
    WHERE businessId = ?
    ORDER BY createdAt DESC
    LIMIT 100
  `).all(bizId) as any[];

  // Summary stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as totalSales,
      SUM(total) as totalRevenue,
      SUM(quantity) as totalItems
    FROM OfflineSale
    WHERE businessId = ?
  `).get(bizId) as any;

  // Top offline products
  const topProducts = db.prepare(`
    SELECT productName,
           SUM(quantity) as totalQty,
           SUM(total) as totalRevenue
    FROM OfflineSale
    WHERE businessId = ?
    GROUP BY productName
    ORDER BY totalQty DESC
    LIMIT 5
  `).all(bizId) as any[];

  db.close();
  return NextResponse.json({ sales, stats, topProducts });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { businessId, productId, productName, quantity, price, note, soldAt } = body;

  if (!businessId || !productName || !quantity || !price) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = getDB();
  const id = randomUUID();
  const total = Number(quantity) * Number(price);

  db.prepare(`
    INSERT INTO OfflineSale (id, businessId, productId, productName, quantity, price, total, note, soldAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, businessId, productId || null, productName,
    Number(quantity), Number(price), total,
    note || "", soldAt || new Date().toISOString()
  );

  db.close();
  return NextResponse.json({ id, total });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const db = getDB();
  db.prepare("DELETE FROM OfflineSale WHERE id = ?").run(id);
  db.close();
  return NextResponse.json({ success: true });
}
