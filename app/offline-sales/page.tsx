"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Product = { id: string; name: string; price: number; stock: number };
type Sale = {
  id: string; productName: string; quantity: number;
  price: number; total: number; note: string;
  soldAt: string; createdAt: string;
};
type Stats = { totalSales: number; totalRevenue: number; totalItems: number };
type TopProduct = { productName: string; qty: number; revenue: number };

function OfflineSalesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const BIZ_ID = searchParams.get("bizId") || "demo-biz";

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSales: 0, totalRevenue: 0, totalItems: 0 });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bizName, setBizName] = useState("My Shop");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");

  const emptyForm = { productId: "", productName: "", quantity: "1", price: "", note: "", soldAt: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetch(`/api/business/latest?all=true`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          const biz = d.find((b: any) => b.id === BIZ_ID);
          if (biz) setBizName(biz.name);
        }
      });
    fetch(`/api/products?bizId=${BIZ_ID}`)
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d : []));
    fetchSales();
  }, [BIZ_ID]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/offline-sales?bizId=${BIZ_ID}`);
      const data = await res.json();
      setSales(data.sales || []);
      setStats(data.stats || { totalSales: 0, totalRevenue: 0, totalItems: 0 });
      setTopProducts(data.topProducts || []);
    } catch (e) {
      console.error("Failed to fetch sales:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setForm(f => ({ ...f, productId, productName: product.name, price: String(product.price) }));
    }
  };

  const handleSave = async () => {
    if (!form.productName || !form.quantity || !form.price) {
      setFormError("Product name, quantity and price are required."); return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/offline-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: BIZ_ID,
          productId: form.productId || null,
          productName: form.productName,
          quantity: Number(form.quantity),
          price: Number(form.price),
          note: form.note,
          soldAt: form.soldAt ? new Date(form.soldAt).toISOString() : new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      setForm(emptyForm);
      setShowForm(false);
      await fetchSales();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch("/api/offline-sales", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchSales();
    setDeleting(null);
  };

  const previewTotal = Number(form.quantity || 0) * Number(form.price || 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        .font-display{font-family:'Instrument Serif',serif}
        .font-body{font-family:'DM Sans',sans-serif}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .anim-1{animation:fadeUp .5s .05s ease both}
        .anim-2{animation:fadeUp .5s .15s ease both}
        .anim-3{animation:fadeUp .5s .25s ease both}
        .shimmer-box{background:linear-gradient(90deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 100%);background-size:400px 100%;animation:shimmer 1.4s ease infinite}
        .grid-bg{background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px}
        .nav-blur{backdrop-filter:blur(20px);background:rgba(10,10,10,.85);border-bottom:1px solid rgba(255,255,255,.06)}
        .card{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02)}
        .sale-row{border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);transition:all .2s}
        .sale-row:hover{border-color:rgba(255,255,255,.12);background:rgba(255,255,255,.04)}
        .stat-card{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);transition:all .25s}
        .stat-card:hover{border-color:rgba(255,255,255,.15);transform:translateY(-1px)}
        .btn-primary{background:white;color:#0a0a0a;transition:all .2s;font-family:'DM Sans',sans-serif}
        .btn-primary:hover:not(:disabled){background:#e8e8e8}
        .btn-primary:disabled{opacity:.4;cursor:not-allowed}
        .btn-ghost{border:1px solid rgba(255,255,255,.1);transition:all .2s;font-family:'DM Sans',sans-serif}
        .btn-ghost:hover{border-color:rgba(255,255,255,.25);background:rgba(255,255,255,.04)}
        .btn-danger{background:rgba(239,68,68,.12);color:#f87171;border:1px solid rgba(239,68,68,.2);transition:all .2s}
        .btn-danger:hover{background:rgba(239,68,68,.22)}
        .input-field{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:white;transition:all .2s;font-family:'DM Sans',sans-serif}
        .input-field:focus{border-color:rgba(255,255,255,.3);outline:none}
        .input-field::placeholder{color:rgba(255,255,255,.2)}
        .select-dark{background:#111;border:1px solid rgba(255,255,255,.1);color:white;font-family:'DM Sans',sans-serif}
        .select-dark:focus{outline:none;border-color:rgba(255,255,255,.3)}
        select option{background:#111}
        .scrollbar-dark::-webkit-scrollbar{width:4px}
        .scrollbar-dark::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
      `}</style>

      <div className="fixed inset-0 grid-bg pointer-events-none opacity-50" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 nav-blur px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <span className="text-[#0a0a0a] text-xs font-bold font-body">R</span>
            </button>
            <div>
              <p className="font-body font-medium text-white text-sm leading-tight">{bizName}</p>
              <p className="font-body text-xs text-gray-600 leading-tight">Offline Sales</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push(`/catalog?bizId=${BIZ_ID}`)}
              className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg">Catalog</button>
            <button onClick={() => router.push(`/dashboard?bizId=${BIZ_ID}`)}
              className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg">← Dashboard</button>
            <button onClick={() => setShowForm(!showForm)}
              className="btn-primary font-body text-xs font-medium px-4 py-1.5 rounded-lg">
              + Record sale
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">

        {/* Add sale form */}
        {showForm && (
          <div className="card rounded-2xl p-6 mb-6 anim-1">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl text-white">Record offline sale</h2>
              <button onClick={() => { setShowForm(false); setForm(emptyForm); setFormError(""); }}
                className="font-body text-gray-500 hover:text-gray-300 text-sm">✕</button>
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 font-body text-xs rounded-xl p-3 mb-4">{formError}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="font-body text-xs text-gray-500 mb-1.5 block">Select from catalog</label>
                <select className="select-dark w-full rounded-xl px-3 py-3 text-sm"
                  value={form.productId}
                  onChange={e => handleProductSelect(e.target.value)}>
                  <option value="">— Pick a product —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-body text-xs text-gray-500 mb-1.5 block">Or type product name *</label>
                <input className="input-field w-full rounded-xl px-4 py-3 text-sm"
                  placeholder="e.g. Tata Salt 1kg"
                  value={form.productName}
                  onChange={e => setForm(f => ({ ...f, productName: e.target.value, productId: "" }))} />
              </div>
              <div>
                <label className="font-body text-xs text-gray-500 mb-1.5 block">Quantity *</label>
                <input className="input-field w-full rounded-xl px-4 py-3 text-sm"
                  type="number" min="1" placeholder="1"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="font-body text-xs text-gray-500 mb-1.5 block">Selling price (₹) *</label>
                <input className="input-field w-full rounded-xl px-4 py-3 text-sm"
                  type="number" min="0" placeholder="0"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <label className="font-body text-xs text-gray-500 mb-1.5 block">Date & time of sale</label>
                <input className="input-field w-full rounded-xl px-4 py-3 text-sm"
                  type="datetime-local"
                  value={form.soldAt}
                  onChange={e => setForm(f => ({ ...f, soldAt: e.target.value }))} />
              </div>
              <div>
                <label className="font-body text-xs text-gray-500 mb-1.5 block">Note (optional)</label>
                <input className="input-field w-full rounded-xl px-4 py-3 text-sm"
                  placeholder="e.g. cash, bulk discount..."
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>

            {form.quantity && form.price && previewTotal > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4">
                <p className="font-body text-sm text-emerald-400">
                  Total: ₹{previewTotal.toLocaleString("en-IN")}
                  <span className="text-emerald-600 ml-2">({form.quantity} × ₹{form.price})</span>
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowForm(false); setForm(emptyForm); setFormError(""); }}
                className="btn-ghost font-body text-sm text-gray-400 px-5 py-2.5 rounded-xl">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary font-body text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-40">
                {saving ? "Saving..." : "Record sale"}
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 anim-1">
          {[
            { label: "Total offline sales", value: stats.totalSales || 0, color: "text-white" },
            { label: "Items sold", value: stats.totalItems || 0, color: "text-blue-400" },
            { label: "Offline revenue", value: `₹${Math.round(stats.totalRevenue || 0).toLocaleString("en-IN")}`, color: "text-emerald-400" },
          ].map(s => (
            <div key={s.label} className="stat-card rounded-2xl p-5">
              <p className="font-body text-xs text-gray-500 mb-2">{s.label}</p>
              <p className={`font-display text-4xl ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales log */}
          <div className="lg:col-span-2 card rounded-2xl overflow-hidden anim-2">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="font-display text-xl text-white">Sales log</h2>
              <button onClick={fetchSales}
                className="btn-ghost font-body text-xs text-gray-500 px-3 py-1.5 rounded-lg">Refresh</button>
            </div>

            {loading && (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="rounded-xl overflow-hidden h-16">
                    <div className="shimmer-box w-full h-full" />
                  </div>
                ))}
              </div>
            )}

            {!loading && sales.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                    <path d="M12 22V12M12 12L8 16M12 12L16 16"/>
                    <path d="M20 16.7A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
                  </svg>
                </div>
                <p className="font-body text-sm text-gray-500 mb-2">No offline sales recorded yet</p>
                <p className="font-body text-xs text-gray-700 mb-4">
                  Record your walk-in cash sales here to track total revenue and get better AI recommendations.
                </p>
                <button onClick={() => setShowForm(true)}
                  className="btn-primary font-body text-xs font-medium px-4 py-2 rounded-xl">
                  Record your first sale
                </button>
              </div>
            )}

            {!loading && sales.length > 0 && (
              <div className="max-h-[500px] overflow-y-auto scrollbar-dark divide-y divide-white/[0.04]">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-3 px-5 py-2.5">
                  <p className="font-body text-xs text-gray-600 col-span-4">Product</p>
                  <p className="font-body text-xs text-gray-600 col-span-2 text-center">Qty</p>
                  <p className="font-body text-xs text-gray-600 col-span-2 text-right">Price</p>
                  <p className="font-body text-xs text-gray-600 col-span-2 text-right">Total</p>
                  <p className="font-body text-xs text-gray-600 col-span-2 text-right">Action</p>
                </div>
                {sales.map((sale, idx) => (
                  <div key={sale.id}
                    className="sale-row grid grid-cols-12 gap-3 px-5 py-3.5 items-center"
                    style={{ animation: `fadeUp .4s ${idx * 0.03}s ease both` }}>
                    <div className="col-span-4">
                      <p className="font-body font-medium text-white text-sm truncate">{sale.productName}</p>
                      <p className="font-body text-xs text-gray-600">
                        {sale.note && <span className="mr-1">{sale.note} ·</span>}
                        {new Date(sale.soldAt || sale.createdAt).toLocaleString("en-IN", {
                          day: "numeric", month: "short",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <p className="font-body text-sm text-gray-400 col-span-2 text-center">×{sale.quantity}</p>
                    <p className="font-body text-sm text-gray-400 col-span-2 text-right">₹{sale.price}</p>
                    <p className="font-display text-base text-white col-span-2 text-right">
                      ₹{Math.round(sale.total).toLocaleString("en-IN")}
                    </p>
                    <div className="col-span-2 flex justify-end">
                      <button onClick={() => handleDelete(sale.id)} disabled={deleting === sale.id}
                        className="btn-danger font-body text-xs px-2.5 py-1 rounded-lg disabled:opacity-40">
                        {deleting === sale.id ? "..." : "Del"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top products */}
          <div className="card rounded-2xl p-5 anim-3">
            <h2 className="font-display text-xl text-white mb-1">Top offline sellers</h2>
            <p className="font-body text-xs text-gray-500 mb-5">By units sold</p>

            {topProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-body text-sm text-gray-600">No data yet</p>
                <p className="font-body text-xs text-gray-700 mt-1">Record sales to see trends</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((p, i) => {
                  const maxQty = topProducts[0]?.qty || 1;
                  const pct = Math.round((p.qty / maxQty) * 100);
                  return (
                    <div key={p.productName}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-xs text-gray-600 w-4">{i + 1}</span>
                          <p className="font-body text-sm text-white truncate max-w-[160px]">{p.productName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-body text-xs text-emerald-400">{p.qty} sold</p>
                          <p className="font-body text-xs text-gray-600">₹{Math.round(p.revenue).toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                      <div className="ml-6 bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-emerald-400/60 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OfflineSalesPage() {
  return <Suspense><OfflineSalesContent /></Suspense>;
}
