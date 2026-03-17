"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AIChat from "@/components/AIChat";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
};

function CatalogManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const BIZ_ID = searchParams.get("bizId") || "demo-biz";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [bizName, setBizName] = useState("My Shop");
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const emptyForm = { name: "", price: "", stock: "", image: "" };
  const [form, setForm] = useState(emptyForm);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    fetch(`/api/business/latest?all=true`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const biz = data.find((b: any) => b.id === BIZ_ID);
          if (biz) setBizName(biz.name);
        }
      });
    fetchProducts();
  }, [BIZ_ID]);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await fetch(`/api/products?bizId=${BIZ_ID}`);
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ name: p.name, price: String(p.price), stock: String(p.stock), image: p.image || "" });
    setImagePreview(p.image || "");
    setFormError("");
    setShowAdd(false);
  };

  const openAdd = () => {
    setEditProduct(null);
    setForm(emptyForm);
    setImagePreview("");
    setFormError("");
    setShowAdd(true);
  };

  const closePanel = () => {
    setShowAdd(false);
    setEditProduct(null);
    setFormError("");
    setImagePreview("");
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setForm(f => ({ ...f, image: data.url }));
      setImagePreview(data.url);
    } catch (e: any) {
      setFormError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { setFormError("Name and price are required."); return; }
    setSaving(true);
    try {
      if (editProduct) {
        await fetch("/api/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editProduct.id, name: form.name,
            price: Number(form.price), stock: Number(form.stock) || 0,
            image: form.image,
          }),
        });
      } else {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name, price: Number(form.price),
            stock: Number(form.stock) || 0, image: form.image,
            businessId: BIZ_ID,
          }),
        });
      }
      closePanel();
      await fetchProducts();
    } catch {
      setFormError("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchProducts();
    setDeleting(null);
  };

  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const lowStock = products.filter(p => p.stock <= 5).length;
  const panelOpen = showAdd || !!editProduct;

  return (
    <>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
          .font-display{font-family:'Instrument Serif',serif}
          .font-body{font-family:'DM Sans',sans-serif}
          @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
          @keyframes slideIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
          @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
          .anim-1{animation:fadeUp .5s .05s ease both}
          .anim-2{animation:fadeUp .5s .15s ease both}
          .shimmer-box{background:linear-gradient(90deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 100%);background-size:400px 100%;animation:shimmer 1.4s ease infinite}
          .grid-bg{background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px}
          .nav-blur{backdrop-filter:blur(20px);background:rgba(10,10,10,.85);border-bottom:1px solid rgba(255,255,255,.06)}
          .card{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02)}
          .product-row{border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);transition:all .2s}
          .product-row:hover{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.04)}
          .stat-card{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);transition:all .25s}
          .stat-card:hover{border-color:rgba(255,255,255,.15);transform:translateY(-1px)}
          .btn-primary{background:white;color:#0a0a0a;transition:all .2s;font-family:'DM Sans',sans-serif}
          .btn-primary:hover:not(:disabled){background:#e8e8e8;transform:translateY(-1px)}
          .btn-primary:disabled{opacity:.4;cursor:not-allowed}
          .btn-ghost{border:1px solid rgba(255,255,255,.1);transition:all .2s;font-family:'DM Sans',sans-serif}
          .btn-ghost:hover{border-color:rgba(255,255,255,.25);background:rgba(255,255,255,.04)}
          .btn-danger{background:rgba(239,68,68,.12);color:#f87171;border:1px solid rgba(239,68,68,.2);transition:all .2s}
          .btn-danger:hover{background:rgba(239,68,68,.22)}
          .btn-edit{background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.1);transition:all .2s}
          .btn-edit:hover{background:rgba(255,255,255,.1);color:white}
          .side-panel{border-left:1px solid rgba(255,255,255,.07);background:#0d0d0d;animation:slideIn .3s ease both}
          .input-field{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:white;transition:all .2s;font-family:'DM Sans',sans-serif}
          .input-field:focus{border-color:rgba(255,255,255,.3);outline:none;box-shadow:0 0 0 3px rgba(255,255,255,.04)}
          .input-field::placeholder{color:rgba(255,255,255,.2)}
          .stock-low{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:#f87171}
          .stock-ok{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);color:#34d399}
          .stock-mid{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);color:#fbbf24}
          .upload-zone{border:2px dashed rgba(255,255,255,.15);transition:all .2s;cursor:pointer}
          .upload-zone:hover{border-color:rgba(255,255,255,.35);background:rgba(255,255,255,.03)}
          .upload-zone.drag{border-color:white;background:rgba(255,255,255,.06)}
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
                <p className="font-body text-xs text-gray-600 leading-tight">Product Catalog</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => router.push(`/offline-sales?bizId=${BIZ_ID}`)}
                className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22V12M12 12L8 16M12 12L16 16"/>
                  <path d="M20 16.7A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
                </svg>
                Offline Sales
              </button>
              <button onClick={() => router.push(`/dashboard?bizId=${BIZ_ID}`)}
                className="btn-ghost font-body text-xs text-gray-400 px-3 py-1.5 rounded-lg">← Dashboard</button>
              <button onClick={openAdd} className="btn-primary font-body text-xs font-medium px-4 py-1.5 rounded-lg">+ Add product</button>
            </div>
          </div>
        </nav>

        <div className={`relative z-10 transition-all duration-300 ${panelOpen ? "mr-[400px]" : ""}`}>
          <div className="max-w-6xl mx-auto px-6 py-8">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 anim-1">
              {[
                { label: "Total products", value: products.length, color: "text-white" },
                { label: "Low stock (≤5)", value: lowStock, color: lowStock > 0 ? "text-red-400" : "text-emerald-400" },
                { label: "Inventory value", value: `₹${Math.round(totalValue).toLocaleString("en-IN")}`, color: "text-emerald-400" },
              ].map(s => (
                <div key={s.label} className="stat-card rounded-2xl p-5">
                  <p className="font-body text-xs text-gray-500 mb-2">{s.label}</p>
                  <p className={`font-display text-4xl ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Product list */}
            <div className="card rounded-2xl overflow-hidden anim-2">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h2 className="font-display text-xl text-white">Products</h2>
                <span className="font-body text-xs text-gray-600">{products.length} items</span>
              </div>

              {loading && (
                <div className="p-4 space-y-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="rounded-xl overflow-hidden h-16">
                      <div className="shimmer-box w-full h-full" />
                    </div>
                  ))}
                </div>
              )}

              {!loading && products.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="font-body text-sm text-gray-500 mb-3">No products yet</p>
                  <button onClick={openAdd} className="btn-primary font-body text-xs font-medium px-4 py-2 rounded-lg">
                    Add your first product
                  </button>
                </div>
              )}

              {!loading && products.length > 0 && (
                <div className="divide-y divide-white/[0.04]">
                  <div className="grid grid-cols-12 gap-4 px-5 py-2.5">
                    <p className="font-body text-xs text-gray-600 col-span-5">Product</p>
                    <p className="font-body text-xs text-gray-600 col-span-2 text-right">Price</p>
                    <p className="font-body text-xs text-gray-600 col-span-2 text-center">Stock</p>
                    <p className="font-body text-xs text-gray-600 col-span-3 text-right">Actions</p>
                  </div>
                  {products.map((product, idx) => {
                    const stockClass = product.stock <= 5 ? "stock-low" : product.stock <= 15 ? "stock-mid" : "stock-ok";
                    const isEditing = editProduct?.id === product.id;
                    return (
                      <div key={product.id}
                        className={`product-row grid grid-cols-12 gap-4 px-5 py-3.5 items-center ${isEditing ? "border-l-2 border-white/30" : ""}`}
                        style={{ animation: `fadeUp .4s ${idx * 0.04}s ease both` }}>
                        <div className="col-span-5 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/8 bg-white/[0.03] flex items-center justify-center">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={e => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                  (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("style");
                                }}
                              />
                            ) : null}
                            <span style={{ fontSize: "22px", display: product.image ? "none" : "block" }}>
                              📦
                            </span>
                          </div>
                          <p className="font-body text-sm text-white leading-tight">{product.name}</p>
                        </div>
                        <p className="font-display text-base text-white col-span-2 text-right">
                          ₹{product.price.toLocaleString("en-IN")}
                        </p>
                        <div className="col-span-2 flex justify-center">
                          <span className={`font-body text-xs px-2 py-0.5 rounded-full ${stockClass}`}>
                            {product.stock} left
                          </span>
                        </div>
                        <div className="col-span-3 flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(product)} className="btn-edit font-body text-xs px-3 py-1.5 rounded-lg">Edit</button>
                          <button onClick={() => handleDelete(product.id)} disabled={deleting === product.id}
                            className="btn-danger font-body text-xs px-3 py-1.5 rounded-lg disabled:opacity-40">
                            {deleting === product.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side panel */}
        {panelOpen && (
          <div className="fixed top-0 right-0 bottom-0 w-[400px] z-40 side-panel flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
              <h3 className="font-display text-xl text-white">{editProduct ? "Edit product" : "Add product"}</h3>
              <button onClick={closePanel} className="font-body text-gray-500 hover:text-gray-300 text-sm">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 font-body text-xs rounded-xl p-3">
                  {formError}
                </div>
              )}

              {/* Image upload */}
              <div>
                <label className="font-body text-xs text-gray-500 mb-1.5 block">Product image</label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-white/10" />
                    <button onClick={() => { setImagePreview(""); setForm(f => ({ ...f, image: "" })); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80">✕</button>
                  </div>
                ) : (
                  <div className="upload-zone rounded-xl p-6 text-center"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("drag"); }}
                    onDragLeave={e => e.currentTarget.classList.remove("drag")}
                    onDrop={e => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("drag");
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleImageUpload(f);
                    }}>
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <svg className="animate-spin h-6 w-6 text-gray-500" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        <p className="font-body text-xs text-gray-500">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" className="mx-auto mb-2">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <path d="m21 15-5-5L5 21"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                        </svg>
                        <p className="font-body text-xs text-gray-500">Click or drag to upload</p>
                        <p className="font-body text-xs text-gray-700 mt-1">JPG, PNG, WEBP · max 5MB</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="font-body text-xs text-gray-500 mb-1.5 block">Product name *</label>
                <input className="input-field w-full rounded-xl px-4 py-3 text-sm" placeholder="e.g. Basmati Rice 5kg"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-body text-xs text-gray-500 mb-1.5 block">Price (₹) *</label>
                  <input className="input-field w-full rounded-xl px-4 py-3 text-sm" placeholder="0" type="number" min="0"
                    value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <label className="font-body text-xs text-gray-500 mb-1.5 block">Stock qty</label>
                  <input className="input-field w-full rounded-xl px-4 py-3 text-sm" placeholder="0" type="number" min="0"
                    value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                </div>
              </div>

              {form.stock && (
                <div className={`rounded-xl p-3 font-body text-xs ${
                  Number(form.stock) <= 5
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : Number(form.stock) <= 15
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}>
                  {Number(form.stock) <= 5
                    ? "⚠ Low stock — AI will flag this"
                    : Number(form.stock) <= 15
                    ? "Moderate stock — consider restocking soon"
                    : "Good stock level"}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-white/6 flex gap-3">
              <button onClick={closePanel} className="btn-ghost font-body text-sm text-gray-400 px-4 py-2.5 rounded-xl flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving || uploading}
                className="btn-primary font-body text-sm font-medium px-4 py-2.5 rounded-xl flex-1 disabled:opacity-40">
                {saving ? "Saving..." : editProduct ? "Save changes" : "Add product"}
              </button>
            </div>
          </div>
        )}
      </div>

      <AIChat bizId={BIZ_ID} page="catalog" />
    </>
  );
}

export default function CatalogPage() {
  return <Suspense><CatalogManager /></Suspense>;
}
