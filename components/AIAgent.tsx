"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
};

type PageContext =
  | "dashboard"
  | "catalog"
  | "analytics"
  | "offline-sales"
  | "orders";

type Props = {
  bizId: string;
  page: PageContext;
  pageData?: Record<string, any>; // pass in current page data for context
};

const pageConfig: Record<PageContext, { label: string; color: string; suggestions: string[] }> = {
  dashboard: {
    label: "Dashboard",
    color: "text-violet-400",
    suggestions: [
      "What should I stock this week?",
      "Which orders need attention?",
      "How is my shop performing?",
      "What global events affect my shop?",
    ],
  },
  catalog: {
    label: "Catalog",
    color: "text-blue-400",
    suggestions: [
      "Which products should I remove?",
      "What new products should I add?",
      "Which items are overstocked?",
      "Suggest pricing improvements",
    ],
  },
  analytics: {
    label: "Analytics",
    color: "text-emerald-400",
    suggestions: [
      "What do my sales trends say?",
      "Which product earns most?",
      "When is my peak sales time?",
      "How can I increase revenue?",
    ],
  },
  "offline-sales": {
    label: "Offline Sales",
    color: "text-amber-400",
    suggestions: [
      "What are my top offline sellers?",
      "Should I stock more of anything?",
      "Compare online vs offline sales",
      "What patterns do you see?",
    ],
  },
  orders: {
    label: "Orders",
    color: "text-pink-400",
    suggestions: [
      "Why are orders being cancelled?",
      "How can I reduce delivery time?",
      "Which customers order most?",
      "How to handle peak order times?",
    ],
  },
};

export default function AIAgent({ bizId, page, pageData }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const config = pageConfig[page] || pageConfig.dashboard;

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Hi! I'm your AI advisor for the **${config.label}** page. I know your shop's data — ask me anything or pick a suggestion below.`,
      }]);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: "", loading: true }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bizId,
          page,
          question: text,
          pageData: pageData || {},
          history: messages.slice(-6), // send last 6 messages for context
        }),
      });
      const data = await res.json();
      const answer = data.answer || "Sorry, I couldn't process that. Please try again.";
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { role: "assistant", content: answer, loading: false } : m
      ));
    } catch {
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { role: "assistant", content: "Error connecting to AI. Check your API key.", loading: false } : m
      ));
    } finally {
      setLoading(false);
    }
  }, [bizId, page, pageData, messages, loading]);

  // Format markdown-like text
  const formatMessage = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:3px;font-size:11px">$1</code>')
      .replace(/^- (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:rgba(255,255,255,0.3)">•</span><span>$1</span></div>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
        .ai-agent-font { font-family: 'DM Sans', sans-serif; }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes pulse-ring { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.15);opacity:.3} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .agent-panel { animation: slideUp .3s ease both; }
        .agent-fab { transition: all .2s ease; }
        .agent-fab:hover { transform: scale(1.05); }
        .agent-fab:active { transform: scale(0.95); }
        .msg-bubble { animation: fadeIn .25s ease both; }
        .typing-dot { animation: blink 1s ease infinite; }
        .typing-dot:nth-child(2) { animation-delay: .2s; }
        .typing-dot:nth-child(3) { animation-delay: .4s; }
        .suggestion-btn { border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); transition: all .15s; cursor: pointer; }
        .suggestion-btn:hover { border-color: rgba(255,255,255,.2); background: rgba(255,255,255,.07); }
        .agent-input { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: white; font-family: 'DM Sans', sans-serif; transition: all .2s; }
        .agent-input:focus { border-color: rgba(255,255,255,.3); outline: none; }
        .agent-input::placeholder { color: rgba(255,255,255,.25); }
        .messages-scroll::-webkit-scrollbar { width: 3px; }
        .messages-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 3px; }
      `}</style>

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="agent-fab fixed bottom-6 right-6 z-[999] w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl"
        style={{
          background: open ? "#111" : "white",
          border: open ? "1px solid rgba(255,255,255,.15)" : "none",
        }}
        title="AI Advisor"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.8">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        )}
        {/* Pulse ring when closed */}
        {!open && (
          <div className="absolute inset-0 rounded-2xl border-2 border-white"
            style={{ animation: "pulse-ring 3s ease infinite" }} />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="agent-panel fixed bottom-24 right-6 z-[998] w-80 rounded-2xl overflow-hidden shadow-2xl ai-agent-font"
          style={{ border: "1px solid rgba(255,255,255,.1)", background: "#0d0d0d", maxHeight: "520px", display: "flex", flexDirection: "column" }}
        >
          {/* Header */}
          <div style={{ background: "rgba(255,255,255,.03)", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "white", lineHeight: 1.2 }}>AI Advisor</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", lineHeight: 1.2 }}>{config.label} · Llama 3.3</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }} />
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>Live</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="messages-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.map((msg, i) => (
              <div key={i} className="msg-bubble" style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: "20px", height: "20px", borderRadius: "6px", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: "6px", marginTop: "2px" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                  </div>
                )}
                <div style={{
                  maxWidth: "85%",
                  padding: "8px 11px",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.role === "user" ? "white" : "rgba(255,255,255,0.06)",
                  border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
                  fontSize: "12.5px",
                  lineHeight: "1.5",
                  color: msg.role === "user" ? "#0a0a0a" : "rgba(255,255,255,0.85)",
                }}>
                  {msg.loading ? (
                    <div style={{ display: "flex", gap: "3px", alignItems: "center", padding: "2px 0" }}>
                      {[0,1,2].map(j => (
                        <div key={j} className="typing-dot" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(255,255,255,0.4)" }} />
                      ))}
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  )}
                </div>
              </div>
            ))}

            {/* Suggestions — show after first assistant message */}
            {messages.length === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "4px" }}>
                {config.suggestions.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} className="suggestion-btn"
                    style={{ padding: "7px 10px", borderRadius: "10px", fontSize: "11.5px", color: "rgba(255,255,255,0.6)", textAlign: "left" }}>
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
                className="agent-input"
                style={{ flex: 1, borderRadius: "12px", padding: "8px 12px", fontSize: "12.5px" }}
                placeholder="Ask anything about your shop..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                disabled={loading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                style={{
                  width: "32px", height: "32px", borderRadius: "10px",
                  background: input.trim() ? "white" : "rgba(255,255,255,0.08)",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: input.trim() ? "pointer" : "not-allowed", transition: "all .2s", flexShrink: 0,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke={input.trim() ? "#0a0a0a" : "rgba(255,255,255,0.3)"} strokeWidth="2.5">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: "6px" }}>
              Powered by Llama 3.3 · Knows your shop data
            </p>
          </div>
        </div>
      )}
    </>
  );
}
