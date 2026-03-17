import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

function getDB() {
  return new Database(path.join(process.cwd(), "dev.db"));
}

export async function GET(req: NextRequest) {
  const bizId = req.nextUrl.searchParams.get("bizId") || "demo-biz";
  const db = getDB();

  // Total orders + revenue
  const orders = db.prepare(`
    SELECT o.id, o.status, oi.quantity, p.price, p.name as productName
    FROM [Order] o
    JOIN OrderItem oi ON oi.orderId = o.id
    JOIN Product p ON p.id = oi.productId
    WHERE o.businessId = ?
  `).all(bizId) as any[];

  // Order status breakdown
  const statusRows = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM [Order] WHERE businessId = ?
    GROUP BY status
  `).all(bizId) as any[];

  // Top selling products
  const topProducts = db.prepare(`
    SELECT p.name, SUM(oi.quantity) as totalQty, SUM(oi.quantity * p.price) as totalRevenue
    FROM OrderItem oi
    JOIN Product p ON p.id = oi.productId
    JOIN [Order] o ON o.id = oi.orderId
    WHERE o.businessId = ? AND o.status != 'cancelled'
    GROUP BY p.id, p.name
    ORDER BY totalQty DESC
    LIMIT 8
  `).all(bizId) as any[];

  // Revenue by product category approximation — group by first word
  const revenueByProduct = db.prepare(`
    SELECT p.name, SUM(oi.quantity * p.price) as revenue
    FROM OrderItem oi
    JOIN Product p ON p.id = oi.productId
    JOIN [Order] o ON o.id = oi.orderId
    WHERE o.businessId = ? AND o.status != 'cancelled'
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT 6
  `).all(bizId) as any[];

  // Total stats
  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s: number, o: any) => s + o.quantity * o.price, 0);

  const totalOrders = db.prepare(
    "SELECT COUNT(*) as c FROM [Order] WHERE businessId = ?"
  ).get(bizId) as any;

  const totalItems = db.prepare(
    "SELECT SUM(oi.quantity) as c FROM OrderItem oi JOIN [Order] o ON o.id = oi.orderId WHERE o.businessId = ?"
  ).get(bizId) as any;

  const avgOrderValue = totalOrders.c > 0
    ? Math.round(totalRevenue / totalOrders.c)
    : 0;

  db.close();

  return NextResponse.json({
    totalRevenue: Math.round(totalRevenue),
    totalOrders: totalOrders.c,
    totalItemsSold: totalItems.c || 0,
    avgOrderValue,
    statusBreakdown: statusRows,
    topProducts,
    revenueByProduct,
  });
}