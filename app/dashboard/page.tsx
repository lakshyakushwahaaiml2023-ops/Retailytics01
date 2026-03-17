"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import VoiceAgentPanel from "@/components/VoiceAgentPanel";
import AIStrategyPanel from "@/components/AIStrategyPanel";
import AIChat from "@/components/AIChat";

type Recommendation = {
  product: string;
  reason: string;
  urgency: "High" | "Medium" | "Low";
  category: string;
};

type OrderItem = {
  quantity: number;
  product: { name: string; price: number };
};

type Order = {
  id: string;
  customerName: string;
  address: string;
  status: string;
  items: OrderItem[];
};

const urgencyConfig = {
  High:   { cls: "bg-red-500/15 text-red-400 border border-red-500/20",            dot: "bg-red-400" },
  Medium: { cls: "bg-amber-500/15 text-amber-400 border border-amber-500/20",       dot: "bg-amber-400" },
  Low:    { cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20", dot: "bg-emerald-400" },
};

const statusConfig: Record<string, { cls: string; label: string }> = {
  pending:    { cls: "bg-amber-500/15 text-amber-400 border border-amber-500/20",       label: "Pending" },
  confirmed:  { cls: "bg-blue-500/15 text-blue-400 border border-blue-500/20",          label: "Confirmed" },
  dispatched: { cls: "bg-violet-500/15 text-violet-400 border border-violet-500/20",    label: "Dispatched" },
  delivered:  { cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20", label: "Delivered" },
  cancelled:  { cls: "bg-red-500/15 text-red-400 border border-red-500/20",             label: "Cancelled" },
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [BIZ_ID, setBizId] = useState("demo-biz");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recError, setRecError] = useState("");
  const [bizName, setBizName] = useState("My Shop");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  useEffect(() => {
    const urlBizId = searchParams.get("bizId");
    if (urlBizId) {
      setBizId(urlBizId);
      fetch(`/api/business/latest?all=true`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            const found = data.find((b: any) => b.id === urlBizId);
            if (found) setBizName(found.name);
          }
        });
    } else {
      fetch("/api/business/latest")
        .then(r => r.json())
        .then(data => {
          if (data.id) { setBizId(data.id); setBizName(data.name); }
        });
    }
  }, []);

  useEffect(() => {
    if (BIZ_ID) fetchOrders();
  }, [BIZ_ID]);

  const fetchRecs = async () => {
    setLoadingRecs(true);
    setRecError("");
    try {
      const res = await fetch(`/api/recommendations?bizId=${BIZ_ID}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecs(data.recommendations);
      if (data.businessName) setBizName(data.businessName);
    } catch (e: any) {
      setRecError(e.message);
    } finally {
      setLoadingRecs(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?bizId=${BIZ_ID}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } finally {
      setLoadingOrders(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingOrder(orderId);
    await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    await fetchOrders();
    setUpdatingOrder(null);
  };

  const pending = orders.filter(o => o.status === "pending").length;
  const revenue = orders
    .filter(o => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.product.price * i.quantity, 0), 0);

  return (
    <>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
          .font-display{font-family:'Instrument Serif',serif}
          .font-body{font-family:'DM Sans',sans-serif}
          @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
          @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
          .anim-1{animation:fadeUp .5s .05s ease both}
          .anim-2{animation:fadeUp .5s .15s ease both}
          .anim-3{animation:fadeUp .5s .25s ease both}
          .anim-4{animation:fadeUp .5s .35s ease both}
          .spin{animation:spin .8s linear infinite}
          .shimmer-box{background:linear-gradient(90deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 100%);background-size:400px 100%;animation:shimmer 1.4s ease infinite}
          .card{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);transition:border-color .2s}
          .stat-card{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);transition:all .25s ease}
          .stat-card:hover{border-color:rgba(255,255,255,.15);background:rgba(255,255,255,.04);transform:translateY(-1px)}
          .rec-card{border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);transition:all .2s ease}
          .rec-card:hover{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.04)}
          .order-card{border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);transition:border-color .2s}
          .order-card:hover{border-color:rgba(255,255,255,.12)}
          .quick-card{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);transition:all .2s;text-align:left;cursor:pointer}
          .quick-card:hover{border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.05);transform:translateY(-1px)}
          .btn-ai{background:white;color:#0a0a0a;transition:all .2s;font-family:'DM Sans',sans-serif}
          .btn-ai:hover:not(:disabled){background:#e8e8e8;transform:translateY(-1px)}
          .btn-ai:disabled{opacity:.4;cursor:not-allowed}
          .btn-ghost{border:1px solid rgba(255,255,255,.1);transition:all .2s;font-family:'DM Sans',sans-serif}
          .btn-ghost:hover{border-color:rgba(255,255,255,.25);background:rgba(255,255,255,.04)}
          .btn-confirm{background:rgba(16,185,129,.15);color:#34d399;border:1px solid rgba(16,185,129,.25);transition:all .2s}
          .btn-confirm:hover{background:rgba(16,185,129,.25)}
          .btn-cancel{background:rgba(239,68,68,.12);color:#f87171;border:1px solid rgba(239,68,68,.2);transition:all .2s}
          .btn-cancel:hover{background:rgba(239,68,68,.22)}
          .btn-dispatch{background:rgba(139,92,246,.15);color:#a78bfa;border:1px solid rgba(139,92,246,.25);transition:all .2s}
          .btn-dispatch:hover{background:rgba(139,92,246,.25)}
          .btn-deliver{background:rgba(16,185,129,.15);color:#34d399;border:1px solid rgba(16,185,129,.25);transition:all .2s}
          .btn-deliver:hover{background:rgba(16,185,129,.25)}
          .nav-blur{backdrop-filter:blur(20px);background:rgba(10,10,10,.85);border-bottom:1px solid rgba(255,255,255,.06)}
          .grid-bg{background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px}
          .scrollbar-dark::-webkit-scrollbar{width:4px}
          .scrollbar-dark::-webkit-scrollbar-track{background:transparent}
          .scrollbar-dark::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
          .divider{width:1px;height:16px;background:rgba(255,255,255,.1)}
        `}</style>

        <div className="fixed inset-0 grid-bg pointer-events-none opacity-60" />

        {/* Nav */}
        <nav className="sticky top-0 z-50 nav-blur px-6 py-3.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center shrink-0">
                <span className="text-[#0a0a0a] text-xs font-bold font-body">R</span>
              </div>
              <div>
                <p className="font-body font-medium text-white text-sm leading-tight">{bizName}</p>
                <p className="font-body text-xs text-gray-600 leading-tight">Owner Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" style={{ animation: "pulseDot 2s ease infinite" }} />
                <span className="font-body text-xs text-gray-500">Live</span>
              </div>
              <button onClick={() => router.push(`/catalog?bizId=${BIZ_ID}`)}
                className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="12" y1="12" x2="12" y2="18"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                Catalog
              </button>
              <button onClick={() => router.push(`/analytics?bizId=${BIZ_ID}`)}
                className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                Analytics
              </button>
              <button onClick={() => router.push("/map")}
                className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg">Map</button>
              <div className="divider" />
              <button onClick={() => router.push(`/customer?bizId=${BIZ_ID}`)}
                className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg">Customer view</button>
              <button onClick={() => router.push("/onboarding")}
                className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg">New shop</button>
              <button onClick={() => router.push("/")}
                className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg">Home</button>
            </div>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6 anim-1">
            {[
              { label: "Total orders", value: orders.length,                                      sub: "all time",                                     color: "text-white" },
              { label: "Pending",      value: pending,                                             sub: pending > 0 ? "needs attention" : "all clear", color: pending > 0 ? "text-amber-400" : "text-emerald-400" },
              { label: "Revenue",      value: `₹${Math.round(revenue).toLocaleString("en-IN")}`,  sub: "non-cancelled",                                color: "text-emerald-400" },
            ].map(s => (
              <div key={s.label} className="stat-card rounded-2xl p-5">
                <p className="font-body text-xs text-gray-500 mb-2">{s.label}</p>
                <p className={`font-display text-4xl ${s.color} mb-1`}>{s.value}</p>
                <p className="font-body text-xs text-gray-600">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-3 mb-6 anim-1">
            {[
              { label: "Manage catalog", sub: "Add, edit, delete products", path: `/catalog?bizId=${BIZ_ID}`, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/></svg>, color: "text-blue-400" },
              { label: "View analytics", sub: "Top products, revenue trends", path: `/analytics?bizId=${BIZ_ID}`, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, color: "text-violet-400" },
              { label: "Customer storefront", sub: "See your shop as a customer", path: `/customer?bizId=${BIZ_ID}`, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>, color: "text-emerald-400" },
            ].map(q => (
              <button key={q.path} onClick={() => router.push(q.path)} className="quick-card rounded-xl p-4">
                <div className={`mb-2 ${q.color}`}>{q.icon}</div>
                <p className="font-body text-sm text-white font-medium mb-0.5">{q.label}</p>
                <p className="font-body text-xs text-gray-600">{q.sub}</p>
              </button>
            ))}
          </div>

          {/* Row 1: AI Recommendations + Order Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* AI Stock Recommendations */}
            <div className="card rounded-2xl p-6 anim-2">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-display text-xl text-white mb-0.5">AI Stock Recommendations</h2>
                  <p className="font-body text-xs text-gray-500">Live news · season · your customer profile</p>
                </div>
                <button onClick={fetchRecs} disabled={loadingRecs}
                  className="btn-ai text-xs font-medium px-4 py-2 rounded-xl shrink-0 flex items-center gap-2">
                  {loadingRecs ? (
                    <>
                      <svg className="spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Analysing...
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                      </svg>
                      Get AI advice
                    </>
                  )}
                </button>
              </div>

              {recError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 font-body text-xs rounded-xl p-3 mb-4">{recError}</div>
              )}

              {loadingRecs && (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="rounded-xl overflow-hidden h-20">
                      <div className="shimmer-box w-full h-full" />
                    </div>
                  ))}
                  <p className="font-body text-xs text-gray-600 text-center pt-1">Searching market conditions...</p>
                </div>
              )}

              {!loadingRecs && recs.length === 0 && !recError && (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <p className="font-body text-sm text-gray-500">Click "Get AI advice" to see</p>
                  <p className="font-body text-sm text-gray-600">what to stock this week</p>
                </div>
              )}

              {!loadingRecs && recs.length > 0 && (
                <div className="space-y-2.5">
                  {recs.map((r, i) => {
                    const uc = urgencyConfig[r.urgency];
                    return (
                      <div key={i} className="rec-card rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-body font-medium text-sm text-white leading-snug">{r.product}</p>
                          <span className={`font-body text-xs px-2.5 py-0.5 rounded-full shrink-0 flex items-center gap-1.5 ${uc.cls}`}>
                            <span className={`w-1 h-1 rounded-full ${uc.dot}`} />{r.urgency}
                          </span>
                        </div>
                        <p className="font-body text-xs text-gray-500 leading-relaxed mb-2">{r.reason}</p>
                        <p className="font-body text-xs text-gray-700">#{r.category}</p>
                      </div>
                    );
                  })}
                  <p className="font-body text-xs text-gray-700 text-center pt-1">Powered by Llama 3.3</p>
                </div>
              )}
            </div>

            {/* Order Queue */}
            <div className="card rounded-2xl p-6 anim-3">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-xl text-white mb-0.5">Order Queue</h2>
                  <p className="font-body text-xs text-gray-500">Incoming customer orders</p>
                </div>
                <button onClick={fetchOrders}
                  className="btn-ghost font-body text-xs text-gray-500 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  Refresh
                </button>
              </div>

              {loadingOrders && (
                <div className="space-y-3">
                  {[1,2].map(i => (
                    <div key={i} className="rounded-xl overflow-hidden h-24">
                      <div className="shimmer-box w-full h-full" />
                    </div>
                  ))}
                </div>
              )}

              {!loadingOrders && orders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                  </div>
                  <p className="font-body text-sm text-gray-500 mb-1">No orders yet</p>
                  <button onClick={() => router.push(`/customer?bizId=${BIZ_ID}`)}
                    className="font-body text-xs text-gray-600 underline hover:text-gray-400 transition-colors">
                    Place a test order from customer view
                  </button>
                </div>
              )}

              {!loadingOrders && orders.length > 0 && (
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto scrollbar-dark pr-1">
                  {orders.map(order => {
                    const total = order.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
                    const sc = statusConfig[order.status] || { cls: "bg-white/8 text-gray-400 border border-white/10", label: order.status };
                    return (
                      <div key={order.id} className="order-card rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-body font-medium text-sm text-white">{order.customerName}</p>
                          <span className={`font-body text-xs px-2.5 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                        </div>
                        <p className="font-body text-xs text-gray-600 mb-1">{order.address}</p>
                        <p className="font-body text-xs text-gray-600 mb-3 leading-relaxed">
                          {order.items.map(i => `${i.product.name} ×${i.quantity}`).join(", ")}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="font-display text-lg text-white">₹{Math.round(total).toLocaleString("en-IN")}</p>
                          <div className="flex gap-2">
                            {order.status === "pending" && (<>
                              <button onClick={() => updateStatus(order.id, "confirmed")} disabled={updatingOrder === order.id}
                                className="btn-confirm font-body text-xs px-3 py-1.5 rounded-lg disabled:opacity-40">Confirm</button>
                              <button onClick={() => updateStatus(order.id, "cancelled")} disabled={updatingOrder === order.id}
                                className="btn-cancel font-body text-xs px-3 py-1.5 rounded-lg disabled:opacity-40">Cancel</button>
                            </>)}
                            {order.status === "confirmed" && (
                              <button onClick={() => updateStatus(order.id, "dispatched")} disabled={updatingOrder === order.id}
                                className="btn-dispatch font-body text-xs px-3 py-1.5 rounded-lg disabled:opacity-40">Dispatch</button>
                            )}
                            {order.status === "dispatched" && (
                              <button onClick={() => updateStatus(order.id, "delivered")} disabled={updatingOrder === order.id}
                                className="btn-deliver font-body text-xs px-3 py-1.5 rounded-lg disabled:opacity-40">Delivered</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: AI Strategy Panel (full width) */}
          <div className="mb-6 anim-4">
            <AIStrategyPanel bizId={BIZ_ID} />
          </div>

          {/* Row 3: Voice Agent Panel (full width) */}
          <div className="anim-4">
            <VoiceAgentPanel bizId={BIZ_ID} onOrderUpdate={fetchOrders} />
          </div>

        </div>
      </div>

      {/* Floating AI Chat */}
      <AIChat bizId={BIZ_ID} page="dashboard" />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
