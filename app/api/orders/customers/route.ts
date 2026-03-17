import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET(req: NextRequest) {
  const name  = req.nextUrl.searchParams.get("name") || "";
  const phone = req.nextUrl.searchParams.get("phone") || "";

  if (!name && !phone) return NextResponse.json([]);

  const db = new Database(path.join(process.cwd(), "dev.db"));

  let orders: any[] = [];

  if (phone) {
    orders = db.prepare(`
      SELECT o.id, o.customerName, o.address, o.status,
             o.businessId, o.createdAt, o.phone,
             b.name as shopName
      FROM [Order] o
      JOIN Business b ON b.id = o.businessId
      WHERE o.phone = ?
      ORDER BY o.rowid DESC
    `).all(phone) as any[];
  }

  if (orders.length === 0 && name) {
    orders = db.prepare(`
      SELECT o.id, o.customerName, o.address, o.status,
             o.businessId, o.createdAt, o.phone,
             b.name as shopName
      FROM [Order] o
      JOIN Business b ON b.id = o.businessId
      WHERE LOWER(TRIM(o.customerName)) = LOWER(TRIM(?))
      ORDER BY o.rowid DESC
    `).all(name) as any[];
  }

  const result = orders.map((o: any) => {
    const items = db.prepare(`
      SELECT oi.quantity, p.name, p.price
      FROM OrderItem oi
      JOIN Product p ON p.id = oi.productId
      WHERE oi.orderId = ?
    `).all(o.id) as any[];
    return {
      ...o,
      items: items.map((i: any) => ({
        quantity: i.quantity,
        product: { name: i.name, price: i.price },
      })),
    };
  });

  db.close();
  return NextResponse.json(result);
}