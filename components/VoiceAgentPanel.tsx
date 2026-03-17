"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type CustomerMessage = {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  message: string;
  status: string;
  orderStatus: string;
  createdAt: string;
};

type CallLog = {
  id: string;
  orderId: string;
  intent: string;
  transcript: string;
  customerMessage: string;
  createdAt: string;
  customerName: string;
  status: string;
};

type Props = {
  bizId: string;
  onOrderUpdate?: () => void;
};

const intentConfig: Record<string, { label: string; cls: string; icon: string }> = {
  CONFIRM:  { label: "Confirmed", cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20", icon: "✓" },
  CANCEL:   { label: "Cancelled", cls: "bg-red-500/15 text-red-400 border border-red-500/20",            icon: "✕" },
  SPECIAL:  { label: "Special",   cls: "bg-blue-500/15 text-blue-400 border border-blue-500/20",         icon: "★" },
  UNKNOWN:  { label: "Unclear",   cls: "bg-gray-500/15 text-gray-400 border border-gray-500/20",         icon: "?" },
};

export default function VoiceAgentPanel({ bizId, onOrderUpdate }: Props) {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [customerMessages, setCustomerMessages] = useState<CustomerMessage[]>([]);
  const [checking, setChecking] = useState(false);
  const [calling, setCalling] = useState(false);
  const [callStatus, setCallStatus] = useState("");
  const [callError, setCallError] = useState("");
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [countdown, setCountdown] = useState(60);
  const [lastCheck, setLastCheck] = useState("");
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const [logsRes, msgsRes] = await Promise.all([
        fetch(`/api/voice/status?bizId=${bizId}`),
        fetch(`/api/customer-messages?bizId=${bizId}`),
      ]);
      const [logs, msgs] = await Promise.all([logsRes.json(), msgsRes.json()]);
      setCallLogs(Array.isArray(logs) ? logs : []);
      setCustomerMessages(Array.isArray(msgs) ? msgs : []);
    } catch {}
  }, [bizId]);

  const triggerCall = useCallback(async (order: any) => {
    setCalling(true);
    setCallError("");
    setCallStatus(`Calling owner about ${order.customerName}'s order...`);
    setActiveOrder(order);

    await fetch("/api/voice/check-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    });

    try {
      const res = await fetch("/api/voice/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          customerName: order.customerName,
          address: order.address,
          itemsSummary: order.itemsSummary,
          total: order.total,
          shopName: order.shopName,
          ownerPhone: order.ownerPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Call failed");

      setCallStatus("📞 Owner is being called — waiting for response...");
      onOrderUpdate?.();

      setTimeout(async () => {
        await fetchLogs();
        onOrderUpdate?.();
        setCallStatus("Call completed. Check customer messages below.");
        setCalling(false);
        setActiveOrder(null);
      }, 35000);
    } catch (e: any) {
      setCallError(`Call failed: ${e.message}`);
      setCallStatus("");
      setCalling(false);
      setActiveOrder(null);
    }
  }, [fetchLogs, onOrderUpdate]);

  const checkStaleOrders = useCallback(async () => {
    if (checking || calling) return;
    setChecking(true);
    setCallError("");
    try {
      const res = await fetch(`/api/voice/check-orders?bizId=${bizId}`);
      const data = await res.json();
      const stale = data.staleOrders || [];
      setLastCheck(new Date().toLocaleTimeString());

      if (stale.length > 0) {
        setChecking(false);
        await triggerCall(stale[0]);
      } else {
        setCallStatus("✓ All orders attended to");
        setTimeout(() => setCallStatus(""), 3000);
      }
    } catch (e: any) {
      setCallError(e.message);
    } finally {
      setChecking(false);
    }
  }, [bizId, checking, calling, triggerCall]);

  useEffect(() => {
    fetchLogs();
    const checkInterval = setInterval(checkStaleOrders, 60000);
    const countdownInterval = setInterval(() => setCountdown(c => c <= 1 ? 60 : c - 1), 1000);
    const refreshInterval = setInterval(fetchLogs, 15000);
    return () => {
      clearInterval(checkInterval);
      clearInterval(countdownInterval);
      clearInterval(refreshInterval);
    };
  }, []);

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="card rounded-2xl p-6" style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        .vap-font{font-family:'DM Sans',sans-serif}
        @keyframes vap-spin{to{transform:rotate(360deg)}}
        @keyframes vap-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(1.2)}}
        @keyframes vap-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .vap-spin{animation:vap-spin .8s linear infinite}
        .vap-pulse{animation:vap-pulse 2s ease infinite}
        .vap-fade{animation:vap-fade .3s ease both}
        .vap-msg{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);transition:all .2s;cursor:pointer;border-radius:12px}
        .vap-msg:hover{border-color:rgba(255,255,255,.15);background:rgba(255,255,255,.04)}
        .vap-btn{border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.5);transition:all .15s;cursor:pointer;font-family:'DM Sans',sans-serif;border-radius:8px;padding:7px 12px;font-size:11px;display:flex;align-items:center;gap:5px}
        .vap-btn:hover{border-color:rgba(255,255,255,.3);color:white;background:rgba(255,255,255,.06)}
        .vap-wa{background:rgba(37,211,102,.12);border:1px solid rgba(37,211,102,.25);color:#25d366;border-radius:8px;padding:7px 12px;font-size:11px;display:flex;align-items:center;gap:5px;text-decoration:none;font-family:'DM Sans',sans-serif}
        .vap-wa:hover{background:rgba(37,211,102,.22)}
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "20px", color: "white" }}>AI Voice Agent</h2>
            <div className="vap-pulse" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399" }} />
          </div>
          <p className="vap-font" style={{ fontSize: "12px", color: "rgba(255,255,255,.4)" }}>
            Auto-calls owner · AI composes customer message · every 60s
          </p>
        </div>
        <button onClick={checkStaleOrders} disabled={checking || calling}
          className="vap-font flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-xl disabled:opacity-40"
          style={{ background: "white", color: "#0a0a0a", border: "none", cursor: "pointer", transition: "all .2s" }}>
          {checking || calling ? (
            <svg className="vap-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: .25 }}/>
              <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" style={{ opacity: .75 }}/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
            </svg>
          )}
          {calling ? "Calling..." : checking ? "Checking..." : "Check now"}
        </button>
      </div>

      {/* Status bar */}
      <div className="rounded-xl p-3 mb-5" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="vap-pulse" style={{ width: "6px", height: "6px", borderRadius: "50%", background: calling ? "#fbbf24" : "#34d399" }} />
            <span className="vap-font" style={{ fontSize: "12px", color: calling ? "#fbbf24" : callError ? "#f87171" : callStatus ? "#34d399" : "rgba(255,255,255,.4)" }}>
              {calling ? callStatus : callError ? callError : callStatus || "Monitoring pending orders..."}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastCheck && <span className="vap-font" style={{ fontSize: "11px", color: "rgba(255,255,255,.2)" }}>Last: {lastCheck}</span>}
            <span className="vap-font" style={{ fontSize: "11px", color: "rgba(255,255,255,.2)" }}>Next in {countdown}s</span>
          </div>
        </div>

        {calling && activeOrder && (
          <div className="vap-fade mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <p className="vap-font" style={{ fontSize: "12px", color: "rgba(255,255,255,.6)" }}>
              📦 <strong style={{ color: "white" }}>{activeOrder.customerName}</strong>
              {" · "}{activeOrder.itemsSummary}{" · "}₹{activeOrder.total}
            </p>
          </div>
        )}
      </div>

      {/* Empty state */}
      {callLogs.length === 0 && customerMessages.length === 0 && (
        <div className="mb-5">
          {[
            { n: "1", t: "Customer places an order", c: "#60a5fa" },
            { n: "2", t: "Owner ignores it for 1 minute", c: "#fbbf24" },
            { n: "3", t: "AI calls owner's phone (+91 number)", c: "#a78bfa" },
            { n: "4", t: "Owner says: confirm / cancel / special instructions", c: "#f97316" },
            { n: "5", t: "AI writes customer message — copy or send via WhatsApp", c: "#34d399" },
          ].map(s => (
            <div key={s.n} className="flex items-center gap-3 py-1.5">
              <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: "28px", color: "rgba(255,255,255,.05)", width: "24px", textAlign: "center" }}>{s.n}</span>
              <p className="vap-font" style={{ fontSize: "12px", color: s.c }}>{s.t}</p>
            </div>
          ))}
        </div>
      )}

      {/* Customer Messages */}
      {customerMessages.length > 0 && (
        <div className="mb-5">
          <p className="vap-font mb-3" style={{ fontSize: "11px", color: "rgba(255,255,255,.25)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Customer notifications ({customerMessages.length})
          </p>
          <div className="space-y-2">
            {customerMessages.slice(0, 6).map(msg => {
              const isExpanded = expandedMsg === msg.id;
              const statusColor = msg.orderStatus === "confirmed" ? "#34d399" :
                                  msg.orderStatus === "cancelled" ? "#f87171" : "#fbbf24";
              return (
                <div key={msg.id} className="vap-msg p-3" onClick={() => setExpandedMsg(isExpanded ? null : msg.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: `${statusColor}15`, border: `1px solid ${statusColor}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 600, color: statusColor, flexShrink: 0 }}>
                        {msg.customerName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="vap-font font-medium" style={{ fontSize: "13px", color: "white", lineHeight: 1.2 }}>{msg.customerName}</p>
                        <p className="vap-font" style={{ fontSize: "11px", color: "rgba(255,255,255,.3)" }}>
                          {msg.customerPhone ? `+91 ${msg.customerPhone} · ` : ""}
                          {new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="vap-font" style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}25` }}>
                        {msg.orderStatus}
                      </span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"
                        style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="vap-fade mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
                      <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
                        <p className="vap-font mb-2" style={{ fontSize: "10px", color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Composed message</p>
                        <p className="vap-font" style={{ fontSize: "13px", color: "rgba(255,255,255,.85)", lineHeight: 1.6 }}>{msg.message}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="vap-btn" style={{ flex: 1, justifyContent: "center" }}
                          onClick={e => { e.stopPropagation(); copyMessage(msg.id, msg.message); }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                          {copied === msg.id ? "Copied!" : "Copy"}
                        </button>
                        {msg.customerPhone && (
                          <a className="vap-wa" style={{ flex: 1, justifyContent: "center" }}
                            href={`https://wa.me/91${msg.customerPhone}?text=${encodeURIComponent(msg.message)}`}
                            target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                            </svg>
                            Send WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Call logs */}
      {callLogs.length > 0 && (
        <div>
          <p className="vap-font mb-3" style={{ fontSize: "11px", color: "rgba(255,255,255,.25)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent calls</p>
          <div className="space-y-2">
            {callLogs.slice(0, 4).map(log => {
              const ic = intentConfig[log.intent] || intentConfig.UNKNOWN;
              return (
                <div key={log.id} className="rounded-xl p-3" style={{ border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="vap-font font-medium" style={{ fontSize: "13px", color: "white" }}>{log.customerName}</p>
                    <span className={`vap-font text-xs px-2 py-0.5 rounded-full ${ic.cls}`}>{ic.icon} {ic.label}</span>
                  </div>
                  {log.transcript && (
                    <p className="vap-font" style={{ fontSize: "11px", color: "rgba(255,255,255,.3)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      "{log.transcript.slice(0, 120)}..."
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
