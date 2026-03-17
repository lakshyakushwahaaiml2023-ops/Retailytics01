import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET(req: NextRequest) {
  const db = new Database(path.join(process.cwd(), "dev.db"));
  const all = req.nextUrl.searchParams.get("all");

  if (all) {
    const businesses = db.prepare("SELECT * FROM Business ORDER BY rowid DESC").all();
    db.close();
    return NextResponse.json(businesses);
  }

  const biz = db.prepare("SELECT * FROM Business ORDER BY rowid DESC LIMIT 1").get() as any;
  db.close();
  return NextResponse.json(biz || {});
}