import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";
import twilio from "twilio";

function getDB() {
  return new Database(path.join(process.cwd(), "dev.db"));
}

async function triggerCallForOrder(order: {
  id: string; customerName: string; address: string;
  businessId: string; phone: string;
}, baseUrl: string) {
  const db = getDB();

  // Get shop details
  const biz = db.prepare("SELECT name, phone as ownerPhone FROM Business WHERE id = ?").get(order.businessId) as any;

  // Get order items
  const items = db.prepare(`
    SELECT p.name, oi.quantity, p.price
    FROM OrderItem oi JOIN Product p ON p.id = oi.productId
    WHERE oi.orderId = ?
  `).all(order.id) as any[];

  db.close();

  if (!biz) return;

  const itemsSummary = items.map(i => `${i.name} x${i.quantity}`).join(", ");
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shopName = biz.name;

  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID!;
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
  const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER!;
  const OWNER_PHONE = process.env.OWNER_PHONE || "+916268347442";

  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.log("Twilio not configured — skipping call");
    return;
  }

  const params = new URLSearchParams({
    orderId: order.id, customerName: order.customerName,
    address: order.address, itemsSummary, total: String(Math.round(total)),
    shopName,
  });
  const twimlUrl = `${baseUrl}/api/voice/twiml?${params.toString()}`;

  try {
    const client = twilio(TWILIO_SID, TWILIO_TOKEN);
    const call = await client.calls.create({
      to: OWNER_PHONE,
      from: TWILIO_FROM,
      url: twimlUrl,
      statusCallback: `${baseUrl}/api/voice/call-status`,
      statusCallbackMethod: "POST",
      timeout: 30,
    });
    console.log(`📞 Auto-call triggered: ${call.sid}`);

    // Mark as notified
    const db2 = getDB();
    db2.prepare("UPDATE [Order] SET notified = 1 WHERE id = ?").run(order.id);
    db2.close();
  } catch (err: any) {
    console.error("Auto-call failed:", err.message);
  }
}

export async function GET(req: NextRequest) {
  const bizId = req.nextUrl.searchParams.get("bizId") || "demo-biz";
  const db = getDB();
  const orders = db.prepare("SELECT * FROM [Order] WHERE businessId = ? ORDER BY rowid DESC").all(bizId) as any[];

  const result = orders.map(o => {
    const items = db.prepare(`
      SELECT oi.quantity, p.name, p.price
      FROM OrderItem oi JOIN Product p ON p.id = oi.productId
      WHERE oi.orderId = ?
    `).all(o.id) as any[];
    return { ...o, items: items.map(i => ({ quantity: i.quantity, product: { name: i.name, price: i.price } })) };
  });

  db.close();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerName, address, phone, businessId, items } = body;
  const db = getDB();

  const orderId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO [Order] (id, customerName, address, phone, status, businessId, notified, createdAt)
    VALUES (?, ?, ?, ?, 'pending', ?, 0, ?)
  `).run(orderId, customerName, address, phone || "", businessId, now);

  for (const item of items) {
    db.prepare("INSERT INTO OrderItem (id, orderId, productId, quantity) VALUES (?, ?, ?, ?)")
      .run(randomUUID(), orderId, item.productId, item.quantity);
  }

  db.close();

  // Trigger call immediately in background (don't await — return fast)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:3000`;
  triggerCallForOrder(
    { id: orderId, customerName, address, businessId, phone: phone || "" },
    baseUrl
  ).catch(e => console.error("Background call error:", e.message));

  return NextResponse.json({ id: orderId, status: "pending" });
}

export async function PATCH(req: NextRequest) {
  const { orderId, status } = await req.json();
  const db = getDB();
  db.prepare("UPDATE [Order] SET status = ? WHERE id = ?").run(status, orderId);
  db.close();
  return NextResponse.json({ success: true });
}
