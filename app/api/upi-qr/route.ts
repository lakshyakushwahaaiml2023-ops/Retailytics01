import { NextRequest, NextResponse } from "next/server";

// Generate UPI payment string and QR code as base64
export async function GET(req: NextRequest) {
  const amount = req.nextUrl.searchParams.get("amount") || "0";
  const orderId = req.nextUrl.searchParams.get("orderId") || "";
  const shopName = req.nextUrl.searchParams.get("shopName") || "Retailytics Shop";
  const upiId = process.env.UPI_ID || "9302139664@ibl";

  // UPI deep link format
  const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Order ${orderId.slice(0, 8)}`)}`;

  try {
    // Dynamic import of qrcode
    const QRCode = await import("qrcode");
    const qrDataUrl = await QRCode.default.toDataURL(upiString, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return NextResponse.json({
      qrDataUrl,
      upiString,
      upiId,
      amount,
      shopName,
    });
  } catch (err: any) {
    // Fallback: return just the UPI string, let client generate QR
    return NextResponse.json({
      qrDataUrl: null,
      upiString,
      upiId,
      amount,
      shopName,
      error: err.message,
    });
  }
}
