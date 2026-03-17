import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";

function getDB() {
  return new Database(path.join(process.cwd(), "dev.db"));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, city, locality, areaType, customerAgeRange, deliveryRadius, operatingHours, phone, lat, lng, ownerId } = body;

    const db = getDB();

    // Ensure user exists
    const existing = db.prepare("SELECT id FROM User WHERE id = ?").get(ownerId);
    if (!existing) {
      db.prepare("INSERT OR IGNORE INTO User (id, email, role) VALUES (?, ?, ?)")
        .run(ownerId, "owner@demo.com", "owner");
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO Business (id, name, type, city, locality, areaType, customerAgeRange, deliveryRadius, operatingHours, ownerId, lat, lng, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, type, city, locality, areaType, customerAgeRange,
      Number(deliveryRadius), operatingHours || "9AM-9PM", ownerId,
      lat || 22.5524, lng || 75.7565, phone || ""
    );

    db.close();
    return NextResponse.json({ id, name });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
