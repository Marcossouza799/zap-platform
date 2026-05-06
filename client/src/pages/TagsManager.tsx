import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Copy } from "lucide-react";

interface Tag {
  id: number;
  name: string;
  color: string;
  usageCount: number;
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#6b7280", // gray
  "#25d366", // whatsapp green
];

export default function TagsManager() {
  const [tags, setTags] = useState<Tag[]>([
    { id: 1, name: "Urgente", color: "#ef4444", usageCount: 12 },
    { id: 2, name: "VIP", color: "#25d366", usageCount: 8 },
    { id: 3, name: "Seguimento", color: "#378add", usageCount: 15 },
    { id: 4, name: "Resolvido", color: "#22c55e", usageCount: 23 },
    { id: 5, name: "Em Progresso", color: "#eab308", usageCount: 5 },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);

  const handleAddTag = () => {
    if (!newTagName.trim()) {
      toast.error("Digite um nome para a etiqueta");
      return;
    }

    if (tags.some(t => t.name.toLowerCase() === newTagName.toLowerCase())) {
      toast.error("Etiqueta com este nome já existe");
      return;
    }

    const newTag: Tag = {
      id: Math.max(...tags.map(t => t.id), 0) + 1,
      name: newTagName,
      color: newTagColor,
      usageCount: 0,
    };

    setTags([...tags, newTag]);
    setNewTagName("");
    setNewTagColor(PRESET_COLORS[0]);
    setShowAddForm(false);
    toast.success("Etiqueta criada!");
  };

  const handleUpdateTag = (id: number, name: string, color: string) => {
    if (!name.trim()) {
      toast.error("Digite um nome para a etiqueta");
      return;
    }

    if (tags.some(t => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Etiqueta com este nome já existe");
      return;
    }

    setTags(tags.map(t => (t.id === id ? { ...t, name, color } : t)));
    setEditingId(null);
    toast.success("Etiqueta atualizada!");
  };

  const handleDeleteTag = (id: number) => {
    const tag = tags.find(t => t.id === id);
    if (!tag) return;

    if (tag.usageCount > 0) {
      if (!confirm(`Esta etiqueta está sendo usada em ${tag.usageCount} contato(s). Tem certeza que deseja deletar?`)) {
        return;
      }
    }

    setTags(tags.filter(t => t.id !== id));
    toast.success("Etiqueta removida!");
  };

  const handleDuplicateTag = (tag: Tag) => {
    const newTag: Tag = {
      id: Math.max(...tags.map(t => t.id), 0) + 1,
      name: `${tag.name} (cópia)`,
      color: tag.color,
      usageCount: 0,
    };

    setTags([...tags, newTag]);
    toast.success("Etiqueta duplicada!");
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#080b0e", color: "#dde0ec" }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: "#141720" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Etiquetas</h1>
            <p style={{ fontSize: 12, color: "#5a5f7a" }}>
              Gerencie etiquetas para organizar contatos e conversas
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 rounded transition-colors"
            style={{ background: "#25d366", color: "#000", cursor: "pointer", fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#20ba5a")}
            onMouseLeave={e => (e.currentTarget.style.background = "#25d366")}
          >
            <Plus size={16} />
            Nova Etiqueta
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: "#141720", background: "#0a0c14" }}>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label style={{ fontSize: 11, color: "#3a4058", display: "block", marginBottom: 6 }}>
                Nome da Etiqueta
              </label>
              <input
                type="text"
                placeholder="Ex: Cliente VIP"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                className="zap-input w-full"
                onKeyPress={e => e.key === "Enter" && handleAddTag()}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: "#3a4058", display: "block", marginBottom: 6 }}>
                Cor
              </label>
              <div className="flex gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className="rounded transition-transform"
                    style={{
                      width: 32,
                      height: 32,
                      background: color,
                      border: newTagColor === color ? "2px solid #dde0ec" : "1px solid #141720",
                      cursor: "pointer",
                      transform: newTagColor === color ? "scale(1.1)" : "scale(1)",
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddTag}
                className="px-4 py-2 rounded transition-colors"
                style={{ background: "#25d366", color: "#000", cursor: "pointer", fontWeight: 500 }}
                onMouseEnter={e => (e.currentTarget.style.background = "#20ba5a")}
                onMouseLeave={e => (e.currentTarget.style.background = "#25d366")}
              >
                Criar
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded transition-colors"
                style={{ background: "#3a4058", color: "#dde0ec", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#4a5068")}
                onMouseLeave={e => (e.currentTarget.style.background = "#3a4058")}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tags Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tags.length === 0 ? (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: "#5a5f7a", fontSize: 14 }}
          >
            Nenhuma etiqueta criada
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map(tag => (
              <div
                key={tag.id}
                className="zap-card p-4 transition-all hover:shadow-lg"
                style={{
                  borderLeft: `4px solid ${tag.color}`,
                  background: "#0c0f18",
                }}
              >
                {editingId === tag.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <input
                      type="text"
                      defaultValue={tag.name}
                      onChange={e => {
                        const newName = e.target.value;
                        setTags(
                          tags.map(t =>
                            t.id === tag.id ? { ...t, name: newName } : t
                          )
                        );
                      }}
                      className="zap-input w-full"
                      placeholder="Nome da etiqueta"
                    />
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => {
                            setTags(
                              tags.map(t =>
                                t.id === tag.id ? { ...t, color } : t
                              )
                            );
                          }}
                          className="rounded transition-transform"
                          style={{
                            width: 24,
                            height: 24,
                            background: color,
                            border:
                              tags.find(t => t.id === tag.id)?.color === color
                                ? "2px solid #dde0ec"
                                : "1px solid #141720",
                            cursor: "pointer",
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const updatedTag = tags.find(t => t.id === tag.id);
                          if (updatedTag) {
                            handleUpdateTag(tag.id, updatedTag.name, updatedTag.color);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 rounded text-xs transition-colors"
                        style={{ background: "#25d366", color: "#000", cursor: "pointer", fontWeight: 500 }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#20ba5a")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#25d366")}
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 px-3 py-1.5 rounded text-xs transition-colors"
                        style={{ background: "#3a4058", color: "#dde0ec", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#4a5068")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#3a4058")}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div
                          className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                          style={{ background: tag.color, color: "#000" }}
                        >
                          {tag.name}
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div style={{ fontSize: 11, color: "#5a5f7a", marginBottom: 2 }}>
                        Cor: {tag.color}
                      </div>
                      <div style={{ fontSize: 11, color: "#5a5f7a" }}>
                        Usada em {tag.usageCount} contato{tag.usageCount !== 1 ? "s" : ""}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(tag.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs transition-colors"
                        style={{ background: "#378add", color: "#fff", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#2563eb")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#378add")}
                      >
                        <Edit2 size={12} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDuplicateTag(tag)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs transition-colors"
                        style={{ background: "#3a4058", color: "#dde0ec", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#4a5068")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#3a4058")}
                      >
                        <Copy size={12} />
                        Copiar
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs transition-colors"
                        style={{ background: "#ef4444", color: "#fff", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#dc2626")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#ef4444")}
                      >
                        <Trash2 size={12} />
                        Deletar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
