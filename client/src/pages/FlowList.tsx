import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { GitBranch, Play, Pause, Copy, Trash2, Plus } from "lucide-react";

export default function FlowList() {
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const utils = trpc.useUtils();
  const flowsQuery = trpc.flows.list.useQuery();
  const createFlow = trpc.flows.create.useMutation({
    onSuccess: (data) => {
      utils.flows.list.invalidate();
      setShowCreate(false);
      setNewName("");
      toast.success("Fluxo criado!");
      setLocation(`/app/flows/${data.id}`);
    },
  });
  const updateFlow = trpc.flows.update.useMutation({
    onSuccess: () => { utils.flows.list.invalidate(); },
  });
  const deleteFlow = trpc.flows.delete.useMutation({
    onSuccess: () => { utils.flows.list.invalidate(); toast.success("Fluxo removido"); },
  });
  const duplicateFlow = trpc.flows.duplicate.useMutation({
    onSuccess: () => { utils.flows.list.invalidate(); toast.success("Fluxo duplicado!"); },
  });

  const flows = flowsQuery.data || [];

  return (
    <>
      <div className="flex items-center px-3.5 gap-2 flex-shrink-0" style={{ height: 42, borderBottom: "0.5px solid #141720" }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Editor de Fluxos</span>
        <span style={{ fontSize: 11, color: "#343850" }}>{flows.length} fluxos</span>
        <div className="ml-auto">
          <button className="zap-btn flex items-center gap-1" onClick={() => setShowCreate(true)}>
            <Plus size={12} /> Novo fluxo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 zap-scroll" style={{ background: "#080b0e" }}>
        {/* Create modal */}
        {showCreate && (
          <div className="zap-card mb-3">
            <div className="zap-section-title">Criar novo fluxo</div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Nome do fluxo</label>
                <input className="zap-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Funil de vendas" />
              </div>
              <button className="zap-btn" onClick={() => {
                if (!newName.trim()) { toast.error("Digite um nome"); return; }
                createFlow.mutate({ name: newName.trim() });
              }}>Criar</button>
              <button className="zap-btn-outline" onClick={() => setShowCreate(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Flow list */}
        {flows.length === 0 && !showCreate && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <GitBranch size={40} style={{ color: "#1e2235" }} />
            <p style={{ fontSize: 13, color: "#343850" }}>Nenhum fluxo criado ainda</p>
            <button className="zap-btn" onClick={() => setShowCreate(true)}>Criar primeiro fluxo</button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {flows.map(f => (
            <div
              key={f.id}
              className="zap-card flex items-center gap-3 group"
              style={{ cursor: "pointer" }}
              onClick={() => setLocation(`/app/flows/${f.id}`)}
            >
              <div
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: 36,
                  height: 36,
                  background: f.status === "active" ? "#0a2016" : f.status === "paused" ? "#271800" : "#0c0f18",
                }}
              >
                <GitBranch size={16} style={{ color: f.status === "active" ? "#25d366" : f.status === "paused" ? "#ef9f27" : "#3a4058" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 12, fontWeight: 500, color: "#c8cad8" }}>{f.name}</div>
                <div style={{ fontSize: 10, color: "#343850" }}>
                  Atualizado {new Date(f.updatedAt).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <span className={`zap-tag ${f.status === "active" ? "zap-tag-green" : f.status === "paused" ? "zap-tag-amber" : "zap-tag-muted"}`}>
                {f.status === "active" ? "ativo" : f.status === "paused" ? "pausado" : "rascunho"}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                {f.status !== "active" ? (
                  <button className="zap-btn-outline" style={{ padding: "3px 6px" }} onClick={() => updateFlow.mutate({ id: f.id, status: "active" })} title="Ativar">
                    <Play size={10} />
                  </button>
                ) : (
                  <button className="zap-btn-outline" style={{ padding: "3px 6px" }} onClick={() => updateFlow.mutate({ id: f.id, status: "paused" })} title="Pausar">
                    <Pause size={10} />
                  </button>
                )}
                <button className="zap-btn-outline" style={{ padding: "3px 6px" }} onClick={() => duplicateFlow.mutate({ id: f.id })} title="Duplicar">
                  <Copy size={10} />
                </button>
                <button className="zap-btn-outline" style={{ padding: "3px 6px", color: "#e24b4a", borderColor: "#3a1010" }} onClick={() => deleteFlow.mutate({ id: f.id })} title="Excluir">
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
