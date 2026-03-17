import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const city = req.nextUrl.searchParams.get("city") || "Mhow";
  if (!address) return NextResponse.json({ error: "No address" }, { status: 400 });

  try {
    const q = encodeURIComponent(`${address}, ${city}, Madhya Pradesh, India`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=in`,
      { headers: { "User-Agent": "Retailytics/1.0", "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (!data?.length)
      return NextResponse.json({ error: "Address not found. Try a landmark name." }, { status: 404 });
    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    });
  } catch {
    return NextResponse.json({ error: "Geocoding failed." }, { status: 500 });
  }
}