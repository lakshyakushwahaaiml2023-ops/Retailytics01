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
  const products = db.prepare(`
    SELECT p.id, p.name, p.price, p.stock, p.businessId,
      COALESCE(p.image, '') as image,
      b.name     as shopName,     b.type     as shopType,
      b.locality as shopLocality, b.city     as shopCity,
      b.lat      as shopLat,      b.lng      as shopLng,
      b.deliveryRadius,           b.operatingHours
    FROM Product p
    JOIN Business b ON b.id = p.businessId
    WHERE p.businessId = ?
    ORDER BY p.rowid DESC
  `).all(bizId);
  db.close();
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const { name, price, stock, businessId, image } = await req.json();
  if (!name || !price || !businessId)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const db = getDB();
  const id = randomUUID();
  try {
    db.prepare("INSERT INTO Product (id, name, price, stock, businessId, image) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, name, Number(price), Number(stock) || 0, businessId, image || "");
  } catch {
    // image column may not exist yet
    db.prepare("INSERT INTO Product (id, name, price, stock, businessId) VALUES (?, ?, ?, ?, ?)")
      .run(id, name, Number(price), Number(stock) || 0, businessId);
  }
  const product = db.prepare("SELECT * FROM Product WHERE id = ?").get(id);
  db.close();
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest) {
  const { id, name, price, stock, image } = await req.json();
  const db = getDB();
  try {
    db.prepare("UPDATE Product SET name = ?, price = ?, stock = ?, image = ? WHERE id = ?")
      .run(name, Number(price), Number(stock), image || "", id);
  } catch {
    db.prepare("UPDATE Product SET name = ?, price = ?, stock = ? WHERE id = ?")
      .run(name, Number(price), Number(stock), id);
  }
  const product = db.prepare("SELECT * FROM Product WHERE id = ?").get(id);
  db.close();
  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const db = getDB();
  db.prepare("DELETE FROM Product WHERE id = ?").run(id);
  db.close();
  return NextResponse.json({ success: true });
}
