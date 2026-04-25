import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  X, Zap, Tag, Users, CheckCircle2, Clock, ChevronRight, AlertCircle,
} from "lucide-react";

interface Props {
  flowId: number;
  flowName: string;
  onClose: () => void;
}

type Step = "segment" | "confirm" | "done";

function formatDate(d: Date | string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function DispatchFlowModal({ flowId, flowName, onClose }: Props) {
  const [step, setStep] = useState<Step>("segment");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dispatchResult, setDispatchResult] = useState<{ dispatched: number; flowName: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Load all available tags from contacts
  const tagsQuery = trpc.flows.getContactTags.useQuery();

  // Live segment preview (debounced via mutation)
  const previewMutation = trpc.flows.previewSegment.useMutation();

  // Dispatch mutation
  const dispatchMutation = trpc.flows.dispatch.useMutation();

  // Dispatch history for this flow
  const historyQuery = trpc.flows.getDispatches.useQuery({ flowId });

  const utils = trpc.useUtils();

  // Re-run preview whenever selectedTags changes
  useEffect(() => {
    previewMutation.mutate({ tags: selectedTags });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleDispatch = async () => {
    try {
      const result = await dispatchMutation.mutateAsync({ flowId, tags: selectedTags });
      setDispatchResult(result);
      setStep("done");
      utils.flows.getDispatches.invalidate({ flowId });
      utils.flows.getAllDispatches.invalidate();
      utils.contacts.list.invalidate();
      toast.success(`Fluxo disparado para ${result.dispatched} contatos!`);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao disparar fluxo");
    }
  };

  const segmentTotal = previewMutation.data?.total ?? 0;
  const segmentPreview = previewMutation.data?.preview ?? [];
  const allTags = tagsQuery.data ?? [];

  // ---- Styles ----
  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const modal: React.CSSProperties = {
    background: "#0c0f18", border: "0.5px solid #1e2235", borderRadius: 10,
    width: "min(580px, 96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column",
    overflow: "hidden",
  };
  const header: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "13px 16px", borderBottom: "0.5px solid #141720",
  };
  const body: React.CSSProperties = { padding: "16px", overflowY: "auto", flex: 1 };
  const footer: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "11px 16px", borderTop: "0.5px solid #141720", gap: 8,
  };

  const tagBtn = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 500,
    cursor: "pointer", border: "none", transition: "all 0.12s",
    background: active ? "#0c2218" : "#0c0f18",
    color: active ? "#25d366" : "#5a5f7a",
    outline: active ? "1px solid #153520" : "1px solid #1e2235",
  });

  const stepLabels = ["Segmento", "Confirmação"];
  const stepIndex = step === "segment" ? 0 : step === "confirm" ? 1 : 2;

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>

        {/* Header */}
        <div style={header}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#0c2218", border: "0.5px solid #153520", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={13} style={{ color: "#25d366" }} />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#e8ecf5", margin: 0 }}>Disparar Fluxo</p>
              <p style={{ fontSize: 10, color: "#343850", margin: 0 }}>{flowName}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setShowHistory(h => !h)}
              style={{ fontSize: 10, color: showHistory ? "#25d366" : "#5a5f7a", background: "none", border: "none", cursor: "pointer", padding: "3px 7px", borderRadius: 4, outline: showHistory ? "1px solid #153520" : "1px solid #1e2235" }}
            >
              <Clock size={10} style={{ display: "inline", marginRight: 4 }} />
              Histórico
            </button>
            <button onClick={onClose} style={{ color: "#5a5f7a", background: "none", border: "none", cursor: "pointer" }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Step indicator */}
        {step !== "done" && (
          <div style={{ display: "flex", alignItems: "center", padding: "9px 16px", gap: 0, borderBottom: "0.5px solid #141720" }}>
            {stepLabels.map((label, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center", flex: i < stepLabels.length - 1 ? 1 : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{
                    width: 17, height: 17, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700,
                    background: i < stepIndex ? "#0c2218" : i === stepIndex ? "#25d366" : "#141720",
                    color: i < stepIndex ? "#25d366" : i === stepIndex ? "#080b0e" : "#5a5f7a",
                    border: i < stepIndex ? "0.5px solid #153520" : "none",
                  }}>
                    {i < stepIndex ? <CheckCircle2 size={9} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 10, color: i === stepIndex ? "#c8cde0" : "#5a5f7a" }}>{label}</span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: i < stepIndex ? "#153520" : "#141720", margin: "0 8px" }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={body}>

          {/* ---- History panel (overlay inside body) ---- */}
          {showHistory && (
            <div style={{ marginBottom: 16, background: "#080b0e", border: "0.5px solid #141720", borderRadius: 7, padding: "10px 12px" }}>
              <p style={{ fontSize: 10, color: "#5a5f7a", marginBottom: 8, fontWeight: 600 }}>HISTÓRICO DE DISPAROS</p>
              {historyQuery.isLoading ? (
                <p style={{ fontSize: 10, color: "#343850" }}>Carregando...</p>
              ) : (historyQuery.data ?? []).length === 0 ? (
                <p style={{ fontSize: 10, color: "#343850" }}>Nenhum disparo registrado ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(historyQuery.data ?? []).map(d => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "#0c0f18", borderRadius: 5, border: "0.5px solid #141720" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Users size={11} style={{ color: "#25d366" }} />
                        <span style={{ fontSize: 10, color: "#c8cde0" }}>{d.totalContacts} contatos</span>
                        {(d.tags as string[]).length > 0 ? (
                          <div style={{ display: "flex", gap: 3 }}>
                            {(d.tags as string[]).slice(0, 3).map(t => (
                              <span key={t} style={{ fontSize: 9, background: "#0c2218", color: "#25d366", borderRadius: 10, padding: "1px 6px", border: "0.5px solid #153520" }}>{t}</span>
                            ))}
                            {(d.tags as string[]).length > 3 && <span style={{ fontSize: 9, color: "#343850" }}>+{(d.tags as string[]).length - 3}</span>}
                          </div>
                        ) : (
                          <span style={{ fontSize: 9, color: "#343850" }}>todos</span>
                        )}
                      </div>
                      <span style={{ fontSize: 9, color: "#343850" }}>{formatDate(d.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- STEP 1: Segment ---- */}
          {step === "segment" && (
            <div>
              <p style={{ fontSize: 11, color: "#5a5f7a", marginBottom: 12 }}>
                Selecione as <strong style={{ color: "#c8cde0" }}>tags</strong> dos contatos que devem receber este fluxo.
                Deixe em branco para disparar para <strong style={{ color: "#c8cde0" }}>todos os contatos</strong>.
              </p>

              {/* Tag selector */}
              {tagsQuery.isLoading ? (
                <p style={{ fontSize: 10, color: "#343850" }}>Carregando tags...</p>
              ) : allTags.length === 0 ? (
                <div style={{ background: "#0c0f18", border: "0.5px solid #141720", borderRadius: 6, padding: "12px", textAlign: "center" }}>
                  <Tag size={16} style={{ color: "#343850", margin: "0 auto 6px" }} />
                  <p style={{ fontSize: 10, color: "#343850" }}>Nenhuma tag encontrada nos seus contatos.</p>
                  <p style={{ fontSize: 9, color: "#1e2235" }}>Adicione tags aos contatos para segmentar disparos.</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: "#5a5f7a" }}>Tags disponíveis ({allTags.length})</span>
                    {selectedTags.length > 0 && (
                      <button
                        onClick={() => setSelectedTags([])}
                        style={{ fontSize: 9, color: "#5a5f7a", background: "none", border: "none", cursor: "pointer" }}
                      >
                        Limpar seleção
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        style={tagBtn(selectedTags.includes(tag))}
                      >
                        <Tag size={9} />
                        {tag}
                        {selectedTags.includes(tag) && <X size={8} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live preview */}
              <div style={{ marginTop: 16, background: "#080b0e", border: "0.5px solid #141720", borderRadius: 7, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Users size={12} style={{ color: "#25d366" }} />
                    <span style={{ fontSize: 11, color: "#c8cde0", fontWeight: 600 }}>
                      {previewMutation.isPending ? "Calculando..." : (
                        <><span style={{ color: "#25d366" }}>{segmentTotal}</span> contatos serão atingidos</>
                      )}
                    </span>
                  </div>
                  {selectedTags.length === 0 && (
                    <span style={{ fontSize: 9, background: "#0c2218", color: "#25d366", borderRadius: 10, padding: "2px 7px", border: "0.5px solid #153520" }}>
                      todos os contatos
                    </span>
                  )}
                </div>

                {segmentPreview.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {segmentPreview.map(c => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", borderRadius: 4, background: "#0c0f18" }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#0c2218", border: "0.5px solid #153520", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#25d366", flexShrink: 0 }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 10, color: "#c8cde0", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                          <p style={{ fontSize: 9, color: "#343850", margin: 0 }}>{c.phone}</p>
                        </div>
                        <div style={{ display: "flex", gap: 3 }}>
                          {c.tags.slice(0, 2).map(t => (
                            <span key={t} style={{ fontSize: 8, background: "#0c2218", color: "#25d366", borderRadius: 8, padding: "1px 5px" }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {segmentTotal > segmentPreview.length && (
                      <p style={{ fontSize: 9, color: "#343850", textAlign: "center", marginTop: 2 }}>
                        + {segmentTotal - segmentPreview.length} outros contatos
                      </p>
                    )}
                  </div>
                )}

                {segmentTotal === 0 && !previewMutation.isPending && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0" }}>
                    <AlertCircle size={12} style={{ color: "#ef9f27" }} />
                    <span style={{ fontSize: 10, color: "#ef9f27" }}>
                      {selectedTags.length > 0
                        ? "Nenhum contato possui as tags selecionadas."
                        : "Você ainda não tem contatos cadastrados."}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---- STEP 2: Confirm ---- */}
          {step === "confirm" && (
            <div>
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#0c2218", border: "1.5px solid #153520", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <Zap size={20} style={{ color: "#25d366" }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#e8ecf5", marginBottom: 6 }}>Confirmar disparo</p>
                <p style={{ fontSize: 11, color: "#5a5f7a" }}>
                  O fluxo <strong style={{ color: "#c8cde0" }}>{flowName}</strong> será disparado para{" "}
                  <strong style={{ color: "#25d366", fontSize: 13 }}>{segmentTotal}</strong> contato{segmentTotal !== 1 ? "s" : ""}.
                </p>
              </div>

              <div style={{ background: "#080b0e", border: "0.5px solid #141720", borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "#5a5f7a" }}>Fluxo</span>
                  <span style={{ fontSize: 10, color: "#c8cde0" }}>{flowName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "#5a5f7a" }}>Segmento</span>
                  <span style={{ fontSize: 10, color: "#c8cde0" }}>
                    {selectedTags.length === 0 ? "Todos os contatos" : selectedTags.join(", ")}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "#5a5f7a" }}>Total de contatos</span>
                  <span style={{ fontSize: 10, color: "#25d366", fontWeight: 600 }}>{segmentTotal}</span>
                </div>
              </div>

              {dispatchMutation.isPending && (
                <p style={{ textAlign: "center", fontSize: 11, color: "#25d366", marginTop: 12 }}>Disparando...</p>
              )}
            </div>
          )}

          {/* ---- DONE ---- */}
          {step === "done" && dispatchResult && (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#0c2218", border: "1.5px solid #153520", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <CheckCircle2 size={22} style={{ color: "#25d366" }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#e8ecf5", marginBottom: 6 }}>Fluxo disparado!</p>
              <p style={{ fontSize: 11, color: "#5a5f7a", marginBottom: 16 }}>
                <strong style={{ color: "#25d366", fontSize: 18 }}>{dispatchResult.dispatched}</strong> contatos foram adicionados ao fluxo{" "}
                <strong style={{ color: "#c8cde0" }}>{dispatchResult.flowName}</strong>.
              </p>
              {selectedTags.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 5, flexWrap: "wrap" }}>
                  {selectedTags.map(t => (
                    <span key={t} style={{ fontSize: 10, background: "#0c2218", color: "#25d366", borderRadius: 12, padding: "3px 9px", border: "0.5px solid #153520" }}>
                      <Tag size={8} style={{ display: "inline", marginRight: 3 }} />{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footer}>
          {step === "done" ? (
            <button
              onClick={onClose}
              style={{ marginLeft: "auto", background: "#25d366", color: "#080b0e", border: "none", borderRadius: 5, padding: "6px 18px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
            >
              Fechar
            </button>
          ) : step === "segment" ? (
            <>
              <button
                onClick={onClose}
                style={{ background: "none", border: "0.5px solid #1e2235", borderRadius: 5, padding: "6px 12px", fontSize: 11, color: "#c8cde0", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                disabled={segmentTotal === 0 || previewMutation.isPending}
                onClick={() => setStep("confirm")}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: segmentTotal > 0 ? "#25d366" : "#141720",
                  color: segmentTotal > 0 ? "#080b0e" : "#343850",
                  border: "none", borderRadius: 5, padding: "6px 14px", fontSize: 11, fontWeight: 600,
                  cursor: segmentTotal > 0 ? "pointer" : "not-allowed",
                }}
              >
                Continuar <ChevronRight size={11} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("segment")}
                style={{ background: "none", border: "0.5px solid #1e2235", borderRadius: 5, padding: "6px 12px", fontSize: 11, color: "#c8cde0", cursor: "pointer" }}
              >
                ← Voltar
              </button>
              <button
                disabled={dispatchMutation.isPending}
                onClick={handleDispatch}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "#25d366", color: "#080b0e",
                  border: "none", borderRadius: 5, padding: "6px 16px", fontSize: 11, fontWeight: 600,
                  cursor: dispatchMutation.isPending ? "not-allowed" : "pointer",
                  opacity: dispatchMutation.isPending ? 0.7 : 1,
                }}
              >
                <Zap size={11} />
                {dispatchMutation.isPending ? "Disparando..." : `Disparar para ${segmentTotal} contatos`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
