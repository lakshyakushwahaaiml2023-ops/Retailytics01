import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import Database from "better-sqlite3";
import path from "path";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

function getDB() {
  return new Database(path.join(process.cwd(), "dev.db"));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orderId, customerName, address, itemsSummary, total, shopName } = body;

  const OWNER_PHONE = process.env.OWNER_PHONE || "+916268347442";
  const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER!;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  if (!TWILIO_PHONE || !baseUrl) {
    return NextResponse.json({ error: "Twilio not configured" }, { status: 500 });
  }

  // Build TwiML URL with order details as query params
  const twimlUrl = new URL(`${baseUrl}/api/voice/twiml`);
  twimlUrl.searchParams.set("orderId", orderId);
  twimlUrl.searchParams.set("customerName", customerName);
  twimlUrl.searchParams.set("address", address);
  twimlUrl.searchParams.set("itemsSummary", itemsSummary);
  twimlUrl.searchParams.set("total", String(Math.round(total)));
  twimlUrl.searchParams.set("shopName", shopName);

  const statusCallbackUrl = `${baseUrl}/api/voice/call-status`;

  try {
    const call = await client.calls.create({
      to: OWNER_PHONE,
      from: TWILIO_PHONE,
      url: twimlUrl.toString(),
      statusCallback: statusCallbackUrl,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["completed", "failed", "no-answer"],
      timeout: 30,
      record: false,
    });

    // Mark order as notified
    const db = getDB();
    try {
      db.prepare("UPDATE [Order] SET notified = 1 WHERE id = ?").run(orderId);
    } catch {}
    db.close();

    console.log(`📞 Twilio call initiated: ${call.sid} → ${OWNER_PHONE}`);
    return NextResponse.json({ success: true, callSid: call.sid });
  } catch (err: any) {
    console.error("Twilio call error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
