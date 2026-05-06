import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Send, Pause, Play, Tag, Settings, Search, MoreVertical,
  MessageCircle, Clock, User,
} from "lucide-react";

interface ChatMessage {
  id: string;
  contactId: number;
  contactName: string;
  contactPhone: string;
  message: string;
  timestamp: Date;
  direction: "in" | "out";
  status: "sent" | "delivered" | "read" | "pending";
}

interface ActiveConversation {
  id: number;
  contactId: number;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isPaused: boolean;
  tags: string[];
}

export default function LiveChat() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [showFlowMenu, setShowFlowMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch active conversations
  const { data: conversations = [] } = trpc.contacts.list.useQuery();
  const { data: flows = [] } = trpc.flows.list.useQuery();
  
  // Mock tags for now
  const tags = [
    { id: 1, name: "Urgente", color: "#ef4444" },
    { id: 2, name: "VIP", color: "#25d366" },
    { id: 3, name: "Seguimento", color: "#378add" },
    { id: 4, name: "Resolvido", color: "#22d3ee" },
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  const filteredConversations = conversations.filter(c =>
    !searchQuery || 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) {
      toast.error("Digite uma mensagem");
      return;
    }

    // Add message to chat
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      contactId: selectedConversation.id,
      contactName: selectedConversation.name,
      contactPhone: selectedConversation.phone,
      message: messageInput,
      timestamp: new Date(),
      direction: "out",
      status: "pending",
    };

    setChatMessages(prev => [...prev, newMessage]);
    setMessageInput("");

    // Simulate message sent after 1s
    setTimeout(() => {
      setChatMessages(prev =>
        prev.map(m =>
          m.id === newMessage.id ? { ...m, status: "delivered" } : m
        )
      );
    }, 1000);

    toast.success("Mensagem enviada");
  };

  const handlePauseConversation = (conversationId: number) => {
    toast.success("Fluxo pausado para esta conversa");
  };

  const handleSendFlow = (flowId: number) => {
    if (!selectedConversation) {
      toast.error("Selecione uma conversa");
      return;
    }
    toast.success(`Fluxo enviado para ${selectedConversation.name}`);
    setShowFlowMenu(false);
  };

  const handleAddTag = (tag: string) => {
    if (!selectedConversation) {
      toast.error("Selecione uma conversa");
      return;
    }
    toast.success(`Tag "${tag}" adicionada`);
    setShowTagMenu(false);
  };

  return (
    <div className="flex h-full" style={{ background: "#080b0e", color: "#dde0ec" }}>
      {/* Conversations List */}
      <div
        className="flex flex-col flex-shrink-0 border-r"
        style={{ width: 300, borderColor: "#141720" }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: "#141720" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Chat ao Vivo</h2>
          <div className="relative">
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#3a4058",
              }}
            />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="zap-input pl-8"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div
              className="flex items-center justify-center h-full"
              style={{ color: "#5a5f7a", fontSize: 12 }}
            >
              Nenhuma conversa
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversationId(conv.id)}
                className="w-full text-left p-3 border-b transition-colors"
                style={{
                  borderColor: "#141720",
                  background: selectedConversationId === conv.id ? "#0a1a1a" : "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={e => {
                  if (selectedConversationId !== conv.id) {
                    e.currentTarget.style.background = "#0c0f18";
                  }
                }}
                onMouseLeave={e => {
                  if (selectedConversationId !== conv.id) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="flex-shrink-0 rounded-full flex items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      background: "#25d366",
                      color: "#000",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {conv.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{conv.name}</span>
                      {conv.status === "active" && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#25d366",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#5a5f7a", marginTop: 2 }}>
                      {conv.phone}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#3a4058",
                        marginTop: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {conv.currentFlow || "Sem fluxo ativo"}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 border-b flex-shrink-0"
            style={{ borderColor: "#141720" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex-shrink-0 rounded-full flex items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  background: "#25d366",
                  color: "#000",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {selectedConversation.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedConversation.name}</div>
                <div style={{ fontSize: 11, color: "#5a5f7a" }}>{selectedConversation.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePauseConversation(selectedConversation.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs transition-colors"
                style={{ background: "#0e1118", color: "#3a4058", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#ef9f27")}
                onMouseLeave={e => (e.currentTarget.style.color = "#3a4058")}
                title="Pausar fluxo"
              >
                <Pause size={14} />
                Pausar
              </button>
              <button
                onClick={() => setShowFlowMenu(!showFlowMenu)}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs transition-colors"
                style={{ background: "#0e1118", color: "#3a4058", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#378add")}
                onMouseLeave={e => (e.currentTarget.style.color = "#3a4058")}
                title="Enviar fluxo"
              >
                <Play size={14} />
                Enviar Fluxo
              </button>
              <button
                onClick={() => setShowTagMenu(!showTagMenu)}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs transition-colors"
                style={{ background: "#0e1118", color: "#3a4058", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#22d3ee")}
                onMouseLeave={e => (e.currentTarget.style.color = "#3a4058")}
                title="Adicionar etiqueta"
              >
                <Tag size={14} />
                Etiqueta
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div
                className="flex items-center justify-center h-full"
                style={{ color: "#5a5f7a", fontSize: 12 }}
              >
                Nenhuma mensagem ainda
              </div>
            ) : (
              chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === "out" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-xs px-4 py-2 rounded-lg"
                    style={{
                      background: msg.direction === "out" ? "#25d366" : "#0c0f18",
                      color: msg.direction === "out" ? "#000" : "#dde0ec",
                      fontSize: 12,
                    }}
                  >
                    <div>{msg.message}</div>
                    <div
                      style={{
                        fontSize: 10,
                        marginTop: 4,
                        opacity: 0.7,
                      }}
                    >
                      {msg.timestamp.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {msg.direction === "out" && (
                        <span style={{ marginLeft: 6 }}>
                          {msg.status === "sent" && "✓"}
                          {msg.status === "delivered" && "✓✓"}
                          {msg.status === "read" && "✓✓"}
                          {msg.status === "pending" && "⏱"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 p-4 border-t" style={{ borderColor: "#141720" }}>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Digite uma mensagem..."
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyPress={e => e.key === "Enter" && handleSendMessage()}
                className="zap-input flex-1"
              />
              <button
                onClick={handleSendMessage}
                className="flex items-center justify-center px-4 py-2 rounded transition-colors"
                style={{ background: "#25d366", color: "#000", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#20ba5a")}
                onMouseLeave={e => (e.currentTarget.style.background = "#25d366")}
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          {/* Flow Menu */}
          {showFlowMenu && (
            <div
              className="absolute top-20 right-4 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10"
              style={{ width: 200 }}
            >
              {flows.length === 0 ? (
                <div style={{ padding: 12, fontSize: 12, color: "#5a5f7a" }}>
                  Nenhum fluxo disponível
                </div>
              ) : (
                flows.map(flow => (
                  <button
                    key={flow.id}
                    onClick={() => handleSendFlow(flow.id)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-b-0"
                    style={{ fontSize: 12 }}
                  >
                    {flow.name}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Tag Menu */}
          {showTagMenu && (
            <div
              className="absolute top-20 right-32 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10"
              style={{ width: 200 }}
            >
              {tags && tags.length === 0 ? (
                <div style={{ padding: 12, fontSize: 12, color: "#5a5f7a" }}>
                  Nenhuma etiqueta disponível
                </div>
              ) : (
                tags.map((tag: any) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag.name)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-b-0 flex items-center gap-2"
                    style={{ fontSize: 12 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: tag.color || "#25d366",
                      }}
                    />
                    {tag.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex-1 flex items-center justify-center"
          style={{ color: "#5a5f7a", fontSize: 14 }}
        >
          Selecione uma conversa para começar
        </div>
      )}
    </div>
  );
}
