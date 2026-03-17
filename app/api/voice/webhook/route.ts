import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function getDB() {
  return new Database(path.join(process.cwd(), "dev.db"));
}

async function parseOwnerIntent(transcript: string, structuredData?: any): Promise<{
  decision: "CONFIRM" | "CANCEL" | "SPECIAL" | "UNKNOWN";
  instructions: string;
  estimatedTime: string;
  reason: string;
}> {
  // Use Vapi's structured data if available
  if (structuredData?.decision && ["CONFIRM", "CANCEL", "SPECIAL"].includes(structuredData.decision)) {
    return {
      decision: structuredData.decision,
      instructions: structuredData.instructions || "",
      estimatedTime: structuredData.estimatedTime || "",
      reason: structuredData.reason || "",
    };
  }

  // Fall back to Groq parsing
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `A shop owner said this in response to being told about a customer order:
"${transcript}"

Extract their decision as JSON. Reply ONLY with valid JSON, nothing else:
{
  "decision": "CONFIRM" or "CANCEL" or "SPECIAL",
  "instructions": "any special message to pass to customer (empty string if none)",
  "estimatedTime": "delivery time if mentioned (empty string if none)",
  "reason": "reason for cancellation if cancelled (empty string if not cancelled)"
}

CONFIRM = owner wants to accept and deliver
CANCEL = owner wants to reject this order
SPECIAL = owner has specific instructions (out of stock, partial order, timing, etc.)`,
      }],
      max_tokens: 200,
      temperature: 0.1,
    });

    const raw = response.choices[0].message.content || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      decision: ["CONFIRM", "CANCEL", "SPECIAL"].includes(parsed.decision)
        ? parsed.decision : "UNKNOWN",
      instructions: parsed.instructions || "",
      estimatedTime: parsed.estimatedTime || "",
      reason: parsed.reason || "",
    };
  } catch {
    return { decision: "UNKNOWN", instructions: "", estimatedTime: "", reason: "" };
  }
}

async function composeCustomerMessage(params: {
  shopName: string;
  customerName: string;
  itemsSummary: string;
  total: number;
  decision: string;
  instructions: string;
  estimatedTime: string;
  reason: string;
}): Promise<string> {
  const { shopName, customerName, itemsSummary, total, decision, instructions, estimatedTime, reason } = params;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `Write a short, professional WhatsApp-style message from "${shopName}" to customer "${customerName}" about their order.

Order details:
- Items: ${itemsSummary}
- Total: ₹${Math.round(total)}
- Owner's decision: ${decision}
- Special instructions: ${instructions || "none"}
- Estimated delivery time: ${estimatedTime || "not specified"}
- Cancellation reason: ${reason || "not specified"}

Rules:
- If CONFIRM: friendly confirmation, mention estimated delivery if given, sign off warmly
- If CANCEL: apologetic, give reason if available, suggest they can reorder later
- If SPECIAL: pass the specific instructions clearly
- Keep it under 100 words
- Use ₹ for prices
- Start with "Hi ${customerName}!"
- End with "- ${shopName} Team"
- No markdown, plain text only`,
      }],
      max_tokens: 200,
      temperature: 0.5,
    });

    return response.choices[0].message.content || "Your order has been updated.";
  } catch {
    if (decision === "CONFIRM") {
      return `Hi ${customerName}! Your order from ${shopName} has been confirmed. ${estimatedTime ? `Estimated delivery: ${estimatedTime}.` : "We'll deliver it soon!"} Thank you for ordering! - ${shopName} Team`;
    } else if (decision === "CANCEL") {
      return `Hi ${customerName}! We're sorry, your order from ${shopName} could not be fulfilled. ${reason ? `Reason: ${reason}.` : ""} Please try again later. - ${shopName} Team`;
    }
    return `Hi ${customerName}! Update on your order from ${shopName}: ${instructions || "Please contact us for details."} - ${shopName} Team`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message) return NextResponse.json({ received: true });

    console.log("Vapi webhook type:", message.type);

    // Only process end-of-call reports
    if (message.type !== "end-of-call-report") {
      return NextResponse.json({ received: true });
    }

    const call = message.call || {};
    const metadata = call.assistant?.metadata || message.metadata || {};
    const { orderId, customerName, itemsSummary, total, shopName } = metadata;

    if (!orderId) {
      console.log("No orderId in metadata");
      return NextResponse.json({ received: true });
    }

    const transcript = message.transcript || call.transcript || "";
    const structuredData = message.analysis?.structuredData || null;

    console.log(`Processing call for order ${orderId}`);
    console.log("Transcript:", transcript?.slice(0, 200));
    console.log("Structured data:", structuredData);

    // Parse what owner said
    const intent = await parseOwnerIntent(transcript, structuredData);
    console.log("Parsed intent:", intent);

    const db = getDB();

    // Update order status
    let newStatus = "pending";
    if (intent.decision === "CONFIRM") newStatus = "confirmed";
    else if (intent.decision === "CANCEL") newStatus = "cancelled";
    else if (intent.decision === "SPECIAL") newStatus = "confirmed"; // confirmed with special instructions

    db.prepare("UPDATE [Order] SET status = ? WHERE id = ?").run(newStatus, orderId);

    // Get order + customer phone
    const order = db.prepare(`
      SELECT o.*, b.name as shopName, b.phone as ownerPhone
      FROM [Order] o
      JOIN Business b ON b.id = o.businessId
      WHERE o.id = ?
    `).get(orderId) as any;

    // Compose customer message
    const customerMessage = await composeCustomerMessage({
      shopName: shopName || order?.shopName || "The Shop",
      customerName,
      itemsSummary,
      total,
      decision: intent.decision,
      instructions: intent.instructions,
      estimatedTime: intent.estimatedTime,
      reason: intent.reason,
    });

    // Store voice log with customer message
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS VoiceLog (
        id TEXT PRIMARY KEY, orderId TEXT, intent TEXT, transcript TEXT,
        customerMessage TEXT, createdAt TEXT DEFAULT (datetime('now'))
      )`);

      // Add customerMessage column if missing
      try { db.exec("ALTER TABLE VoiceLog ADD COLUMN customerMessage TEXT DEFAULT ''"); } catch {}

      db.prepare(`
        INSERT OR REPLACE INTO VoiceLog (id, orderId, intent, transcript, customerMessage)
        VALUES (?, ?, ?, ?, ?)
      `).run(randomUUID(), orderId, intent.decision, transcript?.slice(0, 500), customerMessage);
    } catch (e) {
      console.error("VoiceLog error:", e);
    }

    // Store customer notification in a CustomerMessage table for display in dashboard
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS CustomerMessage (
        id TEXT PRIMARY KEY, orderId TEXT, customerName TEXT,
        customerPhone TEXT, message TEXT, status TEXT DEFAULT 'pending',
        createdAt TEXT DEFAULT (datetime('now'))
      )`);

      db.prepare(`
        INSERT INTO CustomerMessage (id, orderId, customerName, customerPhone, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(randomUUID(), orderId, customerName, order?.phone || "", customerMessage);
    } catch (e) {
      console.error("CustomerMessage error:", e);
    }

    db.close();

    console.log(`✅ Order ${orderId} → ${newStatus}`);
    console.log(`📱 Customer message: ${customerMessage}`);

    return NextResponse.json({
      received: true,
      orderId,
      decision: intent.decision,
      newStatus,
      customerMessage,
    });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
