"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Business = {
  id: string; name: string; type: string;
  city: string; locality: string; areaType: string;
};

type CustomerProfile = {
  id: string; name: string; phone: string;
  address: string; city: string;
};

const typeIcon: Record<string, string> = {
  grocery:"🛒",electronics:"📱",pharmacy:"💊",clothing:"👕",stationery:"📚",hardware:"🔧",restaurant:"🍱",other:"🏪",
};
const typeColor: Record<string, string> = {
  grocery:"bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  electronics:"bg-blue-500/10 border-blue-500/20 text-blue-400",
  pharmacy:"bg-violet-500/10 border-violet-500/20 text-violet-400",
  clothing:"bg-pink-500/10 border-pink-500/20 text-pink-400",
  stationery:"bg-amber-500/10 border-amber-500/20 text-amber-400",
  hardware:"bg-orange-500/10 border-orange-500/20 text-orange-400",
  restaurant:"bg-red-500/10 border-red-500/20 text-red-400",
  other:"bg-gray-500/10 border-gray-500/20 text-gray-400",
};

// Avatar initials color
const avatarColors = [
  "bg-violet-500/20 border-violet-500/30 text-violet-300",
  "bg-blue-500/20 border-blue-500/30 text-blue-300",
  "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
  "bg-amber-500/20 border-amber-500/30 text-amber-300",
  "bg-pink-500/20 border-pink-500/30 text-pink-300",
];

