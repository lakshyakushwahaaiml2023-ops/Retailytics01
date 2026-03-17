"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const steps = ["Basic Info", "Customer Profile", "Operations"];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", type: "", city: "", locality: "",
    areaType: "", customerAgeRange: "",
    deliveryRadius: "", operatingHours: "",
    phone: "", lat: "", lng: "",
  });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const validateStep = () => {
    if (step === 0 && (!form.name || !form.type || !form.city || !form.locality)) {
      setError("Please fill all fields to continue."); return false;
    }
    if (step === 1 && (!form.areaType || !form.customerAgeRange)) {
      setError("Please select both fields to continue."); return false;
    }
    if (step === 2 && !form.deliveryRadius) {
      setError("Please enter delivery radius."); return false;
    }
    if (step === 2 && !form.phone) {
      setError("Please enter your phone number."); return false;
    }
    return true;
  };

  const next = () => { if (validateStep()) { setError(""); setStep(s => s + 1); } };
  const back = () => { setError(""); setStep(s => s - 1); };

  const getLiveLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setForm(p => ({ ...p, lat: String(lat), lng: String(lng) }));
        // Reverse geocode to get locality
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "User-Agent": "Retailytics/1.0" } }
          );
          const data = await res.json();
          const locality = data.address?.suburb || data.address?.neighbourhood ||
                           data.address?.village || data.address?.town || "";
          const city = data.address?.city || data.address?.county || "";
          if (locality) setForm(p => ({ ...p, locality, city: city || p.city }));
        } catch {}
        setLocating(false);
      },
      () => { setError("Could not get location. Please enter manually."); setLocating(false); }
    );
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          deliveryRadius: Number(form.deliveryRadius),
          operatingHours: form.operatingHours || "9AM-9PM",
          lat: form.lat ? Number(form.lat) : 22.5524,
          lng: form.lng ? Number(form.lng) : 75.7565,
          ownerId: "demo-user",
        }),
      });
      if (!res.ok) throw new Error("Failed to create business");
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-white/30 transition-all duration-200 font-body";
  const labelClass = "block text-xs text-gray-500 mb-1.5 font-body tracking-wide";

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        .font-display{font-family:'Instrument Serif',serif} .font-body{font-family:'DM Sans',sans-serif}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        .anim-up{animation:fadeUp .5s ease both} .anim-in{animation:slideIn .4s ease both}
        .grid-bg{background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px}
        .type-card{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);transition:all .2s;cursor:pointer}
        .type-card:hover{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.06)}
        .type-card.selected{border-color:white;background:rgba(255,255,255,.08)}
        .area-card{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);transition:all .2s;cursor:pointer}
        .area-card:hover{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.06)}
        .area-card.selected{border-color:white;background:rgba(255,255,255,.08)}
        .btn-primary{background:white;color:#0a0a0a;transition:all .2s;font-family:'DM Sans',sans-serif}
        .btn-primary:hover:not(:disabled){background:#e8e8e8;transform:translateY(-1px)}
        .btn-primary:disabled{opacity:.4;cursor:not-allowed}
        .back-btn{border:1px solid rgba(255,255,255,.1);transition:all .2s;font-family:'DM Sans',sans-serif}
        .back-btn:hover{border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.04)}
        select option{background:#111}
      `}</style>

      <div className="fixed inset-0 grid-bg pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(255,255,255,.03) 0%,transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 anim-up">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <span className="text-[#0a0a0a] text-xs font-bold font-body">R</span>
            </div>
            <span className="font-body font-medium text-gray-500 text-sm group-hover:text-white transition-colors">Retailytics</span>
          </button>
        </div>

        {/* Progress */}
        <div className="mb-8 anim-up">
          <div className="flex items-center gap-3 mb-3">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-body font-medium transition-all duration-300 ${i <= step ? "bg-white text-[#0a0a0a]" : "border border-white/15 text-gray-600"}`}>
                    {i < step ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg> : i + 1}
                  </div>
                  <span className={`text-xs font-body transition-colors ${i === step ? "text-white" : "text-gray-600"}`}>{s}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className="h-px w-8 bg-white/10">
                    <div className="h-full bg-white transition-all duration-500" style={{ width: i < step ? "100%" : "0%" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="h-px bg-white/5 w-full">
            <div className="h-full bg-white/40 transition-all duration-500" style={{ width: `${(step / (steps.length - 1)) * 100}%` }} />
          </div>
        </div>

        {/* Card */}
        <div className="border border-white/8 bg-white/[0.02] rounded-3xl p-8 backdrop-blur-sm">

          {/* Step 0: Basic Info */}
          {step === 0 && (
            <div className="anim-in">
              <h1 className="font-display text-3xl text-white mb-1">Tell us about your shop</h1>
              <p className="font-body text-sm text-gray-500 mb-7">Basic details help AI understand your business.</p>
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 mb-5 font-body">{error}</div>}

              <div className="mb-5">
                <label className={labelClass}>Shop name</label>
                <input className={inputClass} placeholder="e.g. Sharma General Store" name="name" value={form.name} onChange={handleChange} />
              </div>

              <div className="mb-5">
                <label className={labelClass}>Business type</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    {val:"grocery",label:"Grocery",icon:"🛒"},{val:"electronics",label:"Electronics",icon:"📱"},
                    {val:"pharmacy",label:"Pharmacy",icon:"💊"},{val:"clothing",label:"Clothing",icon:"👕"},
                    {val:"stationery",label:"Stationery",icon:"📚"},{val:"hardware",label:"Hardware",icon:"🔧"},
                    {val:"restaurant",label:"Food",icon:"🍱"},{val:"other",label:"Other",icon:"🏪"},
                  ].map(t => (
                    <button key={t.val} onClick={() => { setForm(p => ({ ...p, type: t.val })); setError(""); }}
                      className={`type-card rounded-xl p-3 text-center ${form.type === t.val ? "selected" : ""}`}>
                      <div className="text-xl mb-1" style={{ fontSize: "20px" }}>{t.icon}</div>
                      <p className="font-body text-xs text-gray-400">{t.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className={labelClass}>Shop location</label>
                {form.lat && form.lng ? (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-3">
                    <span className="text-emerald-400" style={{ fontSize: "14px" }}>📍</span>
                    <p className="font-body text-xs text-emerald-400 flex-1">
                      {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}
                      {form.locality && ` · ${form.locality}`}
                    </p>
                    <button onClick={() => setForm(p => ({ ...p, lat: "", lng: "" }))} className="text-emerald-700 hover:text-emerald-400 text-xs transition-colors">✕</button>
                  </div>
                ) : (
                  <button onClick={getLiveLocation} disabled={locating}
                    className="area-card w-full rounded-xl px-4 py-3 flex items-center gap-3 mb-3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                    </svg>
                    <div className="flex-1 text-left">
                      <p className="font-body text-sm text-white">{locating ? "Getting location..." : "Use my current location"}</p>
                      <p className="font-body text-xs text-gray-600">Auto-fills city and locality</p>
                    </div>
                    <p className="font-body text-xs text-blue-400/70">Recommended</p>
                  </button>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>City</label>
                    <input className={inputClass} placeholder="e.g. Mhow" name="city" value={form.city} onChange={handleChange} />
                  </div>
                  <div>
                    <label className={labelClass}>Locality / Area</label>
                    <input className={inputClass} placeholder="e.g. Sadar Bazar" name="locality" value={form.locality} onChange={handleChange} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Customer Profile */}
          {step === 1 && (
            <div className="anim-in">
              <h1 className="font-display text-3xl text-white mb-1">Your customers</h1>
              <p className="font-body text-sm text-gray-500 mb-7">Shapes every AI recommendation you get.</p>
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 mb-5 font-body">{error}</div>}

              <div className="mb-6">
                <label className={labelClass}>Area type</label>
                <div className="grid grid-cols-3 gap-3">
                  {[{val:"Urban",label:"Urban",sub:"City, metro"},{val:"Suburban",label:"Suburban",sub:"Town, outskirts"},{val:"Rural",label:"Rural",sub:"Village, semi-urban"}].map(a => (
                    <button key={a.val} onClick={() => { setForm(p => ({ ...p, areaType: a.val })); setError(""); }}
                      className={`area-card rounded-xl p-4 text-left ${form.areaType === a.val ? "selected" : ""}`}>
                      <p className="font-body text-sm text-white mb-0.5">{a.label}</p>
                      <p className="font-body text-xs text-gray-500">{a.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Typical customer age</label>
                <div className="grid grid-cols-1 gap-2">
                  {[{val:"13-20",label:"Teens",sub:"13–20 years"},{val:"18-30",label:"Young adults",sub:"18–30 years"},{val:"25-50",label:"Families",sub:"25–50 years"},{val:"50+",label:"Seniors",sub:"50+ years"},{val:"all",label:"All ages",sub:"Mixed base"}].map(a => (
                    <button key={a.val} onClick={() => { setForm(p => ({ ...p, customerAgeRange: a.val })); setError(""); }}
                      className={`area-card rounded-xl px-4 py-3 flex items-center justify-between ${form.customerAgeRange === a.val ? "selected" : ""}`}>
                      <span className="font-body text-sm text-white">{a.label}</span>
                      <span className="font-body text-xs text-gray-500">{a.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Operations */}
          {step === 2 && (
            <div className="anim-in">
              <h1 className="font-display text-3xl text-white mb-1">Operations</h1>
              <p className="font-body text-sm text-gray-500 mb-7">Final details — delivery, hours, and contact.</p>
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 mb-5 font-body">{error}</div>}

              <div className="mb-5">
                <label className={labelClass}>Owner phone number *</label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-500 font-body">+91</span>
                  <input className={inputClass} placeholder="10-digit mobile number"
                    name="phone" value={form.phone} onChange={handleChange}
                    type="tel" maxLength={10} />
                </div>
                <p className="font-body text-xs text-gray-700 mt-1.5">Our AI will call this number when an order goes unconfirmed.</p>
              </div>

              <div className="mb-5">
                <label className={labelClass}>Delivery radius</label>
                <div className="relative">
                  <input className={inputClass + " pr-12"} placeholder="5" name="deliveryRadius" type="number" min="1" value={form.deliveryRadius} onChange={handleChange} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-body">km</span>
                </div>
              </div>

              <div className="mb-7">
                <label className={labelClass}>Operating hours</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {["9AM–9PM","8AM–10PM","24 hours"].map(h => (
                    <button key={h} onClick={() => setForm(p => ({ ...p, operatingHours: h }))}
                      className={`area-card rounded-xl py-2.5 text-xs font-body text-center ${form.operatingHours === h ? "selected text-white" : "text-gray-500"}`}>{h}</button>
                  ))}
                </div>
                <input className={inputClass} placeholder="Or type custom hours..." name="operatingHours" value={form.operatingHours} onChange={handleChange} />
              </div>

              {/* Summary */}
              <div className="border border-white/8 rounded-xl p-4 mb-2 bg-white/[0.02]">
                <p className="font-body text-xs text-gray-500 mb-3 uppercase tracking-wide">Shop summary</p>
                <div className="grid grid-cols-2 gap-y-2">
                  {[["Name",form.name],["Type",form.type],["Location",`${form.locality}, ${form.city}`],["Area",form.areaType],["Customers",form.customerAgeRange],["Phone",form.phone ? `+91 ${form.phone}` : "—"]].map(([k,v]) => (
                    <div key={k}><p className="font-body text-xs text-gray-600">{k}</p><p className="font-body text-xs text-white capitalize">{v||"—"}</p></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {step > 0 ? (
              <button onClick={back} className="back-btn font-body text-sm text-gray-400 px-4 py-2.5 rounded-xl">← Back</button>
            ) : (
              <button onClick={() => router.push("/")} className="back-btn font-body text-sm text-gray-500 px-4 py-2.5 rounded-xl">← Home</button>
            )}
            {step < 2 ? (
              <button onClick={next} className="btn-primary font-body text-sm font-medium px-6 py-2.5 rounded-xl">Continue →</button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="btn-primary font-body text-sm font-medium px-6 py-2.5 rounded-xl disabled:opacity-40">
                {loading ? "Creating shop..." : "Launch my shop →"}
              </button>
            )}
          </div>
        </div>

        <p className="font-body text-xs text-gray-600 text-center mt-4">
          Already registered?{" "}
          <button onClick={() => router.push("/dashboard")} className="text-gray-400 underline hover:text-white transition-colors">Go to dashboard</button>
        </p>
      </div>
    </div>
  );
}
