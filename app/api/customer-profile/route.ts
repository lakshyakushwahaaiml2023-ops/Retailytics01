import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";

function getDB() {
  return new Database(path.join(process.cwd(), "dev.db"));
}

// GET — fetch profile by phone
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  const all   = req.nextUrl.searchParams.get("all");
  const db    = getDB();

  if (all) {
    const profiles = db.prepare("SELECT * FROM CustomerProfile ORDER BY name").all();
    db.close();
    return NextResponse.json(profiles);
  }

  if (phone) {
    const profile = db.prepare("SELECT * FROM CustomerProfile WHERE phone = ?").get(phone);
    db.close();
    return NextResponse.json(profile || null);
  }

  db.close();
  return NextResponse.json(null);
}

// POST — create or update profile
export async function POST(req: NextRequest) {
  const { name, phone, address, city, lat, lng } = await req.json();
  if (!name || !phone || !address) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const db = getDB();
  const existing = db.prepare("SELECT id FROM CustomerProfile WHERE phone = ?").get(phone) as any;

  if (existing) {
    db.prepare(`
      UPDATE CustomerProfile SET name=?, address=?, city=?, lat=?, lng=? WHERE phone=?
    `).run(name, address, city || "Indore", lat || null, lng || null, phone);
  } else {
    db.prepare(`
      INSERT INTO CustomerProfile (id, name, phone, address, city, lat, lng)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), name, phone, address, city || "Indore", lat || null, lng || null);
  }

  const profile = db.prepare("SELECT * FROM CustomerProfile WHERE phone = ?").get(phone);
  db.close();
  return NextResponse.json(profile);
}
