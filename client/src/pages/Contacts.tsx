import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import ImportContactsModal from "@/components/ImportContactsModal";

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

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTags, setNewTags] = useState("");
  const [editing, setEditing] = useState<EditingContact>(null);
  const [showImport, setShowImport] = useState(false);

  const utils = trpc.useUtils();
  const contactsQuery = trpc.contacts.list.useQuery();
  const createContact = trpc.contacts.create.useMutation({
    onSuccess: () => { utils.contacts.list.invalidate(); setShowAdd(false); setNewName(""); setNewPhone(""); setNewTags(""); toast.success("Contato criado!"); },
  });
  const updateContact = trpc.contacts.update.useMutation({
    onSuccess: () => { utils.contacts.list.invalidate(); setEditing(null); toast.success("Contato atualizado!"); },
  });
  const deleteContact = trpc.contacts.delete.useMutation({
    onSuccess: () => { utils.contacts.list.invalidate(); toast.success("Contato removido"); },
  });

  const contacts = (contactsQuery.data || []).filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const startEdit = (c: any) => {
    setEditing({
      id: c.id,
      name: c.name,
      phone: c.phone,
      tags: (c.tags as string[] || []).join(", "),
      status: c.status,
    });
  };

  return (
    <>
      <div className="flex items-center px-3.5 gap-2 flex-shrink-0" style={{ height: 42, borderBottom: "0.5px solid #141720" }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Contatos</span>
        <span style={{ fontSize: 11, color: "#343850" }}>{contacts.length} contatos cadastrados</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 zap-scroll" style={{ background: "#080b0e" }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1.5 items-center">
            <input
              className="zap-input"
              placeholder="Buscar nome, telefone, tag..."
              style={{ width: 200 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="zap-btn-outline"
              onClick={() => setShowImport(true)}
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
            >
              ↑ Importar CSV/Excel
            </button>
            <button className="zap-btn" onClick={() => setShowAdd(true)}>+ Novo contato</button>
          </div>
        </div>

        {/* Add modal */}
        {showAdd && (
          <div className="zap-card mb-3">
            <div className="zap-section-title">Novo contato</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Nome</label>
                <input className="zap-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Telefone</label>
                <input className="zap-input" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+55 11 99999-0000" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Tags (separadas por virgula)</label>
                <input className="zap-input" value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="cliente, vip" />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="zap-btn" onClick={() => {
                if (!newName || !newPhone) { toast.error("Preencha nome e telefone"); return; }
                createContact.mutate({ name: newName, phone: newPhone, tags: newTags ? newTags.split(",").map(t => t.trim()) : [] });
              }}>Salvar</button>
              <button className="zap-btn-outline" onClick={() => setShowAdd(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editing && (
          <div className="zap-card mb-3" style={{ borderColor: "#25d366", borderWidth: 1 }}>
            <div className="zap-section-title">Editar contato</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Nome</label>
                <input className="zap-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Telefone</label>
                <input className="zap-input" value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Tags</label>
                <input className="zap-input" value={editing.tags} onChange={e => setEditing({ ...editing, tags: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Status</label>
                <select className="zap-input" value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} style={{ background: "#060809" }}>
                  <option value="active" style={{ background: "#0c0f18" }}>Ativo</option>
                  <option value="inactive" style={{ background: "#0c0f18" }}>Inativo</option>
                  <option value="waiting" style={{ background: "#0c0f18" }}>Aguardando</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="zap-btn" onClick={() => {
                if (!editing.name || !editing.phone) { toast.error("Preencha nome e telefone"); return; }
                updateContact.mutate({
                  id: editing.id,
                  name: editing.name,
                  phone: editing.phone,
                  tags: editing.tags ? editing.tags.split(",").map(t => t.trim()) : [],
                  status: editing.status as "active" | "inactive" | "waiting",
                });
              }}>Salvar alteracoes</button>
              <button className="zap-btn-outline" onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="zap-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Nome", "Telefone", "Tags", "Fluxo atual", "Data", "Status", ""].map(h => (
                  <th key={h} style={{ fontSize: 10, color: "#343850", textTransform: "uppercase", letterSpacing: 0.4, padding: "6px 10px", borderBottom: "0.5px solid #141720", textAlign: "left", fontWeight: 400 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c, i) => (
                <tr key={c.id} className="group" style={{ cursor: "default" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#0a0c14")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <td style={{ fontSize: 11, color: "#9a9eb8", padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    <div className="flex items-center gap-1.5">
                      <div className={`zap-avatar ${AVATAR_COLORS[i % 4]}`} style={{ width: 22, height: 22, fontSize: 9 }}>
                        {getInitials(c.name)}
                      </div>
                      {c.name}
                    </div>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: 10, color: "#9a9eb8", padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    {c.phone}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    {(c.tags as string[] || []).map((t: string) => (
                      <span key={t} className={`zap-tag ${TAG_COLORS[t] || "zap-tag-blue"}`} style={{ marginRight: 3 }}>{t}</span>
                    ))}
                  </td>
                  <td style={{ color: "#343850", fontSize: 10, padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    {c.currentFlow || "—"}
                  </td>
                  <td style={{ color: "#252838", fontSize: 10, padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    {new Date(c.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    <span className={`zap-tag ${c.status === "active" ? "zap-tag-green" : c.status === "waiting" ? "zap-tag-amber" : "zap-tag-red"}`}>
                      {c.status === "active" ? "ativo" : c.status === "waiting" ? "aguardando" : "inativo"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "0.5px solid #0c0f18" }}>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="zap-btn-outline"
                        style={{ fontSize: 9, padding: "2px 6px" }}
                        onClick={() => startEdit(c)}
                      >
                        Editar
                      </button>
                      <button
                        className="zap-btn-outline"
                        style={{ fontSize: 9, padding: "2px 6px", color: "#e24b4a", borderColor: "#3a1010" }}
                        onClick={() => deleteContact.mutate({ id: c.id })}
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 9, fontSize: 10, color: "#343850", textAlign: "center" }}>
          Exibindo {contacts.length} contatos
        </div>
      </div>

      {showImport && (
        <ImportContactsModal
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            utils.contacts.list.invalidate();
            setShowImport(false);
          }}
        />
      )}
    </>
  );
}
