import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { GitBranch, Play, Pause, Copy, Trash2, Plus, Zap, Clock, Tag, Users } from "lucide-react";
import DispatchFlowModal from "@/components/DispatchFlowModal";

type DispatchTarget = { id: number; name: string } | null;

function formatDate(d: Date | string) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function FlowList() {
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [dispatchTarget, setDispatchTarget] = useState<DispatchTarget>(null);
  const [showDispatchHistory, setShowDispatchHistory] = useState(false);

  const utils = trpc.useUtils();
  const flowsQuery = trpc.flows.list.useQuery();
  const allDispatchesQuery = trpc.flows.getAllDispatches.useQuery();

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
  const allDispatches = allDispatchesQuery.data || [];

  return (
    <>
      <div className="flex items-center px-3.5 gap-2 flex-shrink-0" style={{ height: 42, borderBottom: "0.5px solid #141720" }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Editor de Fluxos</span>
        <span style={{ fontSize: 11, color: "#343850" }}>{flows.length} fluxos</span>
        <div className="ml-auto flex gap-2">
          <button
            className="zap-btn-outline flex items-center gap-1"
            style={{ fontSize: 11 }}
            onClick={() => setShowDispatchHistory(h => !h)}
          >
            <Clock size={11} /> Histórico
          </button>
          <button className="zap-btn flex items-center gap-1" onClick={() => setShowCreate(true)}>
            <Plus size={12} /> Novo fluxo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 zap-scroll" style={{ background: "#080b0e" }}>

        {/* Dispatch History Panel */}
        {showDispatchHistory && (
          <div className="zap-card mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="zap-section-title" style={{ marginBottom: 0 }}>Histórico de Disparos</div>
              <span style={{ fontSize: 10, color: "#343850" }}>{allDispatches.length} registros</span>
            </div>
            {allDispatches.length === 0 ? (
              <p style={{ fontSize: 10, color: "#343850", textAlign: "center", padding: "12px 0" }}>
                Nenhum disparo realizado ainda. Use o botão <Zap size={10} style={{ display: "inline" }} /> em um fluxo para disparar.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {allDispatches.map(d => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "#080b0e", borderRadius: 5, border: "0.5px solid #141720" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: "#0c2218", border: "0.5px solid #153520", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Zap size={12} style={{ color: "#25d366" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: "#c8cde0", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d.flowName}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 9, color: "#343850" }}>{formatDate(d.createdAt)}</span>
                        {(d.tags as string[]).length > 0 ? (
                          <>
                            <span style={{ fontSize: 9, color: "#1e2235" }}>·</span>
                            {(d.tags as string[]).slice(0, 3).map(t => (
                              <span key={t} style={{ fontSize: 8, background: "#0c2218", color: "#25d366", borderRadius: 8, padding: "1px 5px", border: "0.5px solid #153520" }}>
                                <Tag size={7} style={{ display: "inline", marginRight: 2 }} />{t}
                              </span>
                            ))}
                            {(d.tags as string[]).length > 3 && (
                              <span style={{ fontSize: 8, color: "#343850" }}>+{(d.tags as string[]).length - 3}</span>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: 9, color: "#343850" }}>· todos os contatos</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <Users size={11} style={{ color: "#25d366" }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#25d366" }}>{d.totalContacts}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="zap-card mb-3">
            <div className="zap-section-title">Criar novo fluxo</div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Nome do fluxo</label>
                <input
                  className="zap-input"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Funil de vendas"
                  onKeyDown={e => { if (e.key === "Enter" && newName.trim()) createFlow.mutate({ name: newName.trim() }); }}
                  autoFocus
                />
              </div>
              <button className="zap-btn" onClick={() => {
                if (!newName.trim()) { toast.error("Digite um nome"); return; }
                createFlow.mutate({ name: newName.trim() });
              }}>Criar</button>
              <button className="zap-btn-outline" onClick={() => setShowCreate(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {flows.length === 0 && !showCreate && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <GitBranch size={40} style={{ color: "#1e2235" }} />
            <p style={{ fontSize: 13, color: "#343850" }}>Nenhum fluxo criado ainda</p>
            <button className="zap-btn" onClick={() => setShowCreate(true)}>Criar primeiro fluxo</button>
          </div>
        )}

        {/* Flow list */}
        <div className="flex flex-col gap-2">
          {flows.map(f => {
            // Count dispatches for this flow
            const dispatchCount = allDispatches.filter(d => d.flowId === f.id).length;
            const lastDispatch = allDispatches.find(d => d.flowId === f.id);

            return (
              <div
                key={f.id}
                className="zap-card flex items-center gap-3 group"
                style={{ cursor: "pointer" }}
                onClick={() => setLocation(`/app/flows/${f.id}`)}
              >
                {/* Icon */}
                <div
                  className="flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{
                    width: 36, height: 36,
                    background: f.status === "active" ? "#0a2016" : f.status === "paused" ? "#271800" : "#0c0f18",
                  }}
                >
                  <GitBranch size={16} style={{ color: f.status === "active" ? "#25d366" : f.status === "paused" ? "#ef9f27" : "#3a4058" }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#c8cad8" }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: "#343850", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Atualizado {new Date(f.updatedAt).toLocaleDateString("pt-BR")}</span>
                    {dispatchCount > 0 && (
                      <>
                        <span style={{ color: "#1e2235" }}>·</span>
                        <span style={{ color: "#25d366", display: "flex", alignItems: "center", gap: 2 }}>
                          <Zap size={8} /> {dispatchCount} disparo{dispatchCount !== 1 ? "s" : ""}
                        </span>
                        {lastDispatch && (
                          <>
                            <span style={{ color: "#1e2235" }}>·</span>
                            <span>último: {formatDate(lastDispatch.createdAt)}</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <span className={`zap-tag ${f.status === "active" ? "zap-tag-green" : f.status === "paused" ? "zap-tag-amber" : "zap-tag-muted"}`}>
                  {f.status === "active" ? "ativo" : f.status === "paused" ? "pausado" : "rascunho"}
                </span>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  {/* Dispatch button — always visible when active */}
                  <button
                    className="zap-btn flex items-center gap-1"
                    style={{ padding: "3px 8px", fontSize: 10 }}
                    onClick={e => { e.stopPropagation(); setDispatchTarget({ id: f.id, name: f.name }); }}
                    title="Disparar fluxo por segmento"
                  >
                    <Zap size={10} /> Disparar
                  </button>

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
            );
          })}
        </div>
      </div>

      {/* Dispatch Modal */}
      {dispatchTarget && (
        <DispatchFlowModal
          flowId={dispatchTarget.id}
          flowName={dispatchTarget.name}
          onClose={() => {
            setDispatchTarget(null);
            utils.flows.getAllDispatches.invalidate();
          }}
        />
      )}
    </>
  );
}
