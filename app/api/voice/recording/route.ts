import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";
import { createChatCompletion, createAudioTranscription } from "@/lib/ai";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

function getDB() {
  return new Database(path.join(process.cwd(), "dev.db"));
}

async function transcribeRecording(recordingUrl: string): Promise<string> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const res = await fetch(`${recordingUrl}.mp3`, {
    headers: { "Authorization": `Basic ${credentials}` },
  });

  if (!res.ok) throw new Error(`Failed to fetch recording: ${res.status}`);

  const audioBuffer = await res.arrayBuffer();
  const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
  const audioFile = new File([audioBlob], "recording.mp3", { type: "audio/mpeg" });

  return createAudioTranscription(audioFile, "hi");
}

async function parseIntent(transcript: string): Promise<{
  decision: "CONFIRM" | "CANCEL" | "SPECIAL" | "UNKNOWN";
  instructions: string;
  estimatedTime: string;
  reason: string;
}> {
  try {
    const { content: raw } = await createChatCompletion({
      messages: [{
        role: "user",
        content: `A shop owner said this about a customer order (may be in Hindi, English or mix):
"${transcript}"

Extract their decision as JSON. Reply ONLY with valid JSON:
{
  "decision": "CONFIRM" or "CANCEL" or "SPECIAL",
  "instructions": "any special message for customer in English",
  "estimatedTime": "delivery time if mentioned, empty string if not",
  "reason": "reason if cancelled, empty string if not"
}

CONFIRM = wants to accept and deliver (haan/yes/ok/theek hai/confirm/bhejo)
CANCEL = wants to reject (nahi/no/cancel/nahi kar sakta/not available)
SPECIAL = has specific instructions (timing, partial order, out of stock item, etc.)`,
      }],
      max_tokens: 150,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

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
  shopName: string; customerName: string; itemsSummary: string;
  total: number; decision: string; instructions: string;
  estimatedTime: string; reason: string;
}): Promise<string> {
  const { shopName, customerName, itemsSummary, total, decision, instructions, estimatedTime, reason } = params;
  try {
    const { content: message } = await createChatCompletion({
      messages: [{
        role: "user",
        content: `Write a short WhatsApp message from "${shopName}" to customer "${customerName}".

Order: ${itemsSummary} — ₹${Math.round(total)}
Decision: ${decision}
Special instructions: ${instructions || "none"}
Estimated delivery: ${estimatedTime || "not specified"}
Cancellation reason: ${reason || "not specified"}

Rules:
- CONFIRM: friendly, mention delivery time if given
- CANCEL: apologetic, give reason if available
- SPECIAL: pass instructions clearly
- Under 80 words, plain text, no markdown
- Start with "Hi ${customerName}!"
- End with "- ${shopName} Team"`,
      }],
      max_tokens: 150,
      temperature: 0.4,
    });
    return message || "";
  } catch {
    if (decision === "CONFIRM") {
      return `Hi ${customerName}! Your order from ${shopName} is confirmed. ${estimatedTime ? `Delivery in ${estimatedTime}.` : "We'll deliver it soon!"} Thank you! - ${shopName} Team`;
    }
    return `Hi ${customerName}! Sorry, your order from ${shopName} could not be fulfilled. ${reason || "Please try again later."} - ${shopName} Team`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingSid = formData.get("RecordingSid") as string;

    const { searchParams } = req.nextUrl;
    const orderId = searchParams.get("orderId") || "";
    const customerName = searchParams.get("customerName") || "";
    const itemsSummary = searchParams.get("itemsSummary") || "";
    const total = Number(searchParams.get("total") || "0");
    const shopName = searchParams.get("shopName") || "";

    console.log(`🎙️ Recording received for order ${orderId}`);
    console.log(`Recording URL: ${recordingUrl}`);

    if (!recordingUrl || !orderId) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">No response received. Please check your dashboard. Goodbye!</Say>
</Response>`;
      return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    await new Promise(r => setTimeout(r, 2000));

    let transcript = "";
    try {
      transcript = await transcribeRecording(recordingUrl);
      console.log(`📝 Transcript: ${transcript}`);
    } catch (e: any) {
      console.error("Transcription failed:", e.message);
      transcript = "";
    }

    const intent = await parseIntent(transcript);
    console.log(`🎯 Intent: ${intent.decision}`);

    const db = getDB();
    let newStatus = "pending";
    if (intent.decision === "CONFIRM" || intent.decision === "SPECIAL") newStatus = "confirmed";
    else if (intent.decision === "CANCEL") newStatus = "cancelled";

    if (newStatus !== "pending") {
      db.prepare("UPDATE [Order] SET status = ? WHERE id = ?").run(newStatus, orderId);
    }

    const customerMessage = await composeCustomerMessage({
      shopName, customerName, itemsSummary, total,
      decision: intent.decision, instructions: intent.instructions,
      estimatedTime: intent.estimatedTime, reason: intent.reason,
    });

    const order = db.prepare("SELECT phone FROM [Order] WHERE id = ?").get(orderId) as any;
    const customerPhone = order?.phone || "";

    try {
      db.prepare(`INSERT OR REPLACE INTO VoiceLog (id, orderId, intent, transcript, customerMessage)
        VALUES (?, ?, ?, ?, ?)`).run(randomUUID(), orderId, intent.decision, transcript, customerMessage);
    } catch {}

    try {
      db.prepare(`INSERT INTO CustomerMessage (id, orderId, customerName, customerPhone, message)
        VALUES (?, ?, ?, ?, ?)`).run(randomUUID(), orderId, customerName, customerPhone, customerMessage);
    } catch {}

    db.close();

    try {
      await twilioClient.recordings(recordingSid).remove();
    } catch {}

    console.log(`✅ Order ${orderId} → ${newStatus}`);
    console.log(`📱 Message: ${customerMessage}`);

    const confirmMsg = intent.decision === "CONFIRM"
      ? "Got it! Order confirmed. I will notify the customer right away."
      : intent.decision === "CANCEL"
      ? "Understood. Order cancelled. I will inform the customer."
      : "Got it! I will pass your instructions to the customer.";

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${confirmMsg} Thank you! Goodbye!</Say>
</Response>`;

    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
  } catch (err: any) {
    console.error("Recording webhook error:", err.message);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Something went wrong. Please check your dashboard. Goodbye!</Say>
</Response>`;
    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
  }
}
