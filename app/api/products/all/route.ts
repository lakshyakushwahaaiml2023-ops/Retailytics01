import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET() {
  const db = new Database(path.join(process.cwd(), "dev.db"));

  const products = db.prepare(
    `SELECT
      p.id, p.name, p.price, p.stock, p.businessId,
      COALESCE(p.image, '') as image,
      b.name     as shopName,
      b.type     as shopType,
      b.locality as shopLocality,
      b.city     as shopCity,
      b.lat      as shopLat,
      b.lng      as shopLng,
      b.deliveryRadius,
      b.operatingHours
    FROM Product p
    JOIN Business b ON b.id = p.businessId
    ORDER BY RANDOM()`
  ).all();

  db.close();
  return NextResponse.json(products);
}