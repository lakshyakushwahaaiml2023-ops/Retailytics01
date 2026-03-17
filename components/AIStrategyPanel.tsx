"use client";

import { useState, useCallback } from "react";

type Recommendation = {
  type: "STOCK_UP" | "REMOVE" | "PRICING" | "MARKETING" | "EXPANSION" | "ALERT";
  title: string;
  insight: string;
  action: string;
  impact: "High" | "Medium" | "Low";
  source: "online_data" | "offline_data" | "market_news" | "seasonal" | "inventory";
};

type DataSnapshot = {
  totalOrders: number;
  onlineRevenue: number;
  offlineSales: number;
  offlineRevenue: number;
  lowStockCount: number;
  productCount: number;
};

type Props = { bizId: string };

const typeConfig: Record<string, { label: string; icon: string; cls: string; dot: string }> = {
  STOCK_UP:   { label: "Stock up",   icon: "📦", cls: "bg-blue-500/15 text-blue-400 border border-blue-500/20",        dot: "bg-blue-400" },
  REMOVE:     { label: "Remove",     icon: "🗑",  cls: "bg-red-500/15 text-red-400 border border-red-500/20",           dot: "bg-red-400" },
  PRICING:    { label: "Pricing",    icon: "💰", cls: "bg-amber-500/15 text-amber-400 border border-amber-500/20",      dot: "bg-amber-400" },
  MARKETING:  { label: "Marketing",  icon: "📣", cls: "bg-pink-500/15 text-pink-400 border border-pink-500/20",         dot: "bg-pink-400" },
  EXPANSION:  { label: "Expansion",  icon: "🚀", cls: "bg-violet-500/15 text-violet-400 border border-violet-500/20",   dot: "bg-violet-400" },
  ALERT:      { label: "Alert",      icon: "⚠️", cls: "bg-orange-500/15 text-orange-400 border border-orange-500/20",   dot: "bg-orange-400" },
};

const impactConfig = {
  High:   { cls: "bg-red-500/15 text-red-400 border border-red-500/20" },
  Medium: { cls: "bg-amber-500/15 text-amber-400 border border-amber-500/20" },
  Low:    { cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" },
};

const sourceLabel: Record<string, string> = {
  online_data:  "Online orders",
  offline_data: "Offline sales",
  market_news:  "Live market news",
  seasonal:     "Seasonal trend",
  inventory:    "Inventory data",
};

export default function AIStrategyPanel({ bizId }: Props) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<DataSnapshot | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetchStrategy = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/strategy?bizId=${bizId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecs(data.recommendations || []);
      setSnapshot(data.dataSnapshot || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [bizId]);

  return (
    <div className="card rounded-2xl p-6" style={{ border:"1px solid rgba(255,255,255,.07)", background:"rgba(255,255,255,.02)" }}>
      <style>{`
        .spin{animation:spin .8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .shimmer-box{background:linear-gradient(90deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 100%);background-size:400px 100%;animation:shimmer 1.4s ease infinite}
        .font-display{font-family:'Instrument Serif',serif}
        .font-body{font-family:'DM Sans',sans-serif}
        .rec-card{border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);transition:all .2s;cursor:pointer}
        .rec-card:hover{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.04)}
        .rec-card.open{border-color:rgba(255,255,255,.18)}
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-display text-xl text-white mb-0.5">AI Strategy Advisor</h2>
          <p className="font-body text-xs text-gray-500">
            Live news · your sales data · seasonal trends · inventory
          </p>
        </div>
        <button onClick={fetchStrategy} disabled={loading}
          className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-xl disabled:opacity-40 font-body shrink-0"
          style={{ background:"white", color:"#0a0a0a", transition:"all .2s" }}>
          {loading ? (
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
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              Get strategy
            </>
          )}
        </button>
      </div>

      {/* Data snapshot */}
      {snapshot && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: "Online orders", value: snapshot.totalOrders },
            { label: "Online revenue", value: `₹${snapshot.onlineRevenue.toLocaleString("en-IN")}` },
            { label: "Offline sales", value: snapshot.offlineSales },
            { label: "Offline revenue", value: `₹${snapshot.offlineRevenue.toLocaleString("en-IN")}` },
            { label: "Products", value: snapshot.productCount },
            { label: "Low stock", value: snapshot.lowStockCount, warn: snapshot.lowStockCount > 0 },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ border:"1px solid rgba(255,255,255,.06)", background:"rgba(255,255,255,.02)" }}>
              <p className="font-body text-xs text-gray-600 mb-0.5">{s.label}</p>
              <p className={`font-body text-sm font-medium ${(s as any).warn ? "text-amber-400" : "text-white"}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 font-body text-xs rounded-xl p-3 mb-4">{error}</div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-xl overflow-hidden h-20">
              <div className="shimmer-box w-full h-full" />
            </div>
          ))}
          <p className="font-body text-xs text-gray-600 text-center">Searching live market news and analysing your shop data...</p>
        </div>
      )}

      {!loading && recs.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center" style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <p className="font-body text-sm text-gray-500 mb-1">Click "Get strategy" to see</p>
          <p className="font-body text-sm text-gray-600">AI-powered business recommendations</p>
          <div className="mt-4 space-y-1 text-left max-w-xs">
            {["Analyses your online + offline sales", "Reads live market news", "Considers season & local factors", "Checks your inventory levels"].map(t => (
              <div key={t} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-gray-700" />
                <p className="font-body text-xs text-gray-600">{t}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && recs.length > 0 && (
        <div className="space-y-2.5">
          {recs.map((r, i) => {
            const tc = typeConfig[r.type] || typeConfig.STOCK_UP;
            const ic = impactConfig[r.impact];
            const isOpen = expanded === i;
            return (
              <div key={i} className={`rec-card rounded-xl p-4 ${isOpen ? "open" : ""}`}
                onClick={() => setExpanded(isOpen ? null : i)}>
                <div className="flex items-start gap-3">
                  <span style={{ fontSize:"16px", lineHeight:"1.4" }}>{tc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-body font-medium text-white text-sm leading-tight">{r.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`font-body text-xs px-2 py-0.5 rounded-full ${tc.cls}`}>{tc.label}</span>
                        <span className={`font-body text-xs px-2 py-0.5 rounded-full ${ic.cls}`}>{r.impact}</span>
                      </div>
                    </div>
                    <p className="font-body text-xs text-gray-500">{r.insight}</p>

                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-white/6 space-y-2">
                        <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3">
                          <p className="font-body text-xs text-gray-500 mb-1 uppercase tracking-wide">Action</p>
                          <p className="font-body text-sm text-white">{r.action}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                          <p className="font-body text-xs text-gray-600">Source: {sourceLabel[r.source] || r.source}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" className="shrink-0 mt-1 transition-transform" style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </div>
            );
          })}
          <p className="font-body text-xs text-gray-700 text-center pt-1">Based on live web search + your shop data</p>
        </div>
      )}
    </div>
  );
}
