"use client";

import { useEffect, useState, Suspense, useMemo, useCallback } from "react";
import CheckoutSheet from "@/components/CheckoutSheet";
import { useRouter, useSearchParams } from "next/navigation";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  businessId: string;
  shopName: string;
  shopType: string;
  shopLocality: string;
  shopCity: string;
  shopLat: number;
  shopLng: number;
  deliveryRadius: number;
  operatingHours: string;
  image?: string;
  distanceKm?: number;
};

type CartItem = { product: Product; quantity: number };

type OrderItem = {
  quantity: number;
  product: { name: string; price: number };
};

type Order = {
  id: string;
  customerName: string;
  address: string;
  status: string;
  businessId: string;
  createdAt: string;
  items: OrderItem[];
};

const PRICE_RANGES = [
  { label: "All prices", min: 0, max: Infinity },
  { label: "Under ₹100", min: 0, max: 100 },
  { label: "₹100–₹500", min: 100, max: 500 },
  { label: "₹500–₹1000", min: 500, max: 1000 },
  { label: "Above ₹1000", min: 1000, max: Infinity },
];

const SORT_OPTIONS = [
  { label: "Default (random)", value: "default" },
  { label: "Nearest shop first", value: "distance" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name A–Z", value: "name_asc" },
  { label: "In Stock First", value: "stock_desc" },
];

const typeIcon: Record<string, string> = {
  grocery: "🛒", electronics: "📱", pharmacy: "💊",
  clothing: "👕", stationery: "📚", hardware: "🔧",
  restaurant: "🍱", other: "🏪",
};

const statusConfig: Record<string, { label: string; cls: string; dot: string; step: number }> = {
  pending:    { label: "Pending",    cls: "bg-amber-500/15 text-amber-400 border border-amber-500/20",      dot: "bg-amber-400",   step: 0 },
  confirmed:  { label: "Confirmed",  cls: "bg-blue-500/15 text-blue-400 border border-blue-500/20",         dot: "bg-blue-400",    step: 1 },
  dispatched: { label: "Dispatched", cls: "bg-violet-500/15 text-violet-400 border border-violet-500/20",   dot: "bg-violet-400",  step: 2 },
  delivered:  { label: "Delivered",  cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",dot: "bg-emerald-400", step: 3 },
  cancelled:  { label: "Cancelled",  cls: "bg-red-500/15 text-red-400 border border-red-500/20",            dot: "bg-red-400",     step: -1 },
};

const DELIVERY_STEPS = ["Order placed", "Confirmed", "Out for delivery", "Delivered"];

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

type Tab = "shop" | "orders";

function CustomerStorefront() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bizIdParam = searchParams.get("bizId");

  const [tab, setTab] = useState<Tab>("shop");
  // Customer messages state
  const [customerMsgs, setCustomerMsgs] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [lastOrderId, setLastOrderId] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Address & location
  const [userAddress, setUserAddress] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [addressSet, setAddressSet] = useState(false);

    // Profile loaded from localStorage
    const [profile, setProfile] = useState<{ name: string; address: string; phone?: string } | null>(null);

    // Load profile from localStorage on mount
    useEffect(() => {
      try {
        const saved = localStorage.getItem("customerProfile");
        if (saved) {
          const profile = JSON.parse(saved);
          setCustomerName(profile.name || "");
          setCustomerPhone(profile.phone || "");
          setUserAddress(profile.address || "");
          setForm(f => ({
            ...f,
            name: profile.name || "",
            address: profile.address || "",
            phone: profile.phone || "",
          }));
          if (profile.lat && profile.lng) {
            setUserLat(profile.lat);
            setUserLng(profile.lng);
            setSortBy("distance");
          }
          setAddressSet(true);
        }
      } catch {}
    }, []);

  // Filters
  const [query, setQuery] = useState("");
  const [priceRange, setPriceRange] = useState(0);
  const [sortBy, setSortBy] = useState("default");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [shopFilter, setShopFilter] = useState("all");

  useEffect(() => {
    const url = bizIdParam ? `/api/products?bizId=${bizIdParam}` : "/api/products/all";
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const normalized = Array.isArray(data) ? data.map((p: any) => ({
          ...p,
          shopName: p.shopName || "Shop",
          shopType: p.shopType || "other",
          shopLocality: p.shopLocality || "",
          shopCity: p.shopCity || "",
          shopLat: p.shopLat ?? 22.5524,
          shopLng: p.shopLng ?? 75.7565,
          deliveryRadius: p.deliveryRadius ?? 5,
          operatingHours: p.operatingHours || "9AM-9PM",
        })) : [];
        setProducts(normalized);
        setLoading(false);
      });
  }, [bizIdParam]);

  const fetchMyOrders = useCallback(async (name: string, phone: string) => {
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams();
      if (phone) params.set("phone", phone);
      if (name) params.set("name", name);
      const [ordersRes, msgsRes] = await Promise.all([
        fetch(`/api/orders/customers?${params.toString()}`),
        fetch(`/api/customer-messages/by-phone?phone=${phone}`),
      ]);
      const [ordersData, msgsData] = await Promise.all([
        ordersRes.json(),
        msgsRes.json(),
      ]);
      setMyOrders(Array.isArray(ordersData) ? ordersData : []);
      // Build a map of orderId -> message
      const msgMap: Record<string, string> = {};
      if (Array.isArray(msgsData)) {
        msgsData.forEach((m: any) => { msgMap[m.orderId] = m.message; });
      }
      setCustomerMsgs(msgMap);
    } catch {
      setMyOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);
  // Auto-refresh messages every 15s on orders tab
  useEffect(() => {
    if (tab !== "orders" || (!customerName && !customerPhone)) return;
    const interval = setInterval(() => {
      fetchMyOrders(customerName, customerPhone);
    }, 15000);
    return () => clearInterval(interval);
  }, [tab, customerName, customerPhone, fetchMyOrders]);

  const geocodeAddress = useCallback(async () => {
    if (!addressInput.trim()) return;
    setGeocoding(true); setGeoError("");
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(addressInput)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUserLat(data.lat); setUserLng(data.lng);
      setUserAddress(addressInput);
      setAddressSet(true);
      setSortBy("distance");
    } catch (e: any) { setGeoError(e.message); }
    finally { setGeocoding(false); }
  }, [addressInput]);

  const shops = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: string }>();
    products.forEach(p => {
      if (!map.has(p.businessId)) map.set(p.businessId, { id: p.businessId, name: p.shopName, type: p.shopType });
    });
    return Array.from(map.values());
  }, [products]);

  const productsWithDistance = useMemo(() => products.map(p => ({
    ...p,
    distanceKm: userLat !== null && userLng !== null
      ? Math.round(haversine(userLat, userLng, p.shopLat, p.shopLng) * 10) / 10
      : undefined,
  })), [products, userLat, userLng]);

  const filtered = useMemo(() => {
    let list = [...productsWithDistance];
    const range = PRICE_RANGES[priceRange];
    if (query.trim()) { const q = query.toLowerCase(); list = list.filter(p => p.name.toLowerCase().includes(q) || p.shopName.toLowerCase().includes(q)); }
    list = list.filter(p => p.price >= range.min && p.price < range.max);
    if (inStockOnly) list = list.filter(p => p.stock > 0);
    if (shopFilter !== "all") list = list.filter(p => p.businessId === shopFilter);
    if (sortBy === "distance" && userLat !== null) list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    else if (sortBy === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (sortBy === "name_asc") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "stock_desc") list.sort((a, b) => b.stock - a.stock);
    return list;
  }, [productsWithDistance, query, priceRange, sortBy, inStockOnly, shopFilter, userLat, userLng]);

  const activeFilters = (priceRange > 0 ? 1 : 0) + (inStockOnly ? 1 : 0) + (sortBy !== "default" && sortBy !== "distance" ? 1 : 0) + (shopFilter !== "all" ? 1 : 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === productId);
      if (ex && ex.quantity > 1) return prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter(i => i.product.id !== productId);
    });
  };

  const cartByShop = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    cart.forEach(item => {
      const sid = item.product.businessId;
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(item);
    });
    return map;
  }, [cart]);

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const placeOrder = async () => {
    if (!form.name || !form.address) return;
    setPlacing(true);
    try {
      const orderIds: string[] = [];
      for (const [shopId, items] of cartByShop) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: form.name,
            address: form.address,
            phone: form.phone,
            businessId: shopId,
            items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
          }),
        });
        const data = await res.json();
        orderIds.push(data.id);
      }
      setLastOrderId(orderIds[0]);
      setCustomerName(form.name);
      setCustomerPhone(form.phone);
      await fetchMyOrders(form.name, form.phone);
      setTab("orders");
      setOrderPlaced(true);
      setCart([]);
      setShowCheckout(false);
    } catch { alert("Failed to place order"); }
    finally { setPlacing(false); }
  };

  // Address entry screen
  if (!addressSet) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
          .font-display{font-family:'Instrument Serif',serif} .font-body{font-family:'DM Sans',sans-serif}
          @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} .anim{animation:fadeUp .5s ease both}
          .grid-bg{background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px}
          .input-field{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:white;transition:all .2s;font-family:'DM Sans',sans-serif}
          .input-field:focus{border-color:rgba(255,255,255,.3);outline:none;box-shadow:0 0 0 3px rgba(255,255,255,.04)}
          .input-field::placeholder{color:rgba(255,255,255,.2)}
          .btn-primary{background:white;color:#0a0a0a;transition:all .2s;font-family:'DM Sans',sans-serif}
          .btn-primary:hover:not(:disabled){background:#e8e8e8;transform:translateY(-1px)} .btn-primary:disabled{opacity:.4;cursor:not-allowed}
          .btn-ghost{border:1px solid rgba(255,255,255,.1);transition:all .2s;font-family:'DM Sans',sans-serif}
          .btn-ghost:hover{background:rgba(255,255,255,.04)}
          .suggestion{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif}
          .suggestion:hover{border-color:rgba(255,255,255,.15);background:rgba(255,255,255,.06)}
        `}</style>
        <div className="fixed inset-0 grid-bg pointer-events-none opacity-50" />
        <div className="relative z-10 w-full max-w-md anim">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <span className="text-[#0a0a0a] text-xs font-bold font-body">R</span>
            </div>
            <span className="font-body text-sm text-gray-500">Retailytics</span>
          </button>
          <h1 className="font-display text-4xl text-white mb-2">Where are you?</h1>
          <p className="font-body text-sm text-gray-500 mb-8 leading-relaxed">Enter your area or landmark in Mhow to see shops and distances.</p>
          <div className="relative mb-3">
            <input className="input-field w-full rounded-xl px-4 py-3.5 text-sm pr-12"
              placeholder="e.g. Gandhi Chowk, Station Road..."
              value={addressInput} onChange={e => setAddressInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && geocodeAddress()} autoFocus />
            {geocoding && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              </div>
            )}
          </div>
          {geoError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 font-body text-xs rounded-xl p-3 mb-3">{geoError}</div>}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {["Gandhi Chowk", "Station Road", "Cantonment Area", "Sadar Bazar"].map(s => (
              <button key={s} onClick={() => setAddressInput(s)} className="suggestion rounded-xl px-3 py-2 text-left text-xs text-gray-400">
                <span className="text-gray-600 mr-1">📍</span> {s}
              </button>
            ))}
          </div>
          <button onClick={geocodeAddress} disabled={geocoding || !addressInput.trim()}
            className="btn-primary w-full py-3 rounded-xl text-sm font-medium mb-3">
            {geocoding ? "Finding your location..." : "Find shops near me →"}
          </button>
          <button onClick={() => setAddressSet(true)} className="btn-ghost w-full py-2.5 rounded-xl text-sm text-gray-500">
            Skip — browse all shops
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        .font-display{font-family:'Instrument Serif',serif} .font-body{font-family:'DM Sans',sans-serif}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .slide-up{animation:slideUp .35s ease both} .slide-down{animation:slideDown .2s ease both}
        .grid-bg{background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px}
        .nav-blur{backdrop-filter:blur(20px);background:rgba(10,10,10,.85);border-bottom:1px solid rgba(255,255,255,.06)}
        .product-card{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);transition:all .2s ease}
        .product-card:hover{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.04);transform:translateY(-1px)}
        .product-card.oos{opacity:.4;pointer-events:none}
        .btn-add{background:white;color:#0a0a0a;transition:all .2s} .btn-add:hover{background:#e8e8e8}
        .qty-btn{border:1px solid rgba(255,255,255,.12);transition:all .15s} .qty-btn:hover{border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.06)}
        .cart-bar{background:rgba(255,255,255,.96);backdrop-filter:blur(20px)}
        .overlay{background:rgba(0,0,0,.65);backdrop-filter:blur(4px)}
        .checkout-sheet{background:#111;border-top:1px solid rgba(255,255,255,.08)}
        .input-field{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:white;transition:all .2s;font-family:'DM Sans',sans-serif}
        .input-field:focus{border-color:rgba(255,255,255,.3);outline:none} .input-field::placeholder{color:rgba(255,255,255,.25)}
        .search-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);transition:all .2s}
        .search-box:focus-within{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.06)}
        .filter-pill{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);transition:all .15s;cursor:pointer;font-family:'DM Sans',sans-serif}
        .filter-pill:hover{border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.06)}
        .filter-pill.active{border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:white}
        .filter-panel{border:1px solid rgba(255,255,255,.08);background:#0d0d0d}
        .shimmer{background:linear-gradient(90deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 100%);background-size:400px 100%;animation:shimmer 1.4s ease infinite}
        .select-dark{background:#111;border:1px solid rgba(255,255,255,.1);color:white;font-family:'DM Sans',sans-serif}
        .select-dark:focus{outline:none;border-color:rgba(255,255,255,.3)} select option{background:#111}
        .dist-badge{background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);color:#60a5fa}
        .dist-close{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);color:#34d399}
        .scrollbar-dark::-webkit-scrollbar{width:4px}
        .scrollbar-dark::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
        .tab-btn{transition:all .2s;font-family:'DM Sans',sans-serif}
        .tab-btn.active{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2);color:white}
        .order-card{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);transition:border-color .2s}
        .order-card:hover{border-color:rgba(255,255,255,.14)}
        .step-dot{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .step-line{flex:1;height:2px;border-radius:1px}
      `}</style>

      <div className="fixed inset-0 grid-bg pointer-events-none opacity-50" />

      {/* Header */}
      <div className="sticky top-0 z-40 nav-blur px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => router.push("/")} className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <span className="text-[#0a0a0a] text-xs font-bold font-body">R</span>
            </button>
            <div>
              <p className="font-body font-medium text-white text-sm leading-tight">
                {bizIdParam ? "Shop" : "All Shops · Mhow"}
              </p>
              {userAddress && (
                <button onClick={() => setAddressSet(false)}
                  className="font-body text-xs text-blue-400/80 hover:text-blue-400 leading-tight flex items-center gap-1 transition-colors">
                  <span>📍</span> {userAddress} <span className="text-gray-600 ml-1">· change</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border border-white/10 rounded-xl p-1">
            <button onClick={() => setTab("shop")}
              className={`tab-btn font-body text-xs px-3 py-1.5 rounded-lg border border-transparent ${tab === "shop" ? "active" : "text-gray-500"}`}>
              Browse
            </button>
            <button
              onClick={() => {
                setTab("orders");
                fetchMyOrders(customerName, customerPhone);
              }}
              className={`tab-btn font-body text-xs px-3 py-1.5 rounded-lg border border-transparent flex items-center gap-1.5 ${tab === "orders" ? "active" : "text-gray-500"}`}>
              My Orders
              {myOrders.filter(o => o.status === "pending" || o.status === "confirmed").length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-[#0a0a0a] text-[10px] font-bold flex items-center justify-center">
                  {myOrders.filter(o => o.status === "pending" || o.status === "confirmed").length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {tab === "shop" && (
              <>
                <div className="search-box hidden md:flex items-center gap-2 rounded-xl px-3 py-2 flex-1 max-w-xs">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input className="bg-transparent text-sm text-white placeholder-gray-600 outline-none flex-1 font-body"
                    placeholder="Search..." value={query} onChange={e => setQuery(e.target.value)} />
                  {query && <button onClick={() => setQuery("")} className="text-gray-600 text-xs font-body">✕</button>}
                </div>
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`filter-pill font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${showFilters ? "active" : ""}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/>
                    <line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round"/>
                  </svg>
                  Filters {activeFilters > 0 && <span className="w-4 h-4 rounded-full bg-white text-[#0a0a0a] text-[10px] font-bold flex items-center justify-center">{activeFilters}</span>}
                </button>
              </>
            )}
            {cartCount > 0 && (
              <button onClick={() => setShowCheckout(true)}
                className="cart-bar flex items-center gap-2 text-[#0a0a0a] px-4 py-2 rounded-xl font-body text-sm font-medium">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {cartCount} · ₹{cartTotal.toLocaleString("en-IN")}
              </button>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && tab === "shop" && (
          <div className="max-w-5xl mx-auto mt-3">
            <div className="filter-panel rounded-2xl p-4 slide-down">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {!bizIdParam && (
                  <div>
                    <p className="font-body text-xs text-gray-500 mb-2 uppercase tracking-wide">Shop</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => setShopFilter("all")} className={`filter-pill font-body text-xs px-2.5 py-1 rounded-lg ${shopFilter === "all" ? "active" : "text-gray-500"}`}>All shops</button>
                      {shops.map(s => (
                        <button key={s.id} onClick={() => setShopFilter(s.id)}
                          className={`filter-pill font-body text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 ${shopFilter === s.id ? "active" : "text-gray-500"}`}>
                          <span style={{ fontSize: "11px" }}>{typeIcon[s.type] || "🏪"}</span>
                          {s.name.split(" ").slice(0, 2).join(" ")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="font-body text-xs text-gray-500 mb-2 uppercase tracking-wide">Price</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRICE_RANGES.map((r, i) => (
                      <button key={r.label} onClick={() => setPriceRange(i)}
                        className={`filter-pill font-body text-xs px-2.5 py-1 rounded-lg ${priceRange === i ? "active" : "text-gray-500"}`}>{r.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-body text-xs text-gray-500 mb-2 uppercase tracking-wide">Sort by</p>
                  <select className="select-dark w-full rounded-xl px-3 py-2 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <p className="font-body text-xs text-gray-500 mb-2 uppercase tracking-wide">Availability</p>
                  <button onClick={() => setInStockOnly(!inStockOnly)}
                    className={`filter-pill font-body text-xs px-3 py-2 rounded-xl flex items-center gap-2 w-full mb-2 ${inStockOnly ? "active" : "text-gray-500"}`}>
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${inStockOnly ? "bg-white border-white" : "border-white/20"}`}>
                      {inStockOnly && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    In stock only
                  </button>
                  {activeFilters > 0 && (
                    <button onClick={() => { setPriceRange(0); setSortBy(userLat ? "distance" : "default"); setInStockOnly(false); setShopFilter("all"); }}
                      className="font-body text-xs text-red-400/70 hover:text-red-400 transition-colors">Clear filters</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">

        {/* ── SHOP TAB ── */}
        {tab === "shop" && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="font-display text-2xl text-white">
                  {query ? `Results for "${query}"` : bizIdParam ? "Browse products" : "All shops · Mhow"}
                </h1>
                <p className="font-body text-xs text-gray-500 mt-0.5">
                  {filtered.length} of {products.length} items
                  {userLat && " · sorted by distance"}
                  {activeFilters > 0 && ` · ${activeFilters} filter${activeFilters > 1 ? "s" : ""} active`}
                </p>
              </div>
            </div>

            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="rounded-2xl overflow-hidden h-52"><div className="shimmer w-full h-full" /></div>)}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                </div>
                <p className="font-body text-sm text-gray-500 mb-1">No products found</p>
                <button onClick={() => { setQuery(""); setPriceRange(0); setSortBy("default"); setInStockOnly(false); setShopFilter("all"); }}
                  className="font-body text-xs text-gray-400 border border-white/10 px-4 py-2 rounded-lg mt-3 hover:bg-white/5 transition-colors">Clear all</button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((product, idx) => {
                const cartItem = cart.find(i => i.product.id === product.id);
                const oos = product.stock === 0;
                const distKm = product.distanceKm;
                const isClose = distKm !== undefined && distKm <= 1;
                return (
                  <div key={product.id} className={`product-card rounded-2xl p-4 flex flex-col ${oos ? "oos" : ""}`}
                    style={{ animation: `fadeUp .4s ${idx * 0.03}s ease both` }}>
                    <div className="w-full h-36 rounded-xl mb-3 overflow-hidden border border-white/5 bg-white/[0.03] flex items-center justify-center">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="w-full h-full items-center justify-center"
                        style={{ display: product.image ? "none" : "flex" }}>
                        <span style={{ fontSize: "32px" }}>{typeIcon[product.shopType] || "📦"}</span>
                      </div>
                    </div>
                    <p className="font-body font-medium text-white text-sm mb-1 leading-tight flex-1">{product.name}</p>
                    <p className="font-body text-xs text-gray-600 mb-1 truncate">{product.shopName}</p>
                    {distKm !== undefined && (
                      <div className={`inline-flex items-center gap-1 text-xs font-body px-2 py-0.5 rounded-full mb-2 w-fit ${isClose ? "dist-close" : "dist-badge"}`}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        {distKm < 0.1 ? "< 0.1 km" : `${distKm} km`}{isClose && " · nearby"}
                      </div>
                    )}
                    <p className="font-body text-xs text-gray-600 mb-3">
                      {oos ? <span className="text-red-400/70">Out of stock</span> :
                       product.stock <= 5 ? <span className="text-amber-400/80">{product.stock} left · low</span> :
                       `${product.stock} in stock`}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <p className="font-display text-lg text-white">₹{product.price.toLocaleString("en-IN")}</p>
                      {oos ? <span className="font-body text-xs text-gray-700">Unavail.</span> :
                       !cartItem ? (
                        <button onClick={() => addToCart(product)} className="btn-add font-body text-xs font-medium px-3 py-1.5 rounded-lg">Add</button>
                       ) : (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => removeFromCart(product.id)} className="qty-btn w-6 h-6 rounded-full text-gray-400 text-xs flex items-center justify-center">−</button>
                          <span className="font-body text-sm font-medium text-white w-4 text-center">{cartItem.quantity}</span>
                          <button onClick={() => addToCart(product)} className="w-6 h-6 rounded-full bg-white text-[#0a0a0a] text-xs flex items-center justify-center font-medium">+</button>
                        </div>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── MY ORDERS TAB ── */}
        {tab === "orders" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-display text-2xl text-white">My Orders</h1>
                <p className="font-body text-xs text-gray-500 mt-0.5">Track your deliveries in real time</p>
              </div>
              {customerName && (
                <button onClick={() => fetchMyOrders(customerName, customerPhone)}
                  className="font-body text-xs border border-white/10 text-gray-400 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  Refresh
                </button>
              )}
            </div>

            {/* Name input if not set */}
            {!customerName && (
              <div className="border border-white/8 bg-white/[0.02] rounded-2xl p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mx-auto mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <p className="font-display text-xl text-white mb-2">What's your name?</p>
                <p className="font-body text-sm text-gray-500 mb-5">Enter the name you used when placing your order.</p>
                <div className="flex gap-2 max-w-xs mx-auto">
                  <input
                    className="input-field flex-1 rounded-xl px-4 py-2.5 text-sm"
                    placeholder="Your name..."
                    onKeyDown={e => {
                      if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                        const n = (e.target as HTMLInputElement).value.trim();
                        setCustomerName(n);
                        fetchMyOrders(n, customerPhone);
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = (e.currentTarget.previousSibling as HTMLInputElement);
                      const n = input.value.trim();
                      if (n) {
                        setCustomerName(n);
                        fetchMyOrders(n, customerPhone);
                      }
                    }}
                    className="btn-primary px-4 py-2.5 rounded-xl text-sm font-medium font-body"
                    style={{ background: "white", color: "#0a0a0a" }}>
                    Find
                  </button>
                </div>
              </div>
            )}

            {customerName && loadingOrders && (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="rounded-2xl overflow-hidden h-40"><div className="shimmer w-full h-full" /></div>)}
              </div>
            )}

            {customerName && !loadingOrders && myOrders.length === 0 && (
              <div className="border border-white/8 bg-white/[0.02] rounded-2xl p-10 text-center">
                <p className="font-body text-sm text-gray-500 mb-2">No orders found for "{customerName}"</p>
                <button onClick={() => { setCustomerName(""); setMyOrders([]); }}
                  className="font-body text-xs text-gray-600 underline hover:text-gray-400 transition-colors">Try a different name</button>
              </div>
            )}

            {customerName && !loadingOrders && myOrders.length > 0 && (
              <div className="space-y-4">
                {myOrders.map((order, idx) => {
                  const sc = statusConfig[order.status] || { label: order.status, cls: "bg-gray-500/15 text-gray-400 border border-gray-500/20", dot: "bg-gray-400", step: 0 };
                  const total = order.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
                  const isCancelled = order.status === "cancelled";
                  const currentStep = sc.step;

                  return (
                    <div key={order.id} className="order-card rounded-2xl p-5"
                      style={{ animation: `fadeUp .4s ${idx * 0.08}s ease both` }}>
                      {/* Order header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-body font-medium text-white text-sm">Order #{order.id.slice(0, 8)}</p>
                          <p className="font-body text-xs text-gray-500 mt-0.5">{order.address}</p>
                        </div>
                        <span className={`font-body text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${sc.cls}`}>
                          <span className={`w-1 h-1 rounded-full ${sc.dot}`} />{sc.label}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="bg-white/[0.02] border border-white/6 rounded-xl p-3 mb-4 space-y-1.5">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between font-body text-sm">
                            <span className="text-gray-400">{item.product.name} ×{item.quantity}</span>
                            <span className="text-white">₹{(item.product.price * item.quantity).toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                        <div className="border-t border-white/8 pt-2 flex justify-between font-body text-sm font-medium">
                          <span className="text-gray-300">Total</span>
                          <span className="text-white">₹{Math.round(total).toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      {/* Progress tracker */}
                      {!isCancelled ? (
                        <div>
                          <p className="font-body text-xs text-gray-600 mb-3 uppercase tracking-wide">Delivery progress</p>
                          <div className="flex items-center gap-0">
                            {DELIVERY_STEPS.map((step, i) => {
                              const done = i <= currentStep;
                              const active = i === currentStep;
                              return (
                                <div key={step} className="flex items-center" style={{ flex: i < DELIVERY_STEPS.length - 1 ? "1" : "0" }}>
                                  <div className="flex flex-col items-center gap-1">
                                    <div className={`step-dot ${done ? "bg-emerald-500/20 border border-emerald-500/50" : active ? "bg-amber-500/20 border border-amber-500/50" : "bg-white/4 border border-white/10"}`}>
                                      {done && i < currentStep ? (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3">
                                          <path d="M20 6L9 17l-5-5"/>
                                        </svg>
                                      ) : active ? (
                                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                                      ) : null}
                                    </div>
                                    <p className={`font-body text-[10px] text-center leading-tight ${done ? "text-emerald-400" : active ? "text-amber-400" : "text-gray-700"}`}
                                      style={{ maxWidth: "60px" }}>
                                      {step}
                                    </p>
                                  </div>
                                  {i < DELIVERY_STEPS.length - 1 && (
                                    <div className={`step-line mx-1 mb-5 ${i < currentStep ? "bg-emerald-500/40" : "bg-white/8"}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                          <p className="font-body text-xs text-red-400">This order was cancelled. You can place a new order from the Browse tab.</p>
                        </div>
                      )}

                      {/* Shop message to customer */}
                      {customerMsgs[order.id] && (
                        <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.08)" }}>
                          <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(59,130,246,0.15)" }}>
                            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 0 2 2z"/>
                              </svg>
                            </div>
                            <p className="font-body text-xs text-blue-400 font-medium">Message from shop</p>
                          </div>
                          <div className="px-3 py-2.5">
                            <p className="font-body text-sm text-white/85 leading-relaxed">{customerMsgs[order.id]}</p>
                          </div>
                        </div>
                      )}

                      {/* AI voice agent note for pending orders */}
                      {order.status === "pending" && (
                        <div className="mt-3 bg-amber-500/8 border border-amber-500/15 rounded-xl p-3">
                          <p className="font-body text-xs text-amber-400/80 leading-relaxed">
                            Waiting for shop confirmation. If not confirmed in 5 mins, our AI will call the owner automatically.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showCheckout && (
        <CheckoutSheet
          cart={cartByShop}
          total={cartTotal}
          userAddress={userAddress}
          customerName={customerName}
          customerPhone={customerPhone}
          onClose={() => setShowCheckout(false)}
          onSuccess={(orderIds, name, phone) => {
            setCustomerName(name);
            setCustomerPhone(phone);
            setOrderPlaced(true);
            setLastOrderId(orderIds[0]);
            setCart([]);
            setShowCheckout(false);
            fetchMyOrders(name, phone);
            setTimeout(() => setTab("orders"), 500);
          }}
        />
      )}
    </div>
  );
}

export default function CustomerPage() {
  return <Suspense><CustomerStorefront /></Suspense>;
}
