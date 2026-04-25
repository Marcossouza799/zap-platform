import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export default function Kanban() {
  const [showAdd, setShowAdd] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTags, setNewTags] = useState("");
  const [dragCard, setDragCard] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const boardQuery = trpc.kanban.getBoard.useQuery();
  const createCard = trpc.kanban.createCard.useMutation({
    onSuccess: () => { utils.kanban.getBoard.invalidate(); setShowAdd(null); setNewName(""); setNewPhone(""); setNewTags(""); toast.success("Lead adicionado!"); },
  });
  const updateCard = trpc.kanban.updateCard.useMutation({
    onSuccess: () => { utils.kanban.getBoard.invalidate(); },
  });
  const deleteCard = trpc.kanban.deleteCard.useMutation({
    onSuccess: () => { utils.kanban.getBoard.invalidate(); toast.success("Lead removido"); },
  });

  const columns = boardQuery.data?.columns || [];
  const cards = boardQuery.data?.cards || [];

  const handleDrop = (columnId: number) => {
    if (dragCard !== null) {
      updateCard.mutate({ id: dragCard, columnId });
      setDragCard(null);
    }
  };

  return (
    <>
      <div className="flex items-center px-3.5 gap-2 flex-shrink-0" style={{ height: 42, borderBottom: "0.5px solid #141720" }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>CRM Kanban</span>
        <span style={{ fontSize: 11, color: "#343850" }}>{cards.length} leads</span>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 zap-scroll-h" style={{ background: "#080b0e" }}>
        <div className="flex gap-2.5" style={{ height: "100%" }}>
          {columns.map(col => {
            const colCards = cards.filter(c => c.columnId === col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col gap-1.5 flex-shrink-0"
                style={{
                  minWidth: 178,
                  maxWidth: 178,
                  background: "#080b10",
                  border: "0.5px solid #141720",
                  borderRadius: 8,
                  padding: 8,
                }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(col.id)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between pb-1.5" style={{ borderBottom: "0.5px solid #141720" }}>
                  <div className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 500, color: "#9a9eb8" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: col.color || "#378add" }} />
                    {col.title}
                  </div>
                  <span style={{ fontSize: 9, background: "#141720", color: "#3a4058", padding: "1px 5px", borderRadius: 20 }}>
                    {colCards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto zap-scroll flex flex-col gap-1.5">
                  {colCards.map(card => (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => setDragCard(card.id)}
                      className="group"
                      style={{
                        background: "#0c0f18",
                        border: "0.5px solid #1c2030",
                        borderRadius: 6,
                        padding: 8,
                        cursor: "grab",
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#23263a"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1c2030"; e.currentTarget.style.transform = ""; }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 500, color: "#c8cad8", marginBottom: 2 }}>{card.name}</div>
                      {card.phone && (
                        <div style={{ fontSize: 10, color: "#343850", marginBottom: 6, fontFamily: "monospace" }}>{card.phone}</div>
                      )}
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {(card.tags as string[] || []).map((t: string) => (
                          <span key={t} className="zap-tag zap-tag-blue">{t}</span>
                        ))}
                        {card.value && <span className="zap-tag zap-tag-green">{card.value}</span>}
                      </div>
                      <div className="flex justify-between items-center">
                        <span style={{ fontSize: 9, color: "#252838" }}>
                          {new Date(card.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                        <button
                          onClick={() => deleteCard.mutate({ id: card.id })}
                          style={{ fontSize: 8, color: "#e24b4a", background: "transparent", border: "none", opacity: 0, transition: "opacity 0.1s" }}
                          className="group-hover:!opacity-100"
                        >
                          remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add button */}
                {showAdd === col.id ? (
                  <div style={{ background: "#0c0f18", border: "0.5px solid #1c2030", borderRadius: 6, padding: 6 }}>
                    <input className="zap-input mb-1" placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} style={{ fontSize: 10 }} />
                    <input className="zap-input mb-1" placeholder="Telefone" value={newPhone} onChange={e => setNewPhone(e.target.value)} style={{ fontSize: 10 }} />
                    <input className="zap-input mb-1" placeholder="Tags (virgula)" value={newTags} onChange={e => setNewTags(e.target.value)} style={{ fontSize: 10 }} />
                    <div className="flex gap-1">
                      <button className="zap-btn" style={{ fontSize: 9, padding: "3px 8px" }} onClick={() => {
                        if (!newName) { toast.error("Nome obrigatorio"); return; }
                        createCard.mutate({ columnId: col.id, name: newName, phone: newPhone, tags: newTags ? newTags.split(",").map(t => t.trim()) : [] });
                      }}>Salvar</button>
                      <button className="zap-btn-outline" style={{ fontSize: 9, padding: "3px 8px" }} onClick={() => setShowAdd(null)}>X</button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="zap-btn-outline"
                    style={{ fontSize: 9, width: "100%", marginTop: 2 }}
                    onClick={() => setShowAdd(col.id)}
                  >
                    + Lead
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
