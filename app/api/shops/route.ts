import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET() {
  const db = new Database(path.join(process.cwd(), "dev.db"));
  const shops = db.prepare(`
    SELECT id, name, type, locality, city, areaType,
           customerAgeRange, operatingHours, deliveryRadius,
           lat, lng,
           (SELECT COUNT(*) FROM Product WHERE businessId = Business.id) as productCount
    FROM Business
    ORDER BY name
  `).all();
  db.close();
  return NextResponse.json(shops);
}