export default function Landing() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);

    fetch("/api/business/latest?all=true")
      .then(r => r.json())
      .then(d => setBusinesses(Array.isArray(d) ? d.slice(0, 5) : []));

    fetch("/api/customer-profile?all=true")
      .then(r => r.json())
      .then(d => setCustomers(Array.isArray(d) ? d : []));

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleCustomerLogin = (customer: CustomerProfile) => {
    // Store in localStorage so customer page can pick it up
    localStorage.setItem("customerProfile", JSON.stringify(customer));
    router.push("/customer");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        .font-display{font-family:'Instrument Serif',serif} .font-body{font-family:'DM Sans',sans-serif}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes gridMove{from{transform:translateY(0)}to{transform:translateY(60px)}}
        @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .anim-1{animation:fadeUp .7s .05s ease both} .anim-2{animation:fadeUp .7s .15s ease both}
        .anim-3{animation:fadeUp .7s .30s ease both} .anim-4{animation:fadeUp .7s .45s ease both}
        .anim-f{animation:fadeIn 1s .6s ease both}
        .grid-bg{background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:60px 60px;animation:gridMove 8s linear infinite}
        .card-hover{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);transition:all .25s ease}
        .card-hover:hover{border-color:rgba(255,255,255,.15);background:rgba(255,255,255,.05);transform:translateY(-2px);box-shadow:0 20px 40px rgba(0,0,0,.3)}
        .demo-card{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);transition:all .25s ease;cursor:pointer}
        .demo-card:hover{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.05);transform:translateY(-2px)}
        .btn-primary{background:white;color:#0a0a0a;transition:all .2s ease} .btn-primary:hover{background:#e8e8e8;transform:translateY(-1px)}
        .btn-ghost{border:1px solid rgba(255,255,255,.15);transition:all .2s ease} .btn-ghost:hover{border-color:rgba(255,255,255,.4);background:rgba(255,255,255,.05)}
        .nav-blur{backdrop-filter:blur(20px);background:rgba(10,10,10,.8);border-bottom:1px solid rgba(255,255,255,.06)}
        .ticker-wrap{overflow:hidden;mask-image:linear-gradient(90deg,transparent,black 10%,black 90%,transparent)}
        .ticker-inner{display:flex;gap:0;animation:ticker 28s linear infinite;width:max-content}
        .step-num{font-family:'Instrument Serif',serif;font-size:72px;line-height:1;color:rgba(255,255,255,.05);position:absolute;top:-20px;left:-10px}
        .avatar{width:40px;height:40px;border-radius:50%;border:1px solid;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;flex-shrink:0}
        .shimmer{background:linear-gradient(90deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 100%);background-size:400px 100%;animation:shimmer 1.4s ease infinite}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
      `}</style>

      <div className="fixed inset-0 grid-bg opacity-50 pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background:"radial-gradient(circle,rgba(255,255,255,.04) 0%,transparent 70%)" }} />

      {/* Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 px-8 py-4 font-body transition-all duration-300 ${scrolled ? "nav-blur" : ""}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <span className="text-[#0a0a0a] text-xs font-bold font-body">R</span>
            </div>
            <span className="font-medium text-white text-sm">Retailytics</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push("/map")} className="btn-ghost font-body text-xs text-gray-300 px-4 py-2 rounded-lg">Map</button>
            <button onClick={() => router.push("/onboarding")} className="btn-ghost font-body text-xs text-gray-300 px-4 py-2 rounded-lg">Register Shop</button>
            <button onClick={() => router.push("/dashboard")} className="btn-primary font-body text-xs px-4 py-2 rounded-lg font-medium">Owner Dashboard</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16">
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="anim-1 inline-flex items-center gap-2 border border-white/10 bg-white/5 text-gray-400 text-xs px-4 py-2 rounded-full mb-8 font-body">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" style={{ animation:"pulseDot 2s ease infinite" }} />
            AI-powered · Real-time market intelligence · India-first
          </div>
          <h1 className="anim-2 font-display text-6xl md:text-7xl leading-[1.05] mb-6">
            Stock what sells.<br /><span className="italic text-gray-500">Before others know.</span>
          </h1>
          <p className="anim-3 font-body text-gray-400 text-lg max-w-lg mx-auto mb-10 leading-relaxed font-light">
            Retailytics reads live news, seasonal shifts, and global events —
            then tells your local shop exactly what to stock this week.
          </p>
          <div className="anim-4 flex items-center justify-center gap-3 flex-wrap">
            <button onClick={() => router.push("/onboarding")} className="btn-primary font-body px-6 py-3 rounded-xl text-sm font-medium">Register your shop →</button>
            <button onClick={() => router.push("/customer")} className="btn-ghost font-body text-gray-300 px-6 py-3 rounded-xl text-sm">Browse as customer</button>
          </div>
        </div>
        <div className="anim-f relative z-10 mt-20 grid grid-cols-3 gap-4 max-w-2xl w-full mx-auto">
          {[{num:"5×",label:"faster stock decisions"},{num:"Live",label:"news-aware AI"},{num:"₹0",label:"to get started"}].map(s => (
            <div key={s.num} className="card-hover rounded-2xl p-5 text-center">
              <p className="font-display text-3xl text-white mb-1">{s.num}</p>
              <p className="font-body text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ticker */}
      <div className="py-5 border-y border-white/5">
        <div className="ticker-wrap">
          <div className="ticker-inner font-body text-xs text-gray-600 tracking-widest uppercase">
            {Array(2).fill(null).map((_,i) => (
              <span key={i} className="flex items-center">
                {["Seasonal Intelligence","·","Real-world Events","·","AI Voice Agent","·","Order Management","·","Hyperlocal Targeting","·","Live News Analysis","·","Stock Recommendations","·"].map((t,j) => (
                  <span key={j} className="px-6 whitespace-nowrap">{t}</span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Demo Profiles */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="font-body text-xs text-gray-500 uppercase tracking-widest mb-3">Try it now</p>
          <h2 className="font-display text-4xl text-white mb-3">Jump in with a demo profile</h2>
          <p className="font-body text-sm text-gray-500">No signup needed — explore as an owner or a customer</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Owner profiles */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-white/5" />
              <p className="font-body text-xs text-gray-500 uppercase tracking-widest px-3">Shop owners</p>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="space-y-3">
              {businesses.length === 0 && (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="rounded-2xl overflow-hidden h-20"><div className="shimmer w-full h-full" /></div>)}
                </div>
              )}
              {businesses.map(biz => (
                <button key={biz.id} onClick={() => router.push(`/dashboard?bizId=${biz.id}`)}
                  className="demo-card w-full rounded-2xl p-4 text-left">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl flex-shrink-0 ${typeColor[biz.type] || typeColor.other}`}>
                      <span style={{ fontSize:"22px" }}>{typeIcon[biz.type] || "🏪"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-body font-medium text-white text-sm">{biz.name}</p>
                        <span className={`font-body text-xs px-2 py-0.5 rounded-full border capitalize shrink-0 ${typeColor[biz.type] || typeColor.other}`}>{biz.type}</span>
                      </div>
                      <p className="font-body text-xs text-gray-500 mt-0.5">{biz.locality}, {biz.city} · {biz.areaType}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" className="shrink-0">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                    <span className="font-body text-xs text-gray-600">Opens as owner dashboard</span>
                    <span className="font-body text-xs text-emerald-500 ml-auto flex items-center gap-1">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full" />View AI recommendations
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Customer profiles */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-white/5" />
              <p className="font-body text-xs text-gray-500 uppercase tracking-widest px-3">Customers</p>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="space-y-3">
              {customers.length === 0 && (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => <div key={i} className="rounded-2xl overflow-hidden h-20"><div className="shimmer w-full h-full" /></div>)}
                </div>
              )}
              {customers.map((c, idx) => (
                <button key={c.id} onClick={() => handleCustomerLogin(c)}
                  className="demo-card w-full rounded-2xl p-4 text-left">
                  <div className="flex items-center gap-4">
                    <div className={`avatar ${avatarColors[idx % avatarColors.length]}`}>
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-body font-medium text-white text-sm">{c.name}</p>
                        <span className="font-body text-xs text-gray-600 shrink-0">+91 {c.phone}</span>
                      </div>
                      <p className="font-body text-xs text-gray-500 mt-0.5 truncate">{c.address}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" className="shrink-0">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                    <span className="font-body text-xs text-gray-600">Opens storefront with saved address</span>
                    <span className="font-body text-xs text-blue-400 ml-auto flex items-center gap-1">
                      <span className="w-1 h-1 bg-blue-400 rounded-full" />Browse &amp; order
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <p className="font-body text-xs text-gray-500 uppercase tracking-widest mb-3">Features</p>
          <h2 className="font-display text-4xl text-white">Everything your shop needs</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[
            {icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>,title:"Seasonal Intelligence",desc:"Detects monsoon, Diwali, summer — tells you what to stock weeks before demand spikes.",accent:"text-violet-400",bg:"bg-violet-400/10"},
            {icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>,title:"Real-world Events",desc:"Reads live news — LPG disruptions, commodity prices, supply issues — connects to local demand.",accent:"text-blue-400",bg:"bg-blue-400/10"},
            {icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>,title:"AI Voice Agent",desc:"Miss an order? AI calls you, reads the details, acts on your voice reply instantly.",accent:"text-orange-400",bg:"bg-orange-400/10"},
          ].map(f => (
            <div key={f.title} className="card-hover rounded-2xl p-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.accent} ${f.bg} border border-white/8`}>{f.icon}</div>
              <h3 className="font-body font-medium text-white mb-2">{f.title}</h3>
              <p className="font-body text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,title:"Customer Storefront",desc:"Your shop gets a digital storefront. Customers browse, order, and get home delivery.",accent:"text-emerald-400",bg:"bg-emerald-400/10"},
            {icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,title:"Hyperlocal Targeting",desc:"Recommendations adapt to your exact locality, area type, and customer age group.",accent:"text-pink-400",bg:"bg-pink-400/10"},
          ].map(f => (
            <div key={f.title} className="card-hover rounded-2xl p-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.accent} ${f.bg} border border-white/8`}>{f.icon}</div>
              <h3 className="font-body font-medium text-white mb-2">{f.title}</h3>
              <p className="font-body text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/5 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-body text-xs text-gray-500 uppercase tracking-widest mb-3">Process</p>
            <h2 className="font-display text-4xl text-white">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {n:"1",title:"Register your shop",desc:"Tell us your locality, customer type, area, and phone. Takes 2 minutes."},
              {n:"2",title:"AI reads your market",desc:"Claude searches live news, checks the season, analyses your customer profile."},
              {n:"3",title:"Stock what sells",desc:"Get weekly recommendations with urgency ratings, real reasons, and market context."},
            ].map(s => (
              <div key={s.n} className="relative pl-4">
                <span className="step-num">{s.n}</span>
                <div className="relative z-10 pt-8">
                  <div className="w-8 h-0.5 mb-4" style={{ background:"linear-gradient(90deg,rgba(255,255,255,.4),transparent)" }} />
                  <h4 className="font-body font-medium text-white mb-2 text-sm">{s.title}</h4>
                  <p className="font-body text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto card-hover rounded-3xl p-12 text-center">
          <h2 className="font-display text-4xl text-white mb-4">Ready to sell smarter?</h2>
          <p className="font-body text-gray-500 text-sm mb-8 leading-relaxed">
            Join local shop owners using AI to stay ahead of demand —<br />no technical knowledge needed.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push("/onboarding")} className="btn-primary font-body px-6 py-3 rounded-xl text-sm font-medium">Register your shop →</button>
            <button onClick={() => router.push("/dashboard")} className="btn-ghost font-body text-gray-400 px-6 py-3 rounded-xl text-sm">View demo dashboard</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
              <span className="text-[#0a0a0a] text-[9px] font-bold font-body">R</span>
            </div>
            <span className="font-body text-xs text-gray-600">Retailytics</span>
          </div>
          <p className="font-body text-xs text-gray-700">© 2026 · Built for local businesses · Powered by Claude AI</p>
        </div>
      </footer>
    </div>
  );
}
