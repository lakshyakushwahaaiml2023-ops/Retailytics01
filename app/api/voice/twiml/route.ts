import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const orderId      = p.get("orderId") || "";
  const customerName = p.get("customerName") || "a customer";
  const address      = p.get("address") || "";
  const itemsSummary = p.get("itemsSummary") || "";
  const total        = p.get("total") || "0";
  const shopName     = p.get("shopName") || "your shop";

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  // Build recording callback URL
  const recParams = new URLSearchParams({
    orderId, customerName, itemsSummary, total, shopName,
  });
  const recordingActionUrl = `${baseUrl}/api/voice/recording?${recParams.toString()}`;

  const speechText = `Hello! This is Retailytics calling for ${shopName}. 
You have a new order. 
Customer: ${customerName}. 
Address: ${address}. 
Items: ${itemsSummary}. 
Total: Rupees ${total}. 
Please say CONFIRM to accept, or CANCEL to reject, then press the hash key.`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(speechText)}</Say>
  <Record
    action="${escapeXml(recordingActionUrl)}"
    method="POST"
    timeout="8"
    maxLength="20"
    playBeep="true"
    finishOnKey="#"
  />
  <Say voice="alice">We did not receive a response. Please check your dashboard. Goodbye.</Say>
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
