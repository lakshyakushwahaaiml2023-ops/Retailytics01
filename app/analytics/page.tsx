"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AIChat from "@/components/AIChat";

type TopProduct = {
  name: string;
  totalQty: number;
  totalRevenue: number;
};

type StatusRow = {
  status: string;
  count: number;
};

type RevenueItem = {
  name: string;
  revenue: number;
};

type AnalyticsData = {
  totalRevenue: number;
  totalOrders: number;
  totalItemsSold: number;
  avgOrderValue: number;
  statusBreakdown: StatusRow[];
  topProducts: TopProduct[];
  revenueByProduct: RevenueItem[];
};

const statusColors: Record<string, string> = {
  pending:     "#fbbf24",
  confirmed:   "#60a5fa",
  dispatched: "#a78bfa",
  delivered:   "#34d399",
  cancelled:   "#f87171",
};

function AnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const BIZ_ID = searchParams.get("bizId") || "demo-biz";

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bizName, setBizName] = useState("My Shop");

  useEffect(() => {
    fetch(`/api/business/latest?all=true`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          const biz = d.find((b: any) => b.id === BIZ_ID);
          if (biz) setBizName(biz.name);
        }
      });

    fetch(`/api/analytics?bizId=${BIZ_ID}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [BIZ_ID]);

  const maxQty = data ? Math.max(...data.topProducts.map((p) => p.totalQty), 1) : 1;
  const maxRevenue = data ? Math.max(...data.revenueByProduct.map((p) => p.revenue), 1) : 1;
  const totalStatusCount = data ? data.statusBreakdown.reduce((s, r) => s + r.count, 0) : 0;

  return (
    <>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
          .font-display{font-family:'Instrument Serif',serif}
          .font-body{font-family:'DM Sans',sans-serif}
          @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
          @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
          @keyframes barGrow{from{width:0}to{width:var(--w)}}
          .anim-1{animation:fadeUp .5s .05s ease both}
          .anim-2{animation:fadeUp .5s .15s ease both}
          .anim-3{animation:fadeUp .5s .25s ease both}
          .anim-4{animation:fadeUp .5s .35s ease both}
          .shimmer-box{background:linear-gradient(90deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 100%);background-size:400px 100%;animation:shimmer 1.4s ease infinite}
          .grid-bg{background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px}
          .nav-blur{backdrop-filter:blur(20px);background:rgba(10,10,10,.85);border-bottom:1px solid rgba(255,255,255,.06)}
          .card{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02)}
          .stat-card{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);transition:all .25s}
          .stat-card:hover{border-color:rgba(255,255,255,.15);transform:translateY(-1px)}
          .btn-ghost{border:1px solid rgba(255,255,255,.1);transition:all .2s;font-family:'DM Sans',sans-serif}
          .btn-ghost:hover{border-color:rgba(255,255,255,.25);background:rgba(255,255,255,.04)}
          .bar{height:8px;border-radius:4px;transition:width 1s ease}
          .bar-row:hover .bar{filter:brightness(1.2)}
          .bar-row{transition:background .15s}
          .bar-row:hover{background:rgba(255,255,255,.02);border-radius:8px}
        `}</style>

        <div className="fixed inset-0 grid-bg pointer-events-none opacity-50" />

        <nav className="sticky top-0 z-50 nav-blur px-6 py-3.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/")}
                className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
                <span className="text-[#0a0a0a] text-xs font-bold font-body">R</span>
              </button>
              <div>
                <p className="font-body font-medium text-white text-sm leading-tight">{bizName}</p>
                <p className="font-body text-xs text-gray-600 leading-tight">Analytics</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => router.push(`/dashboard?bizId=${BIZ_ID}`)}
                className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg">
                ← Dashboard
              </button>
              <button onClick={() => router.push(`/catalog?bizId=${BIZ_ID}`)}
                className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg">
                Catalog
              </button>
            </div>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
          {loading && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="rounded-2xl overflow-hidden h-28">
                    <div className="shimmer-box w-full h-full" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1,2].map((i) => (
                  <div key={i} className="rounded-2xl overflow-hidden h-64">
                    <div className="shimmer-box w-full h-full" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && data && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 anim-1">
                {[
                  { label: "Total revenue",    value: `₹${data.totalRevenue.toLocaleString("en-IN")}`, color: "text-emerald-400", sub: "non-cancelled orders" },
                  { label: "Total orders",     value: data.totalOrders,                                 color: "text-white",       sub: "all time" },
                  { label: "Items sold",       value: data.totalItemsSold,                              color: "text-blue-400",    sub: "units across all orders" },
                  { label: "Avg order value",  value: `₹${data.avgOrderValue.toLocaleString("en-IN")}`, color: "text-violet-400",  sub: "per order" },
                ].map((s) => (
                  <div key={s.label} className="stat-card rounded-2xl p-5">
                    <p className="font-body text-xs text-gray-500 mb-2">{s.label}</p>
                    <p className={`font-display text-3xl ${s.color} mb-1`}>{s.value}</p>
                    <p className="font-body text-xs text-gray-600">{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="card rounded-2xl p-6 anim-2">
                  <div className="mb-5">
                    <h2 className="font-display text-xl text-white mb-0.5">Top selling products</h2>
                    <p className="font-body text-xs text-gray-500">By units sold (non-cancelled orders)</p>
                  </div>

                  {data.topProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="font-body text-sm text-gray-600">No sales data yet</p>
                      <button onClick={() => router.push(`/customer?bizId=${BIZ_ID}`)}
                        className="font-body text-xs text-gray-600 underline mt-2 hover:text-gray-400">
                        Place test orders to see analytics
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.topProducts.map((p, i) => (
                        <div key={p.name} className="bar-row px-1 py-1.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-body text-xs text-gray-600 w-4">{i + 1}</span>
                              <p className="font-body text-sm text-white truncate max-w-[200px]">{p.name}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-body text-xs text-gray-500">
                                ₹{Math.round(p.totalRevenue).toLocaleString("en-IN")}
                              </span>
                              <span className="font-body text-xs text-emerald-400 font-medium w-12 text-right">
                                {p.totalQty} sold
                              </span>
                            </div>
                          </div>
                          <div className="ml-6 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="bar bg-emerald-400/60"
                              style={{
                                width: `${Math.round((p.totalQty / maxQty) * 100)}%`,
                                animation: `barGrow 1s ${i * 0.1}s ease both`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card rounded-2xl p-6 anim-3">
                  <div className="mb-5">
                    <h2 className="font-display text-xl text-white mb-0.5">Revenue by product</h2>
                    <p className="font-body text-xs text-gray-500">Top 6 earners (non-cancelled)</p>
                  </div>

                  {data.revenueByProduct.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="font-body text-sm text-gray-600">No revenue data yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.revenueByProduct.map((p, i) => {
                        const colors = [
                          "bg-violet-400/60", "bg-blue-400/60", "bg-emerald-400/60",
                          "bg-amber-400/60",  "bg-pink-400/60",  "bg-cyan-400/60",
                        ];
                        const pct = Math.round((p.revenue / maxRevenue) * 100);
                        return (
                          <div key={p.name} className="bar-row px-1 py-1.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${colors[i]} opacity-80`} />
                                <p className="font-body text-sm text-white truncate max-w-[200px]">{p.name}</p>
                              </div>
                              <span className="font-body text-xs text-violet-400 font-medium shrink-0">
                                ₹{Math.round(p.revenue).toLocaleString("en-IN")}
                              </span>
                            </div>
                            <div className="ml-4 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className={`bar ${colors[i]}`}
                                style={{
                                  width: `${pct}%`,
                                  animation: `barGrow 1s ${i * 0.1}s ease both`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="card rounded-2xl p-6 anim-4">
                <div className="mb-6">
                  <h2 className="font-display text-xl text-white mb-0.5">Order status breakdown</h2>
                  <p className="font-body text-xs text-gray-500">All orders by current status</p>
                </div>

                {data.statusBreakdown.length === 0 ? (
                  <p className="font-body text-sm text-gray-600 text-center py-8">No orders yet</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {["pending","confirmed","dispatched","delivered","cancelled"].map((status) => {
                      const row = data.statusBreakdown.find((r) => r.status === status);
                      const count = row ? row.count : 0;
                      const pct = totalStatusCount > 0 ? Math.round((count / totalStatusCount) * 100) : 0;
                      const color = statusColors[status] || "#888";
                      return (
                        <div key={status} className="border border-white/6 bg-white/[0.02] rounded-xl p-4 text-center">
                          <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center"
                            style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                          </div>
                          <p className="font-display text-2xl text-white mb-0.5">{count}</p>
                          <p className="font-body text-xs capitalize mb-1" style={{ color }}>{status}</p>
                          <p className="font-body text-xs text-gray-600">{pct}%</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {!loading && data && data.totalOrders === 0 && (
            <div className="mt-6 card rounded-2xl p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6"  y1="20" x2="6"  y2="14"/>
                </svg>
              </div>
              <p className="font-display text-2xl text-white mb-2">No data yet</p>
              <p className="font-body text-sm text-gray-500 mb-5">Place some orders from the customer view to see your analytics.</p>
              <button onClick={() => router.push(`/customer?bizId=${BIZ_ID}`)}
                className="font-body text-sm bg-white text-[#0a0a0a] px-5 py-2.5 rounded-xl font-medium hover:bg-gray-100 transition-colors">
                Go to customer storefront
              </button>
            </div>
          )}
        </div>
      </div>
      <AIChat bizId={BIZ_ID} page="analytics" />
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense>
      <AnalyticsContent />
    </Suspense>
  );
}