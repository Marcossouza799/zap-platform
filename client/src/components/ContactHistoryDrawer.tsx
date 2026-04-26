import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  X, GitBranch, MessageSquare, Tag, UserPlus, FileText,
  Activity, ChevronDown, Send, Loader2, RefreshCw,
} from "lucide-react";

type Contact = {
  id: number;
  name: string;
  phone: string;
  tags: string[];
  status: string;
  currentFlow: string;
  createdAt: Date | string;
};

type EventType = "created" | "flow" | "message_in" | "message_out" | "tag" | "note" | "status";

interface Props {
  contact: Contact;
  onClose: () => void;
}

const EVENT_CONFIG: Record<EventType, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  created:     { icon: <UserPlus size={11} />,      color: "#25d366", bg: "#0c2218", border: "#153520" },
  flow:        { icon: <GitBranch size={11} />,     color: "#378add", bg: "#091c34", border: "#0d2a4a" },
  message_in:  { icon: <MessageSquare size={11} />, color: "#c8cde0", bg: "#141720", border: "#1e2235" },
  message_out: { icon: <MessageSquare size={11} />, color: "#25d366", bg: "#0c2218", border: "#153520" },
  tag:         { icon: <Tag size={11} />,           color: "#ef9f27", bg: "#1e1200", border: "#2e1d00" },
  note:        { icon: <FileText size={11} />,      color: "#a78bfa", bg: "#130e2a", border: "#1e1640" },
  status:      { icon: <Activity size={11} />,      color: "#ef9f27", bg: "#1e1200", border: "#2e1d00" },
};

const EVENT_LABEL: Record<EventType, string> = {
  created:     "Contato criado",
  flow:        "Fluxo disparado",
  message_in:  "Mensagem recebida",
  message_out: "Mensagem enviada",
  tag:         "Tags atualizadas",
  note:        "Nota",
  status:      "Status alterado",
};

