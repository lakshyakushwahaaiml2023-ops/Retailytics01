"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
};

type PageContext = "dashboard" | "catalog" | "analytics" | "offline-sales" | "orders";

type Props = {
  bizId: string;
  page: PageContext;
};

const pageSuggestions: Record<PageContext, string[]> = {
  dashboard: [
    "What should I stock this week?",
    "How is my shop performing?",
    "Which orders need attention?",
    "What global events affect my sales?",
  ],
  catalog: [
    "Which products should I remove?",
    "What new products should I add?",
    "Which items are overstocked?",
    "Suggest better pricing for my products",
  ],
  analytics: [
    "What do my sales trends say?",
    "Which product earns me the most?",
    "How can I increase revenue?",
    "Compare my online vs offline performance",
  ],
  "offline-sales": [
    "What are my top offline sellers?",
    "Should I stock more of anything?",
    "How does offline compare to online?",
    "What patterns do you see in my sales?",
  ],
  orders: [
    "Why are orders being cancelled?",
    "How can I reduce delivery time?",
    "Which customers order the most?",
    "How to handle peak order times?",
  ],
};

const pageLabels: Record<PageContext, string> = {
  dashboard: "Dashboard",
  catalog: "Catalog",
  analytics: "Analytics",
  "offline-sales": "Offline Sales",
  orders: "Orders",
};

function formatMessage(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.12);padding:1px 5px;border-radius:3px;font-size:11px">$1</code>')
    .replace(/^[-•] (.+)$/gm, '<div style="display:flex;gap:6px;margin:3px 0"><span style="color:rgba(255,255,255,0.3);flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, "<br/>");
}

