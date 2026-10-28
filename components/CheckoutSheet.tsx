"use client";

import { useState, useEffect, useRef } from "react";

type CartItem = {
  product: {
    id: string; name: string; price: number;
    businessId: string; shopName: string; distanceKm?: number;
  };
  quantity: number;
};

type Props = {
  cart: Map<string, CartItem[]>;
  total: number;
  userAddress: string;
  customerName: string;
  customerPhone: string;
  onClose: () => void;
  onSuccess: (orderIds: string[], name: string, phone: string) => void;
};

type PaymentMethod = "upi" | "cod";
type Step = "details" | "qr" | "processing" | "done";

export default function CheckoutSheet({
  cart, total, userAddress, customerName, customerPhone,
  onClose, onSuccess,
}: Props) {
  const [form, setForm] = useState({
    name: customerName || "",
    address: userAddress || "",
    phone: customerPhone || "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [step, setStep] = useState<Step>("details");
  const [qrUrl, setQrUrl] = useState("");
  const [placing, setPlacing] = useState(false);
  const [formError, setFormError] = useState("");

  // Auto-confirm timer for UPI (30s)
  const [autoConfirmIn, setAutoConfirmIn] = useState(30);
  const autoConfirmRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const countdownRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Auto-fill from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("customerProfile");
      if (saved) {
        const p = JSON.parse(saved);
        setForm({
          name: p.name || customerName || "",
          address: p.address || userAddress || "",
          phone: p.phone || customerPhone || "",
        });
      }
    } catch {}
  }, []);

  // When QR step starts — begin auto-confirm countdown
  useEffect(() => {
    if (step !== "qr") return;

    // Build QR
    const upi = `upi://pay?pa=9302139664@ibl&pn=${encodeURIComponent("Retailytics")}&am=${Math.round(total)}&cu=INR&tn=${encodeURIComponent("Retailytics Order")}`;
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upi)}&bgcolor=111827&color=ffffff&qzone=2`);

    // Countdown
    setAutoConfirmIn(30);
    countdownRef.current = setInterval(() => {
      setAutoConfirmIn(c => {
        if (c <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    // Auto-place after 30s
    autoConfirmRef.current = setTimeout(() => {
      placeOrder();
    }, 30000);

    return () => {
      clearTimeout(autoConfirmRef.current);
      clearInterval(countdownRef.current);
    };
  }, [step]);

  const placeOrder = async () => {
    if (placing) return;
    setPlacing(true);
    clearTimeout(autoConfirmRef.current);
    clearInterval(countdownRef.current);
    setStep("processing");

    try {
      const orderIds: string[] = [];
      for (const [shopId, items] of cart) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: form.name,
            address: form.address,
            phone: form.phone,
            businessId: shopId,
            paymentMethod,
            paymentStatus: paymentMethod === "upi" ? "paid" : "pending",
            items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
          }),
        });
        const data = await res.json();
        orderIds.push(data.id);
      }

      setStep("done");
      // Brief success screen, then redirect
      setTimeout(() => {
        onSuccess(orderIds, form.name, form.phone);
      }, 1800);
    } catch {
      setPlacing(false);
      setStep("qr");
      setFormError("Failed to place order. Please try again.");
    }
  };

  const handleProceed = () => {
    if (!form.name.trim() || !form.address.trim()) {
      setFormError("Name and address are required"); return;
    }
    setFormError("");
    if (paymentMethod === "upi") {
      setStep("qr");
    } else {
      placeOrder();
    }
  };

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const progressPct = ((30 - autoConfirmIn) / 30) * 100;

  return (
    <>
      <style>{`
        @keyframes cs-up{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
        @keyframes cs-spin{to{transform:rotate(360deg)}}
        @keyframes cs-pop{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        @keyframes cs-pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes cs-progress{from{width:0%}to{width:100%}}
        .cs-up{animation:cs-up .35s cubic-bezier(0.34,1.56,0.64,1) both}
        .cs-spin{animation:cs-spin .8s linear infinite}
        .cs-pop{animation:cs-pop .5s cubic-bezier(0.34,1.56,0.64,1) both}
        .cs-pulse{animation:cs-pulse 1.5s ease infinite}
        .cs-input{
          width:100%;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.12);
          color:white;border-radius:12px;padding:12px 16px;font-size:14px;
          font-family:'DM Sans',sans-serif;outline:none;transition:all .2s;box-sizing:border-box;
        }
        .cs-input:focus{border-color:rgba(255,255,255,.35);background:rgba(255,255,255,.09)}
        .cs-input::placeholder{color:rgba(255,255,255,.22)}
        .cs-label{font-size:11px;font-weight:600;color:rgba(255,255,255,.4);
          letter-spacing:.06em;text-transform:uppercase;display:block;margin-bottom:6px;
          font-family:'DM Sans',sans-serif}
        .pay-opt{
          border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);
          border-radius:16px;padding:16px;cursor:pointer;transition:all .2s;text-align:left;width:100%;
        }
        .pay-opt:hover{border-color:rgba(255,255,255,.25);background:rgba(255,255,255,.07)}
        .pay-opt.sel{border-color:white;background:rgba(255,255,255,.1)}
        .cs-btn{
          display:flex;align-items:center;justify-content:center;gap:8px;width:100%;
          padding:15px;border-radius:14px;font-size:14px;font-weight:600;cursor:pointer;
          border:none;font-family:'DM Sans',sans-serif;transition:all .2s;
        }
        .cs-btn:disabled{opacity:.45;cursor:not-allowed}
        .cs-btn:hover:not(:disabled){transform:translateY(-1px)}
        .cs-btn-w{background:white;color:#0a0a0a}
        .cs-btn-w:hover:not(:disabled){background:#e8e8e8}
        .cs-btn-g{background:transparent;color:rgba(255,255,255,.5);border:1.5px solid rgba(255,255,255,.1)}
        .cs-btn-g:hover:not(:disabled){border-color:rgba(255,255,255,.3);color:white}
        .cs-scroll::-webkit-scrollbar{width:3px}
        .cs-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
      `}</style>

      {/* Overlay */}
      <div onClick={step === "details" ? onClose : undefined}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", backdropFilter:"blur(6px)", zIndex:50 }} />

      {/* Sheet */}
      <div className="cs-up cs-scroll" style={{
        position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:480, background:"#111827",
        borderRadius:"24px 24px 0 0", zIndex:51, maxHeight:"94vh",
        display:"flex", flexDirection:"column",
        boxShadow:"0 -8px 48px rgba(0,0,0,.6)",
        border:"1px solid rgba(255,255,255,.1)", borderBottom:"none",
        overflowY:"auto", fontFamily:"'DM Sans',sans-serif",
      }}>
        {/* Handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"14px 0 6px", flexShrink:0 }}>
          <div style={{ width:40, height:4, background:"rgba(255,255,255,.15)", borderRadius:100 }} />
        </div>

        {/* Header */}
        {step !== "done" && step !== "processing" && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 20px 16px", borderBottom:"1px solid rgba(255,255,255,.08)", flexShrink:0 }}>
            <div>
              <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:24, color:"white", fontWeight:400 }}>
                {step === "details" ? "Checkout" : "Scan & Pay"}
              </h2>
              <p style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2 }}>
                {cart.size} shop{cart.size > 1 ? "s" : ""} · {fmt(total)}
              </p>
            </div>
            {step === "details" && (
              <button onClick={onClose} style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.1)", cursor:"pointer", color:"rgba(255,255,255,.6)", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            )}
          </div>
        )}

        <div style={{ padding:"20px 20px 36px" }}>

          {/* ── DETAILS ── */}
          {step === "details" && (
            <div>
              {/* Summary */}
              <div style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:16, padding:16, marginBottom:20 }}>
                {Array.from(cart.entries()).map(([_, items]) => (
                  <div key={_} style={{ marginBottom:10 }}>
                    <p style={{ fontSize:11, color:"rgba(255,255,255,.3)", fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>
                      {items[0].product.shopName}
                    </p>
                    {items.map(item => (
                      <div key={item.product.id} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:13, color:"rgba(255,255,255,.7)" }}>{item.product.name} ×{item.quantity}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:"white" }}>{fmt(item.product.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{ borderTop:"1px solid rgba(255,255,255,.1)", paddingTop:12, display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:4 }}>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>Total</span>
                  <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:26, color:"white" }}>{fmt(total)}</span>
                </div>
              </div>

              {formError && (
                <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", borderRadius:12, padding:"10px 14px", marginBottom:16 }}>
                  <p style={{ fontSize:13, color:"#f87171" }}>{formError}</p>
                </div>
              )}

              <div style={{ marginBottom:14 }}>
                <label className="cs-label">Your name *</label>
                <input className="cs-input" placeholder="Enter your name" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ marginBottom:14 }}>
                <label className="cs-label">Delivery address *</label>
                <input className="cs-input" placeholder="Enter delivery address" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div style={{ marginBottom:20 }}>
                <label className="cs-label">Phone number</label>
                <input className="cs-input" placeholder="+91 XXXXXXXXXX" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>

              <div style={{ marginBottom:20 }}>
                <label className="cs-label">Payment method</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <button className={`pay-opt ${paymentMethod === "upi" ? "sel" : ""}`}
                    onClick={() => setPaymentMethod("upi")}>
                    <div style={{ fontSize:26, marginBottom:6 }}>💸</div>
                    <p style={{ fontSize:13, fontWeight:600, color:"white", marginBottom:2 }}>UPI / QR</p>
                    <p style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>PhonePe · GPay · Paytm</p>
                    {paymentMethod === "upi" && <div style={{ marginTop:6, fontSize:11, color:"#4ade80", fontWeight:600 }}>✓ Selected</div>}
                  </button>
                  <button className={`pay-opt ${paymentMethod === "cod" ? "sel" : ""}`}
                    onClick={() => setPaymentMethod("cod")}>
                    <div style={{ fontSize:26, marginBottom:6 }}>💵</div>
                    <p style={{ fontSize:13, fontWeight:600, color:"white", marginBottom:2 }}>Cash</p>
                    <p style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>Pay on delivery</p>
                    {paymentMethod === "cod" && <div style={{ marginTop:6, fontSize:11, color:"#4ade80", fontWeight:600 }}>✓ Selected</div>}
                  </button>
                </div>
              </div>

              <button className="cs-btn cs-btn-w" onClick={handleProceed}>
                {paymentMethod === "upi" ? "Scan QR to Pay →" : `Place Order · ${fmt(total)}`}
              </button>
            </div>
          )}

          {/* ── QR SCREEN ── */}
          {step === "qr" && (
            <div style={{ textAlign:"center" }}>
              {/* Progress bar auto-confirm */}
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>Auto-confirming in</span>
                  <span style={{ fontSize:13, fontWeight:600, color: autoConfirmIn <= 10 ? "#4ade80" : "#fbbf24" }}>
                    {autoConfirmIn}s
                  </span>
                </div>
                <div style={{ height:4, background:"rgba(255,255,255,.1)", borderRadius:100, overflow:"hidden" }}>
                  <div style={{
                    height:"100%",
                    width:`${progressPct}%`,
                    background: autoConfirmIn <= 10 ? "#4ade80" : "#fbbf24",
                    borderRadius:100,
                    transition:"width .5s linear, background .3s",
                  }} />
                </div>
                <p style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:6 }}>
                  Your order will be placed automatically after payment
                </p>
              </div>

              {/* Amount */}
              <div style={{ background:"rgba(255,210,0,.1)", border:"1.5px solid rgba(255,210,0,.3)", borderRadius:20, padding:"16px 24px", marginBottom:20 }}>
                <p style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginBottom:4 }}>Pay to: 9302139664@ibl</p>
                <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:44, color:"white" }}>{fmt(total)}</p>
              </div>

              {/* QR Code */}
              <div style={{ background:"white", borderRadius:20, padding:14, marginBottom:16, display:"inline-block", boxShadow:"0 4px 24px rgba(0,0,0,.5)" }}>
                <img src={qrUrl} alt="UPI QR"
                  style={{ width:240, height:240, display:"block" }}
                  onError={e => {
                    const upi = `upi://pay?pa=9302139664@ibl&am=${Math.round(total)}&cu=INR`;
                    (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upi)}`;
                  }}
                />
              </div>

              <p style={{ fontSize:13, color:"rgba(255,255,255,.5)", marginBottom:20 }}>
                Scan with <strong style={{ color:"white" }}>PhonePe, GPay, Paytm</strong> or any UPI app
              </p>

              {/* UPI apps */}
              <div style={{ display:"flex", justifyContent:"center", gap:16, marginBottom:24 }}>
                {[{e:"📱",n:"PhonePe"},{e:"🟡",n:"GPay"},{e:"🔵",n:"Paytm"},{e:"🏦",n:"BHIM"}].map(a => (
                  <div key={a.n} style={{ textAlign:"center" }}>
                    <div style={{ width:44, height:44, borderRadius:14, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, marginBottom:4 }}>{a.e}</div>
                    <p style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>{a.n}</p>
                  </div>
                ))}
              </div>

              {/* Manual confirm button */}
              <button className="cs-btn cs-btn-w" onClick={placeOrder} disabled={placing}
                style={{ marginBottom:10 }}>
                {placing ? "Processing..." : "✓ Done — Confirm my order"}
              </button>
              <button className="cs-btn cs-btn-g" onClick={() => {
                clearTimeout(autoConfirmRef.current);
                clearInterval(countdownRef.current);
                setStep("details");
              }}>
                ← Back
              </button>
            </div>
          )}

          {/* ── PROCESSING ── */}
          {step === "processing" && (
            <div style={{ textAlign:"center", padding:"48px 0" }}>
              <svg className="cs-spin" width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin:"0 auto 24px" }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.1)" strokeWidth="3"/>
                <path fill="white" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <h3 style={{ fontFamily:"'Instrument Serif',serif", fontSize:26, color:"white", marginBottom:8 }}>
                Placing your order...
              </h3>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.4)" }}>
                Notifying shop owner
              </p>
            </div>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div style={{ textAlign:"center", padding:"40px 0" }}>
              <div className="cs-pop" style={{ fontSize:80, marginBottom:20 }}>🎉</div>
              <h3 style={{ fontFamily:"'Instrument Serif',serif", fontSize:32, color:"white", marginBottom:8 }}>
                Order placed!
              </h3>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.5)", marginBottom:20 }}>
                {paymentMethod === "upi" ? "Payment received · " : ""}
                The shop has been notified
              </p>
              <div style={{ background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.25)", borderRadius:16, padding:"12px 20px" }}>
                <p style={{ fontSize:14, color:"#4ade80" }}>
                  ✓ Redirecting to your orders...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
