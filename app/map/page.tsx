"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";

type Shop = {
  id: string;
  name: string;
  type: string;
  locality: string;
  city: string;
  operatingHours: string;
  deliveryRadius: number;
  productCount: number;
  lat: number;
  lng: number;
};

const typeIcon: Record<string, string> = {
  grocery: "🛒", electronics: "📱", pharmacy: "💊",
  clothing: "👕", stationery: "📚", hardware: "🔧",
  restaurant: "🍱", other: "🏪",
};

const typeColor: Record<string, string> = {
  grocery: "#34d399", electronics: "#60a5fa", pharmacy: "#a78bfa",
  clothing: "#f472b6", stationery: "#fbbf24", hardware: "#fb923c",
  restaurant: "#f87171", other: "#9ca3af",
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function MapContent() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const circlesRef = useRef<any[]>([]);

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Shop | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [userAddress, setUserAddress] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Load shops
  useEffect(() => {
    fetch("/api/shops")
      .then(r => r.json())
      .then(d => { setShops(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  // Init Leaflet map once shops are loaded
  useEffect(() => {
    if (loading || !mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then(L => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [22.5524, 75.7565],
        zoom: 15,
        zoomControl: true,
      });

      // OpenStreetMap tiles — free, no key
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading]);

  // Add shop markers whenever map is ready + shops change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !shops.length) return;

    import("leaflet").then(L => {
      const map = mapInstanceRef.current;

      // Clear old markers and circles
      markersRef.current.forEach(m => m.remove());
      circlesRef.current.forEach(c => c.remove());
      markersRef.current = [];
      circlesRef.current = [];

      shops.forEach(shop => {
        const color = typeColor[shop.type] || "#9ca3af";
        const icon = typeIcon[shop.type] || "🏪";

        // Custom HTML marker
        const markerIcon = L.divIcon({
          className: "",
          html: `
            <div style="
              width:40px;height:40px;border-radius:50%;
              background:${color}22;border:2px solid ${color};
              display:flex;align-items:center;justify-content:center;
              font-size:16px;cursor:pointer;
              box-shadow:0 2px 8px rgba(0,0,0,0.4);
              transition:transform .15s;
            ">${icon}</div>
            <div style="
              position:absolute;top:44px;left:50%;transform:translateX(-50%);
              background:rgba(13,13,17,0.85);border:1px solid ${color}40;
              color:${color};font-size:9px;white-space:nowrap;
              padding:2px 6px;border-radius:4px;font-family:'DM Sans',sans-serif;
              backdrop-filter:blur(8px);
            ">${shop.name.split(" ").slice(0, 2).join(" ")}</div>
          `,
          iconSize: [40, 60],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([shop.lat, shop.lng], { icon: markerIcon })
          .addTo(map)
          .on("click", () => setSelected(s => s?.id === shop.id ? null : shop));

        // Delivery radius circle
        const circle = L.circle([shop.lat, shop.lng], {
          radius: shop.deliveryRadius * 1000,
          color,
          fillColor: color,
          fillOpacity: 0.04,
          weight: 1,
          dashArray: "4 4",
          opacity: 0.3,
        }).addTo(map);

        markersRef.current.push(marker);
        circlesRef.current.push(circle);
      });

      // Fit map to show all shops
      if (shops.length > 0) {
        const group = L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.15));
      }
    });
  }, [mapReady, shops]);

  // Update user marker when location changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    import("leaflet").then(L => {
      const map = mapInstanceRef.current;

      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }

      if (userLat !== null && userLng !== null) {
        const userIcon = L.divIcon({
          className: "",
          html: `
            <div style="
              width:20px;height:20px;border-radius:50%;
              background:#3b82f6;border:3px solid white;
              box-shadow:0 0 0 4px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.4);
            "></div>
            <div style="
              position:absolute;top:24px;left:50%;transform:translateX(-50%);
              background:rgba(13,13,17,0.85);border:1px solid #3b82f640;
              color:#60a5fa;font-size:9px;white-space:nowrap;
              padding:2px 6px;border-radius:4px;font-family:'DM Sans',sans-serif;
            ">You</div>
          `,
          iconSize: [20, 40],
          iconAnchor: [10, 10],
        });

        userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
        map.setView([userLat, userLng], 15, { animate: true });
      }
    });
  }, [mapReady, userLat, userLng]);

  const geocodeAddress = async () => {
    if (!addressInput.trim()) return;
    setGeocoding(true); setGeoError("");
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(addressInput)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUserLat(data.lat); setUserLng(data.lng);
      setUserAddress(addressInput);
      setAddressInput("");
    } catch (e: any) { setGeoError(e.message); }
    finally { setGeocoding(false); }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setGeoError("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setUserAddress("Your location");
        setLocating(false);
      },
      () => { setGeoError("Could not get location. Try entering an address."); setLocating(false); }
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css');
        .font-display{font-family:'Instrument Serif',serif}
        .font-body{font-family:'DM Sans',sans-serif}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .anim-1{animation:fadeUp .5s .05s ease both}
        .anim-2{animation:fadeUp .5s .15s ease both}
        .grid-bg{background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px}
        .nav-blur{backdrop-filter:blur(20px);background:rgba(10,10,10,.85);border-bottom:1px solid rgba(255,255,255,.06)}
        .card{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02)}
        .shop-item{border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);transition:all .2s;cursor:pointer}
        .shop-item:hover{border-color:rgba(255,255,255,.15);background:rgba(255,255,255,.05)}
        .shop-item.active{border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.06)}
        .btn-ghost{border:1px solid rgba(255,255,255,.1);transition:all .2s;font-family:'DM Sans',sans-serif}
        .btn-ghost:hover{border-color:rgba(255,255,255,.25);background:rgba(255,255,255,.04)}
        .btn-primary{background:white;color:#0a0a0a;transition:all .2s;font-family:'DM Sans',sans-serif}
        .btn-primary:hover:not(:disabled){background:#e8e8e8}
        .btn-primary:disabled{opacity:.4;cursor:not-allowed}
        .input-field{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:white;transition:all .2s;font-family:'DM Sans',sans-serif}
        .input-field:focus{border-color:rgba(255,255,255,.3);outline:none}
        .input-field::placeholder{color:rgba(255,255,255,.2)}
        .shimmer{background:linear-gradient(90deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 100%);background-size:400px 100%;animation:shimmer 1.4s ease infinite}
        .scrollbar-dark::-webkit-scrollbar{width:4px}
        .scrollbar-dark::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
        .leaflet-container{background:#0d1117 !important}
        .leaflet-tile{filter:brightness(0.85) saturate(0.9)}
        .leaflet-control-attribution{background:rgba(10,10,10,0.8) !important;color:rgba(255,255,255,0.3) !important;font-size:9px !important}
        .leaflet-control-attribution a{color:rgba(255,255,255,0.4) !important}
        .leaflet-control-zoom a{background:#111 !important;color:white !important;border-color:rgba(255,255,255,.1) !important}
        .leaflet-control-zoom a:hover{background:#222 !important}
      `}</style>

      {/* Leaflet CSS loaded via link tag for reliability */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />

      <div className="fixed inset-0 grid-bg pointer-events-none opacity-40" />

      {/* Nav */}
      <nav className="sticky top-0 z-[1000] nav-blur px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")}
              className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <span className="text-[#0a0a0a] text-xs font-bold font-body">R</span>
            </button>
            <div>
              <p className="font-body font-medium text-white text-sm leading-tight">Shop Map</p>
              <p className="font-body text-xs text-gray-600 leading-tight">
                Mhow, Indore · {shops.length} shops registered
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push("/customer")}
              className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg">
              Browse shops
            </button>
            <button onClick={() => router.push("/")}
              className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg">
              Home
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left panel */}
          <div className="space-y-4 lg:col-span-1">

            {/* Location finder */}
            <div className="card rounded-2xl p-4 anim-1">
              <p className="font-body text-xs text-gray-500 uppercase tracking-wide mb-3">Find your location</p>

              {userLat && (
                <div className="flex items-center gap-2 mb-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
                  <span className="text-lg" style={{ fontSize: "14px" }}>📍</span>
                  <p className="font-body text-xs text-emerald-400 flex-1 truncate">{userAddress}</p>
                  <button onClick={() => { setUserLat(null); setUserLng(null); setUserAddress(""); }}
                    className="text-emerald-700 hover:text-emerald-400 text-xs transition-colors">✕</button>
                </div>
              )}

              <div className="flex gap-2 mb-2">
                <input
                  className="input-field flex-1 rounded-xl px-3 py-2.5 text-sm"
                  placeholder="Gandhi Chowk, Sadar Bazar..."
                  value={addressInput}
                  onChange={e => setAddressInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && geocodeAddress()}
                />
                <button onClick={geocodeAddress}
                  disabled={geocoding || !addressInput.trim()}
                  className="btn-primary px-3 py-2 rounded-xl text-xs font-medium shrink-0 disabled:opacity-40">
                  {geocoding ? (
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  ) : "Go"}
                </button>
              </div>

              <button onClick={useMyLocation} disabled={locating}
                className="btn-ghost w-full font-body text-xs text-gray-400 py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                </svg>
                {locating ? "Getting your location..." : "Use my GPS location"}
              </button>

              {geoError && (
                <p className="font-body text-xs text-red-400/80 mt-2 leading-relaxed">{geoError}</p>
              )}
            </div>

            {/* Shop list */}
            <div className="card rounded-2xl overflow-hidden anim-2">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <p className="font-display text-lg text-white">Nearby shops</p>
                {userLat && <p className="font-body text-xs text-gray-600">sorted by distance</p>}
              </div>
              <div className="max-h-[420px] overflow-y-auto scrollbar-dark">
                {loading && [1,2,3].map(i => (
                  <div key={i} className="p-3">
                    <div className="shimmer h-16 rounded-xl" />
                  </div>
                ))}
                {!loading && [...shops]
                  .sort((a, b) => {
                    if (!userLat || !userLng) return 0;
                    return haversine(userLat, userLng, a.lat, a.lng) -
                           haversine(userLat, userLng, b.lat, b.lng);
                  })
                  .map(shop => {
                    const dist = userLat && userLng
                      ? haversine(userLat, userLng, shop.lat, shop.lng)
                      : null;
                    const color = typeColor[shop.type] || "#9ca3af";
                    const inRange = dist !== null && dist <= shop.deliveryRadius;
                    return (
                      <button key={shop.id}
                        onClick={() => {
                          setSelected(s => s?.id === shop.id ? null : shop);
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.setView([shop.lat, shop.lng], 16, { animate: true });
                          }
                        }}
                        className={`shop-item w-full p-3.5 text-left block ${selected?.id === shop.id ? "active" : ""}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                            <span style={{ fontSize: "15px" }}>{typeIcon[shop.type] || "🏪"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-body font-medium text-white text-sm truncate leading-tight">{shop.name}</p>
                            <p className="font-body text-xs text-gray-600 truncate">{shop.locality}</p>
                          </div>
                          {dist !== null ? (
                            <div className="text-right shrink-0">
                              <p className="font-body text-xs font-medium" style={{ color }}>{dist} km</p>
                              <p className="font-body text-xs" style={{ color: inRange ? color : "rgba(255,255,255,0.2)" }}>
                                {inRange ? "delivers ✓" : "no delivery"}
                              </p>
                            </div>
                          ) : (
                            <p className="font-body text-xs text-gray-700 shrink-0">{shop.productCount} items</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Right — real Leaflet map */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl overflow-hidden border border-white/8 anim-1"
              style={{ height: "460px" }}>
              {loading ? (
                <div className="shimmer w-full h-full" />
              ) : (
                <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
              )}
            </div>

            {/* Selected shop card */}
            {selected && (
              <div className="card rounded-2xl p-5 anim-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${typeColor[selected.type] || "#9ca3af"}18`, border: `1px solid ${typeColor[selected.type] || "#9ca3af"}30` }}>
                      <span style={{ fontSize: "18px" }}>{typeIcon[selected.type] || "🏪"}</span>
                    </div>
                    <div>
                      <p className="font-body font-medium text-white">{selected.name}</p>
                      <p className="font-body text-xs text-gray-500">{selected.locality}, {selected.city}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)}
                    className="font-body text-gray-600 hover:text-gray-400 text-sm transition-colors">✕</button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Products", value: selected.productCount },
                    { label: "Delivery", value: `${selected.deliveryRadius} km` },
                    { label: "Hours", value: selected.operatingHours },
                  ].map(s => (
                    <div key={s.label} className="border border-white/6 rounded-xl p-3 text-center">
                      <p className="font-body text-xs text-gray-600 mb-0.5">{s.label}</p>
                      <p className="font-body text-sm text-white font-medium">{s.value}</p>
                    </div>
                  ))}
                </div>

                {userLat && userLng && (
                  <div className={`rounded-xl p-3 mb-4 border font-body text-xs ${
                    haversine(userLat, userLng, selected.lat, selected.lng) <= selected.deliveryRadius
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>
                    {haversine(userLat, userLng, selected.lat, selected.lng)} km from you ·{" "}
                    {haversine(userLat, userLng, selected.lat, selected.lng) <= selected.deliveryRadius
                      ? "Within delivery range — they can deliver to you ✓"
                      : `Outside delivery range (max ${selected.deliveryRadius} km) — visit the shop`}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => router.push(`/customer?bizId=${selected.id}`)}
                    className="btn-primary flex-1 font-body text-sm font-medium py-2.5 rounded-xl">
                    Browse this shop →
                  </button>
                  <button onClick={() => router.push(`/dashboard?bizId=${selected.id}`)}
                    className="btn-ghost flex-1 font-body text-sm text-gray-400 py-2.5 rounded-xl">
                    Owner view
                  </button>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="card rounded-2xl p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <p className="font-body text-xs text-gray-600 uppercase tracking-wide mr-1">Legend</p>
                {Object.entries(typeIcon)
                  .filter(([k]) => shops.some(s => s.type === k))
                  .map(([type, icon]) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <span style={{ fontSize: "12px" }}>{icon}</span>
                      <span className="font-body text-xs capitalize"
                        style={{ color: typeColor[type] || "#9ca3af" }}>{type}</span>
                    </div>
                  ))}
                <div className="flex items-center gap-1.5 ml-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" style={{ boxShadow: "0 0 0 3px rgba(59,130,246,0.3)" }} />
                  <span className="font-body text-xs text-blue-400">You</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-px border-t border-dashed border-white/20" />
                  <span className="font-body text-xs text-gray-600">Delivery area</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  return <Suspense><MapContent /></Suspense>;
}
