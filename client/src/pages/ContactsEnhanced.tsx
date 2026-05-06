import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import ImportContactsModal from "@/components/ImportContactsModal";
import ContactHistoryDrawer from "@/components/ContactHistoryDrawer";
import { History, Trash2, CheckSquare, Square } from "lucide-react";

const TAG_COLORS: Record<string, string> = {
  cliente: "zap-tag-green",
  vip: "zap-tag-blue",
  "lead quente": "zap-tag-purple",
  novo: "zap-tag-blue",
  inativo: "zap-tag-red",
  "pix pendente": "zap-tag-amber",
};

const AVATAR_COLORS = ["zap-avatar-green", "zap-avatar-blue", "zap-avatar-purple", "zap-avatar-amber"];

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

type EditingContact = { id: number; name: string; phone: string; tags: string; status: string } | null;

export default function ContactsEnhanced() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTags, setNewTags] = useState("");
  const [editing, setEditing] = useState<EditingContact>(null);
  const [showImport, setShowImport] = useState(false);
  const [historyContact, setHistoryContact] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();
  const contactsQuery = trpc.contacts.list.useQuery();
  
  const createContact = trpc.contacts.create.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      setShowAdd(false);
      setNewName("");
      setNewPhone("");
      setNewTags("");
      toast.success("Contato criado!");
    },
  });

  const updateContact = trpc.contacts.update.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      setEditing(null);
      toast.success("Contato atualizado!");
    },
  });

  const deleteContact = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      toast.success("Contato removido");
    },
  });

  const contacts = (contactsQuery.data || []).filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  // Bulk actions
  const toggleSelectContact = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione contatos para deletar");
      return;
    }

    if (!confirm(`Tem certeza que deseja deletar ${selectedIds.size} contato(s)?`)) {
      return;
    }

    Array.from(selectedIds).forEach(id => {
      deleteContact.mutate({ id });
    })
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#080b0e", color: "#dde0ec" }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: "#141720" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Contatos</h1>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="zap-input flex-1"
            style={{ maxWidth: 300 }}
          />
          <button className="zap-btn" onClick={() => setShowAdd(!showAdd)}>
            + Novo Contato
          </button>
          <button
            className="zap-btn-outline"
            onClick={() => setShowImport(true)}
            style={{ fontSize: 10, padding: "4px 10px" }}
          >
            📥 Importar
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 px-6 py-3 flex-shrink-0"
          style={{ background: "#0a0f1a", borderBottom: "1px solid #25d366" }}
        >
          <span style={{ fontSize: 12, color: "#25d366", fontWeight: 500 }}>
            {selectedIds.size} selecionado(s)
          </span>
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors"
            style={{ background: "#ef4444", color: "#fff", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#dc2626")}
            onMouseLeave={e => (e.currentTarget.style.background = "#ef4444")}
          >
            <Trash2 size={14} />
            Deletar {selectedIds.size}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors"
            style={{ background: "#3a4058", color: "#dde0ec", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#4a5068")}
            onMouseLeave={e => (e.currentTarget.style.background = "#3a4058")}
          >
            Limpar
          </button>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="zap-card mb-3 mx-6 mt-4" style={{ borderColor: "#25d366", borderWidth: 1 }}>
          <div className="zap-section-title">Novo contato</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Nome</label>
              <input
                className="zap-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="João Silva"
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Telefone</label>
              <input
                className="zap-input"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="+55 11 99999-0000"
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Tags</label>
              <input
                className="zap-input"
                value={newTags}
                onChange={e => setNewTags(e.target.value)}
                placeholder="cliente, vip"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="zap-btn"
              onClick={() => {
                if (!newName || !newPhone) {
                  toast.error("Preencha nome e telefone");
                  return;
                }
                createContact.mutate({
                  name: newName,
                  phone: newPhone,
                  tags: newTags ? newTags.split(",").map(t => t.trim()) : [],
                });
              }}
            >
              Salvar
            </button>
            <button className="zap-btn-outline" onClick={() => setShowAdd(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="zap-card mb-3 mx-6 mt-4" style={{ borderColor: "#25d366", borderWidth: 1 }}>
          <div className="zap-section-title">Editar contato</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Nome</label>
              <input
                className="zap-input"
                value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Telefone</label>
              <input
                className="zap-input"
                value={editing.phone}
                onChange={e => setEditing({ ...editing, phone: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Tags</label>
              <input
                className="zap-input"
                value={editing.tags}
                onChange={e => setEditing({ ...editing, tags: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Status</label>
              <select
                className="zap-input"
                value={editing.status}
                onChange={e => setEditing({ ...editing, status: e.target.value })}
                style={{ background: "#060809" }}
              >
                <option value="active" style={{ background: "#0c0f18" }}>
                  Ativo
                </option>
                <option value="inactive" style={{ background: "#0c0f18" }}>
                  Inativo
                </option>
                <option value="waiting" style={{ background: "#0c0f18" }}>
                  Aguardando
                </option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="zap-btn"
              onClick={() => {
                if (!editing.name || !editing.phone) {
                  toast.error("Preencha nome e telefone");
                  return;
                }
                updateContact.mutate({
                  id: editing.id,
                  name: editing.name,
                  phone: editing.phone,
                  tags: editing.tags ? editing.tags.split(",").map(t => t.trim()) : [],
                  status: editing.status as "active" | "inactive" | "waiting",
                });
              }}
            >
              Salvar alterações
            </button>
            <button className="zap-btn-outline" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="zap-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0c0f18" }}>
                <th
                  style={{
                    fontSize: 10,
                    color: "#343850",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                    padding: "6px 10px",
                    borderBottom: "0.5px solid #141720",
                    textAlign: "left",
                    fontWeight: 400,
                    width: 40,
                  }}
                >
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center justify-center"
                    style={{ width: 20, height: 20, cursor: "pointer" }}
                  >
                    {selectedIds.size === contacts.length && contacts.length > 0 ? (
                      <CheckSquare size={16} style={{ color: "#25d366" }} />
                    ) : (
                      <Square size={16} style={{ color: "#3a4058" }} />
                    )}
                  </button>
                </th>
                {["Nome", "Telefone", "Tags", "Fluxo atual", "Data", "Status", ""].map(h => (
                  <th
                    key={h}
                    style={{
                      fontSize: 10,
                      color: "#343850",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      padding: "6px 10px",
                      borderBottom: "0.5px solid #141720",
                      textAlign: "left",
                      fontWeight: 400,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr
                  key={c.id}
                  className="group"
                  style={{
                    cursor: "default",
                    background: selectedIds.has(c.id) ? "#0a1a1a" : "",
                  }}
                  onMouseEnter={e => {
                    if (!selectedIds.has(c.id)) {
                      e.currentTarget.style.background = "#0a0c14";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!selectedIds.has(c.id)) {
                      e.currentTarget.style.background = "";
                    }
                  }}
                >
                  <td style={{ fontSize: 11, color: "#9a9eb8", padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    <button
                      onClick={() => toggleSelectContact(c.id)}
                      className="flex items-center justify-center"
                      style={{ width: 20, height: 20, cursor: "pointer" }}
                    >
                      {selectedIds.has(c.id) ? (
                        <CheckSquare size={16} style={{ color: "#25d366" }} />
                      ) : (
                        <Square size={16} style={{ color: "#3a4058" }} />
                      )}
                    </button>
                  </td>
                  <td style={{ fontSize: 11, color: "#9a9eb8", padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center justify-center rounded-full text-xs font-bold ${AVATAR_COLORS[c.id % AVATAR_COLORS.length]}`}
                        style={{ width: 28, height: 28 }}
                      >
                        {getInitials(c.name)}
                      </div>
                      {c.name}
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: "#9a9eb8", padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    {c.phone}
                  </td>
                  <td style={{ fontSize: 11, color: "#9a9eb8", padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    <div className="flex gap-1 flex-wrap">
                      {(c.tags || []).map(tag => (
                        <span key={tag} className={`zap-tag ${TAG_COLORS[tag] || "zap-tag-muted"}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: "#9a9eb8", padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    {c.currentFlow || "—"}
                  </td>
                  <td style={{ fontSize: 11, color: "#9a9eb8", padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td style={{ fontSize: 11, color: "#9a9eb8", padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    <span className={`zap-tag ${c.status === "active" ? "zap-tag-green" : c.status === "inactive" ? "zap-tag-red" : "zap-tag-amber"}`}>
                      {c.status === "active" ? "Ativo" : c.status === "inactive" ? "Inativo" : "Aguardando"}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: "#9a9eb8", padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setHistoryContact(c)}
                        className="flex items-center justify-center"
                        style={{ width: 24, height: 24, color: "#3a4058", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#25d366")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#3a4058")}
                        title="Ver histórico"
                      >
                        <History size={14} />
                      </button>
                      <button
                        onClick={() =>
                          setEditing({
                            id: c.id,
                            name: c.name,
                            phone: c.phone,
                            tags: (c.tags || []).join(", "),
                            status: c.status,
                          })
                        }
                        className="flex items-center justify-center"
                        style={{ width: 24, height: 24, color: "#3a4058", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#378add")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#3a4058")}
                        title="Editar"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Deletar ${c.name}?`)) {
                            deleteContact.mutate({ id: c.id });
                          }
                        }}
                        className="flex items-center justify-center"
                        style={{ width: 24, height: 24, color: "#3a4058", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#3a4058")}
                        title="Deletar"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showImport && <ImportContactsModal onClose={() => setShowImport(false)} onSuccess={() => { utils.contacts.list.invalidate(); setShowImport(false); }} />}
      {historyContact && <ContactHistoryDrawer contact={historyContact} onClose={() => setHistoryContact(null)} />}
    </div>
  );
}