export default function AIChat({ bizId, page }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = pageSuggestions[page] || pageSuggestions.dashboard;

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Hi! I'm your AI advisor. I know your shop's full data — inventory, sales, orders, and current market conditions.\n\nAsk me anything or pick a quick question below.`,
      }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setShowSuggestions(false);
    setInput("");
    setMessages(prev => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "", loading: true },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bizId,
          page,
          question: text,
          history: messages.slice(-8),
        }),
      });
      const data = await res.json();
      const answer = data.answer || "Sorry, I couldn't process that.";
      setMessages(prev =>
        prev.map((m, i) => i === prev.length - 1 ? { role: "assistant", content: answer, loading: false } : m)
      );
    } catch {
      setMessages(prev =>
        prev.map((m, i) => i === prev.length - 1 ? { role: "assistant", content: "Connection error. Check your GROQ_API_KEY.", loading: false } : m)
      );
    } finally {
      setLoading(false);
    }
  }, [bizId, page, messages, loading]);

  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
    setTimeout(() => {
      setMessages([{
        role: "assistant",
        content: `Hi! I'm your AI advisor. I know your shop's full data — inventory, sales, orders, and current market conditions.\n\nAsk me anything or pick a quick question below.`,
      }]);
    }, 50);
  };

  return (
    <>
      <style>{`
        .ai-chat-font { font-family: 'DM Sans', sans-serif; }
        @keyframes slideUpChat { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fadeInMsg { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseRing { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.2);opacity:.2} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .chat-panel { animation: slideUpChat .3s cubic-bezier(0.34,1.56,0.64,1) both; }
        .msg-in { animation: fadeInMsg .2s ease both; }
        .blink-1 { animation: blink 1s ease infinite; }
        .blink-2 { animation: blink 1s .2s ease infinite; }
        .blink-3 { animation: blink 1s .4s ease infinite; }
        .fab-btn { transition: all .2s cubic-bezier(0.34,1.56,0.64,1); }
        .fab-btn:hover { transform: scale(1.08); }
        .fab-btn:active { transform: scale(0.94); }
        .sugg-btn { border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); transition: all .15s; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .sugg-btn:hover { border-color: rgba(255,255,255,.22); background: rgba(255,255,255,.07); }
        .chat-input { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: white; font-family: 'DM Sans', sans-serif; transition: all .2s; }
        .chat-input:focus { border-color: rgba(255,255,255,.3); outline: none; box-shadow: 0 0 0 3px rgba(255,255,255,.04); }
        .chat-input::placeholder { color: rgba(255,255,255,.22); }
        .msgs-scroll::-webkit-scrollbar { width: 3px; }
        .msgs-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 3px; }
      `}</style>

      {/* FAB button */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
        {/* Tooltip when closed */}
        {!open && (
          <div className="ai-chat-font text-xs text-gray-400 bg-[#111] border border-white/10 px-3 py-1.5 rounded-xl pointer-events-none"
            style={{ animation: "fadeInMsg .3s ease both" }}>
            AI Advisor · {pageLabels[page]}
          </div>
        )}

        <button onClick={() => setOpen(o => !o)} className="fab-btn w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl relative"
          style={{ background: open ? "#161616" : "white", border: open ? "1px solid rgba(255,255,255,.15)" : "2px solid rgba(255,255,255,.1)" }}>
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.8">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          )}
          {/* Pulse ring */}
          {!open && (
            <div className="absolute inset-0 rounded-2xl border-2 border-white/40"
              style={{ animation: "pulseRing 2.5s ease infinite" }} />
          )}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div className="chat-panel ai-chat-font fixed bottom-24 right-6 z-[9998] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: "340px", maxHeight: "560px", background: "#0e0e0e", border: "1px solid rgba(255,255,255,.1)" }}>

          {/* Header */}
          <div style={{ background: "rgba(255,255,255,.03)", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "white", lineHeight: 1.2 }}>AI Advisor</p>
              <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,.35)", lineHeight: 1.2 }}>
                {pageLabels[page]} · Llama 3.3 · knows your data
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }} />
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,.35)" }}>Live</span>
              </div>
              <button onClick={clearChat} title="Clear chat"
                style={{ fontSize: "11px", color: "rgba(255,255,255,.25)", cursor: "pointer", background: "none", border: "none", padding: "2px 4px" }}>
                ↺
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="msgs-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.map((msg, i) => (
              <div key={i} className="msg-in" style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: "7px" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: "22px", height: "22px", borderRadius: "7px", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                  </div>
                )}
                <div style={{
                  maxWidth: "82%",
                  padding: "9px 12px",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                  background: msg.role === "user" ? "white" : "rgba(255,255,255,.07)",
                  border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,.08)",
                  fontSize: "12.5px",
                  lineHeight: "1.55",
                  color: msg.role === "user" ? "#0a0a0a" : "rgba(255,255,255,.88)",
                }}>
                  {msg.loading ? (
                    <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "2px 0" }}>
                      <div className="blink-1" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(255,255,255,.4)" }} />
                      <div className="blink-2" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(255,255,255,.4)" }} />
                      <div className="blink-3" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(255,255,255,.4)" }} />
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  )}
                </div>
              </div>
            ))}

            {/* Quick suggestions */}
            {showSuggestions && messages.length === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "2px" }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} className="sugg-btn"
                    style={{ padding: "8px 11px", borderRadius: "10px", fontSize: "12px", color: "rgba(255,255,255,.6)", textAlign: "left", lineHeight: 1.4 }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                ref={inputRef}
                className="chat-input"
                style={{ flex: 1, borderRadius: "12px", padding: "9px 13px", fontSize: "12.5px" }}
                placeholder="Ask about your shop..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                disabled={loading}
              />
              <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
                style={{
                  width: "34px", height: "34px", borderRadius: "11px", flexShrink: 0,
                  background: input.trim() && !loading ? "white" : "rgba(255,255,255,.07)",
                  border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s",
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={input.trim() && !loading ? "#0a0a0a" : "rgba(255,255,255,.25)"} strokeWidth="2.5">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,.18)", textAlign: "center", marginTop: "7px" }}>
              Knows your inventory · orders · sales · market
            </p>
          </div>
        </div>
      )}
    </>
  );
}
