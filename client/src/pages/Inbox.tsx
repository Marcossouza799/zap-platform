import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Trash2, Bot, User } from "lucide-react";

export default function Inbox() {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [aiMode, setAiMode] = useState<"auto" | "manual">("auto");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const messagesQuery = trpc.chat.list.useQuery();
  const sendMessage = trpc.chat.send.useMutation({
    onSuccess: () => utils.chat.list.invalidate(),
  });
  const aiReply = trpc.chat.aiReply.useMutation();
  const clearChat = trpc.chat.clear.useMutation({
    onSuccess: () => { utils.chat.list.invalidate(); toast.success("Chat limpo"); },
  });

  const messages = messagesQuery.data || [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    // Save user message
    await sendMessage.mutateAsync({ content: text, role: "user" });

    // Get AI reply only in auto mode
    if (aiMode !== "auto") return;
    setIsTyping(true);
    try {
      const history = [...messages, { role: "user" as const, content: text }].map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      const result = await aiReply.mutateAsync({ messages: history });
      if (result.reply) {
        await sendMessage.mutateAsync({ content: result.reply, role: "assistant", isAi: true });
      }
    } catch (err) {
      toast.error("Erro ao gerar resposta da IA");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-3.5 gap-2 flex-shrink-0" style={{ height: 42, borderBottom: "0.5px solid #141720" }}>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: 24, height: 24, background: "#091c34" }}
          >
            <Bot size={12} style={{ color: "#378add" }} />
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Simulador IA</span>
            <span style={{ fontSize: 10, color: "#343850", marginLeft: 6 }}>Teste seus fluxos com IA</span>
          </div>
        </div>
        <div className="ml-auto flex gap-1.5">
          <div
            className="flex items-center gap-1 rounded-md"
            style={{ background: "#0c0f18", border: "0.5px solid #141720", padding: "2px 3px" }}
          >
            <button
              className="flex items-center gap-1 rounded px-2 py-0.5 transition-colors"
              style={{
                fontSize: 10,
                background: aiMode === "auto" ? "#0c2218" : "transparent",
                color: aiMode === "auto" ? "#25d366" : "#5a5f7a",
                border: aiMode === "auto" ? "0.5px solid #153520" : "0.5px solid transparent",
              }}
              onClick={() => setAiMode("auto")}
            >
              <Bot size={10} /> Auto
            </button>
            <button
              className="flex items-center gap-1 rounded px-2 py-0.5 transition-colors"
              style={{
                fontSize: 10,
                background: aiMode === "manual" ? "#091c34" : "transparent",
                color: aiMode === "manual" ? "#378add" : "#5a5f7a",
                border: aiMode === "manual" ? "0.5px solid #0c2848" : "0.5px solid transparent",
              }}
              onClick={() => setAiMode("manual")}
            >
              <User size={10} /> Manual
            </button>
          </div>
          <button
            className="zap-btn-outline flex items-center gap-1"
            style={{ fontSize: 10 }}
            onClick={() => clearChat.mutate()}
          >
            <Trash2 size={10} /> Limpar
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div
        className="flex-1 overflow-y-auto p-4 zap-scroll"
        style={{ background: "#080b0e" }}
      >
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 48, height: 48, background: "#091c34" }}
            >
              <Bot size={24} style={{ color: "#378add" }} />
            </div>
            <p style={{ fontSize: 13, color: "#5a5f7a", textAlign: "center", maxWidth: 300, lineHeight: 1.6 }}>
              Simule uma conversa de WhatsApp com IA. Envie uma mensagem como se fosse um lead real.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2.5 max-w-2xl mx-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              className="flex gap-2"
              style={{ justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
            >
              {m.role === "assistant" && (
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: 24, height: 24, background: "#091c34", marginTop: 2 }}
                >
                  <Bot size={11} style={{ color: "#378add" }} />
                </div>
              )}
              <div
                style={{
                  maxWidth: "70%",
                  padding: "8px 12px",
                  borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: m.role === "user" ? "#0c2218" : "#0c0f18",
                  border: `0.5px solid ${m.role === "user" ? "#153520" : "#1c2030"}`,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: m.role === "user" ? "#c8e8d8" : "#c0c3d4",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
                <div style={{ fontSize: 9, color: "#252838", marginTop: 4, textAlign: "right" }}>
                  {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {m.role === "user" && (
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: 24, height: 24, background: "#0c2218", marginTop: 2 }}
                >
                  <User size={11} style={{ color: "#25d366" }} />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2">
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 24, height: 24, background: "#091c34", marginTop: 2 }}
              >
                <Bot size={11} style={{ color: "#378add" }} />
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "12px 12px 12px 2px",
                  background: "#0c0f18",
                  border: "0.5px solid #1c2030",
                }}
              >
                <div className="flex gap-1">
                  <div className="animate-bounce" style={{ width: 5, height: 5, borderRadius: "50%", background: "#378add", animationDelay: "0ms" }} />
                  <div className="animate-bounce" style={{ width: 5, height: 5, borderRadius: "50%", background: "#378add", animationDelay: "150ms" }} />
                  <div className="animate-bounce" style={{ width: 5, height: 5, borderRadius: "50%", background: "#378add", animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ borderTop: "0.5px solid #141720", background: "#060809" }}
      >
        <input
          className="zap-input flex-1"
          placeholder="Envie uma mensagem como lead..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={isTyping}
          style={{ padding: "8px 12px", fontSize: 12 }}
        />
        <button
          className="zap-btn flex items-center justify-center"
          style={{ width: 36, height: 36, padding: 0, borderRadius: 8 }}
          onClick={handleSend}
          disabled={isTyping || !input.trim()}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