function formatDate(d: Date | string) {
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffH < 24) return `${diffH}h atrás`;
  if (diffD < 7) return `${diffD}d atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatFull(d: Date | string) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function groupByDate(events: any[]) {
  const groups: Record<string, any[]> = {};
  for (const ev of events) {
    const key = new Date(ev.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  }
  return groups;
}

export default function ContactHistoryDrawer({ contact, onClose }: Props) {
  const [note, setNote] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  const eventsQuery = trpc.contacts.getEvents.useQuery({ contactId: contact.id });
  const addNote = trpc.contacts.addNote.useMutation({
    onSuccess: () => {
      utils.contacts.getEvents.invalidate({ contactId: contact.id });
      setNote("");
      toast.success("Nota adicionada!");
    },
    onError: (err) => toast.error(err.message),
  });

  const events = eventsQuery.data ?? [];
  const grouped = groupByDate(events);
  const dateKeys = Object.keys(grouped);

  const handleAddNote = () => {
    if (!note.trim()) return;
    addNote.mutate({ contactId: contact.id, note: note.trim() });
  };

  // ---- Styles ----
  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999,
    display: "flex", justifyContent: "flex-end",
  };
  const drawer: React.CSSProperties = {
    width: "min(420px, 100vw)", height: "100vh",
    background: "#0c0f18", borderLeft: "0.5px solid #1e2235",
    display: "flex", flexDirection: "column", overflow: "hidden",
  };

  const statusColors: Record<string, string> = {
    active: "#25d366", inactive: "#ef4444", waiting: "#ef9f27",
  };
  const statusLabels: Record<string, string> = {
    active: "ativo", inactive: "inativo", waiting: "aguardando",
  };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={drawer}>

        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #141720", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "#0c2218", border: "1.5px solid #153520",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: "#25d366", flexShrink: 0,
              }}>
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#e8ecf5", margin: 0 }}>{contact.name}</p>
                <p style={{ fontSize: 10, color: "#343850", margin: 0 }}>{contact.phone}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ color: "#5a5f7a", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
              <X size={14} />
            </button>
          </div>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 9, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
              background: "#0c2218", color: statusColors[contact.status] ?? "#5a5f7a",
              border: `0.5px solid ${statusColors[contact.status] ?? "#1e2235"}22`,
            }}>
              {statusLabels[contact.status] ?? contact.status}
            </span>
            {contact.currentFlow && (
              <span style={{ fontSize: 9, color: "#378add", display: "flex", alignItems: "center", gap: 3 }}>
                <GitBranch size={8} /> {contact.currentFlow}
              </span>
            )}
            {contact.tags.slice(0, 4).map(t => (
              <span key={t} style={{ fontSize: 9, background: "#0c2218", color: "#25d366", borderRadius: 8, padding: "1px 6px", border: "0.5px solid #153520" }}>
                {t}
              </span>
            ))}
            {contact.tags.length > 4 && (
              <span style={{ fontSize: 9, color: "#343850" }}>+{contact.tags.length - 4}</span>
            )}
          </div>
        </div>

        {/* Timeline header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 6px", flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#5a5f7a", letterSpacing: "0.05em" }}>
            HISTÓRICO DE INTERAÇÕES
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, color: "#343850" }}>{events.length} eventos</span>
            <button
              onClick={() => utils.contacts.getEvents.invalidate({ contactId: contact.id })}
              style={{ color: "#343850", background: "none", border: "none", cursor: "pointer", padding: 2 }}
              title="Atualizar"
            >
              <RefreshCw size={10} />
            </button>
          </div>
        </div>

        {/* Timeline body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }} className="zap-scroll">
          {eventsQuery.isLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 8 }}>
              <Loader2 size={14} style={{ color: "#25d366", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 11, color: "#343850" }}>Carregando histórico...</span>
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Activity size={28} style={{ color: "#1e2235", margin: "0 auto 10px" }} />
              <p style={{ fontSize: 11, color: "#343850" }}>Nenhuma interação registrada ainda.</p>
              <p style={{ fontSize: 10, color: "#1e2235" }}>As interações aparecerão aqui conforme você usa a plataforma.</p>
            </div>
          ) : (
            <div>
              {dateKeys.map(dateKey => (
                <div key={dateKey}>
                  {/* Date separator */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 10px" }}>
                    <div style={{ flex: 1, height: 1, background: "#141720" }} />
                    <span style={{ fontSize: 9, color: "#343850", whiteSpace: "nowrap", padding: "0 4px" }}>{dateKey}</span>
                    <div style={{ flex: 1, height: 1, background: "#141720" }} />
                  </div>

                  {/* Events for this date */}
                  <div style={{ position: "relative" }}>
                    {/* Vertical line */}
                    <div style={{ position: "absolute", left: 13, top: 0, bottom: 0, width: 1, background: "#141720" }} />

                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {grouped[dateKey].map((ev: any) => {
                        const cfg = EVENT_CONFIG[ev.type as EventType] ?? EVENT_CONFIG.note;
                        const isExpanded = expandedId === ev.id;
                        const hasDetail = ev.description || (ev.metadata && Object.keys(ev.metadata).length > 0);

                        return (
                          <div key={ev.id} style={{ display: "flex", gap: 10, paddingLeft: 2 }}>
                            {/* Icon bubble */}
                            <div style={{
                              width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                              background: cfg.bg, border: `0.5px solid ${cfg.border}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: cfg.color, zIndex: 1, position: "relative",
                            }}>
                              {cfg.icon}
                            </div>

                            {/* Content */}
                            <div
                              style={{
                                flex: 1, minWidth: 0, padding: "5px 8px", borderRadius: 6,
                                background: isExpanded ? "#0c0f18" : "transparent",
                                border: isExpanded ? `0.5px solid ${cfg.border}` : "0.5px solid transparent",
                                cursor: hasDetail ? "pointer" : "default",
                                transition: "all 0.12s",
                                marginBottom: 4,
                              }}
                              onClick={() => hasDetail && setExpandedId(isExpanded ? null : ev.id)}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                                  <span style={{ fontSize: 10, fontWeight: 500, color: "#c8cde0", whiteSpace: "nowrap" }}>
                                    {ev.title}
                                  </span>
                                  {hasDetail && (
                                    <ChevronDown
                                      size={9}
                                      style={{
                                        color: "#343850", flexShrink: 0,
                                        transform: isExpanded ? "rotate(180deg)" : "none",
                                        transition: "transform 0.15s",
                                      }}
                                    />
                                  )}
                                </div>
                                <span style={{ fontSize: 9, color: "#343850", whiteSpace: "nowrap", flexShrink: 0 }} title={formatFull(ev.createdAt)}>
                                  {formatDate(ev.createdAt)}
                                </span>
                              </div>

                              {/* Expanded detail */}
                              {isExpanded && (
                                <div style={{ marginTop: 6, paddingTop: 6, borderTop: `0.5px solid ${cfg.border}` }}>
                                  {ev.description && (
                                    <p style={{ fontSize: 10, color: "#8a90a8", margin: "0 0 4px", lineHeight: 1.5 }}>
                                      {ev.description}
                                    </p>
                                  )}
                                  {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                      {Object.entries(ev.metadata as Record<string, unknown>).map(([k, v]) => (
                                        <div key={k} style={{ display: "flex", gap: 6 }}>
                                          <span style={{ fontSize: 9, color: "#343850", minWidth: 60 }}>{k}</span>
                                          <span style={{ fontSize: 9, color: "#8a90a8" }}>
                                            {Array.isArray(v) ? (v as string[]).join(", ") : String(v)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add note footer */}
        <div style={{ padding: "10px 16px 14px", borderTop: "0.5px solid #141720", flexShrink: 0 }}>
          <p style={{ fontSize: 10, color: "#5a5f7a", marginBottom: 6, fontWeight: 500 }}>ADICIONAR NOTA</p>
          <div style={{ display: "flex", gap: 6 }}>
            <textarea
              ref={noteRef}
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
              placeholder="Digite uma nota sobre este contato... (Enter para salvar)"
              rows={2}
              style={{
                flex: 1, background: "#080b0e", border: "0.5px solid #1e2235", borderRadius: 5,
                color: "#c8cde0", fontSize: 10, padding: "6px 8px", resize: "none",
                outline: "none", fontFamily: "inherit", lineHeight: 1.5,
              }}
            />
            <button
              onClick={handleAddNote}
              disabled={!note.trim() || addNote.isPending}
              style={{
                background: note.trim() ? "#25d366" : "#141720",
                color: note.trim() ? "#080b0e" : "#343850",
                border: "none", borderRadius: 5, padding: "0 10px",
                cursor: note.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.12s",
              }}
            >
              {addNote.isPending ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
