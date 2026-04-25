import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// Node type definitions matching the prototype
const NDEFS: Record<string, { bg: string; cl: string; lbl: string; sub: string; icon: string }> = {
  trigger: { bg: "#0a2016", cl: "#25d366", lbl: "Inicio", sub: "Nova mensagem", icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.57 3.29A2 2 0 0 1 3.54 1h3a2 2 0 0 1 2 1.72" },
  text: { bg: "#091c34", cl: "#378add", lbl: "Enviar texto", sub: "Edite o conteudo", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  audio: { bg: "#17132a", cl: "#7f77dd", lbl: "Audio", sub: "TTS ou upload", icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" },
  image: { bg: "#0a2016", cl: "#25d366", lbl: "Imagem", sub: "URL da imagem", icon: "M3 3h18v18H3zM8.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" },
  video: { bg: "#271800", cl: "#ef9f27", lbl: "Video", sub: "URL do video", icon: "M23 7l-7 5 7 5V7zM1 5h15v14H1z" },
  delay: { bg: "#271800", cl: "#ef9f27", lbl: "Delay", sub: "5 segundos", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2" },
  wait: { bg: "#17132a", cl: "#7f77dd", lbl: "Aguardar resp.", sub: "Timeout: 24h", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  identify: { bg: "#0a2016", cl: "#25d366", lbl: "Identificar", sub: "IA classifica", icon: "M11 11a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" },
  buttons: { bg: "#091c34", cl: "#378add", lbl: "Botoes", sub: "Opcoes de resposta", icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01" },
  pix: { bg: "#271800", cl: "#ef9f27", lbl: "Aguardar Pix", sub: "Webhook pagamento", icon: "M2 5h20v14H2zM2 10h20" },
  connect: { bg: "#17132a", cl: "#7f77dd", lbl: "Conectar fluxo", sub: "Selecionar destino", icon: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" },
  ai: { bg: "#091c34", cl: "#378add", lbl: "Agente IA", sub: "Claude/GPT responde", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4l4 2" },
};

const NW = 152;
const NH = 68;

type FlowNodeLocal = {
  nodeId: string;
  type: string;
  label: string;
  subtitle: string;
  x: number;
  y: number;
  bgColor: string;
  textColor: string;
  config: Record<string, string>;
};

type FlowEdgeLocal = {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
};

export default function FlowEditor({ flowId }: { flowId: number }) {
  const [, setLocation] = useLocation();
  const flowQuery = trpc.flows.get.useQuery({ id: flowId });
  const saveCanvas = trpc.flows.saveCanvas.useMutation({
    onSuccess: () => toast.success("Fluxo salvo!"),
  });

  const [nodes, setNodes] = useState<FlowNodeLocal[]>([]);
  const [edges, setEdges] = useState<FlowEdgeLocal[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; ox: number; oy: number } | null>(null);
  const [connecting, setConnecting] = useState<{ fromId: string; mx: number; my: number } | null>(null);
  const [nodeCounter, setNodeCounter] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load flow data
  useEffect(() => {
    if (flowQuery.data) {
      const flow = flowQuery.data;
      if (flow.nodes && flow.nodes.length > 0) {
        setNodes(flow.nodes.map((n: any) => ({
          nodeId: n.nodeId,
          type: n.type,
          label: n.label,
          subtitle: n.subtitle || "",
          x: n.x,
          y: n.y,
          bgColor: n.bgColor || "#091c34",
          textColor: n.textColor || "#378add",
          config: (n.config || {}) as Record<string, string>,
        })));
        setEdges((flow.edges || []).map((e: any) => ({
          edgeId: e.edgeId,
          sourceNodeId: e.sourceNodeId,
          targetNodeId: e.targetNodeId,
        })));
        const maxId = flow.nodes.reduce((max: number, n: any) => {
          const num = parseInt(n.nodeId.replace("n", ""), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        setNodeCounter(maxId);
      } else {
        // Default nodes for new flow
        setNodes([
          { nodeId: "n1", type: "trigger", label: "Inicio", subtitle: "Nova mensagem", x: 90, y: 30, bgColor: "#0a2016", textColor: "#25d366", config: { trigger: "new_message" } },
          { nodeId: "n2", type: "text", label: "Enviar texto", subtitle: "Mensagem de boas-vindas", x: 90, y: 145, bgColor: "#091c34", textColor: "#378add", config: { text: "" } },
        ]);
        setEdges([{ edgeId: "e1", sourceNodeId: "n1", targetNodeId: "n2" }]);
        setNodeCounter(2);
      }
    }
  }, [flowQuery.data]);

  const addNode = useCallback((type: string) => {
    const def = NDEFS[type] || NDEFS.text;
    const id = `n${nodeCounter + 1}`;
    setNodeCounter(c => c + 1);
    setNodes(prev => [...prev, {
      nodeId: id,
      type,
      label: def.lbl,
      subtitle: def.sub,
      x: 180 + Math.random() * 80,
      y: 80 + Math.random() * 120,
      bgColor: def.bg,
      textColor: def.cl,
      config: {},
    }]);
    setSelectedNode(id);
  }, [nodeCounter]);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.nodeId !== id));
    setEdges(prev => prev.filter(e => e.sourceNodeId !== id && e.targetNodeId !== id));
    setSelectedNode(null);
  }, []);

  const updateNodeConfig = useCallback((nodeId: string, key: string, value: string) => {
    setNodes(prev => prev.map(n => {
      if (n.nodeId !== nodeId) return n;
      if (key === "_lbl") return { ...n, label: value };
      return { ...n, config: { ...n.config, [key]: value } };
    }));
  }, []);

  // Mouse handlers for drag and connect
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const target = e.target as HTMLElement;
    const nid = target.dataset.nid;
    const port = target.dataset.port;

    if (port === "out" && nid) {
      e.preventDefault();
      setConnecting({ fromId: nid, mx: e.clientX - rect.left, my: e.clientY - rect.top });
      return;
    }
    if (port === "in" && nid && connecting && connecting.fromId !== nid) {
      if (!edges.find(ed => ed.sourceNodeId === connecting.fromId && ed.targetNodeId === nid)) {
        setEdges(prev => [...prev, { edgeId: `e${Date.now()}`, sourceNodeId: connecting.fromId, targetNodeId: nid }]);
      }
      setConnecting(null);
      return;
    }

    const bodyEl = target.classList.contains("nb") ? target : target.closest(".nb") as HTMLElement;
    if (bodyEl?.dataset.nid) {
      const nodeNid = bodyEl.dataset.nid;
      const node = nodes.find(n => n.nodeId === nodeNid);
      if (node) {
        e.stopPropagation();
        setSelectedNode(nodeNid);
        setDragging({ nodeId: nodeNid, ox: e.clientX - rect.left - node.x, oy: e.clientY - rect.top - node.y });
        return;
      }
    }

    const ndEl = target.closest(".nd") as HTMLElement;
    if (ndEl?.dataset.nid) {
      setSelectedNode(ndEl.dataset.nid);
      const node = nodes.find(n => n.nodeId === ndEl.dataset.nid);
      if (node) {
        setDragging({ nodeId: ndEl.dataset.nid!, ox: e.clientX - rect.left - node.x, oy: e.clientY - rect.top - node.y });
      }
      return;
    }

    setSelectedNode(null);
    setConnecting(null);
  }, [connecting, edges, nodes]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (dragging) {
        const newX = Math.max(0, e.clientX - rect.left - dragging.ox);
        const newY = Math.max(0, e.clientY - rect.top - dragging.oy);
        setNodes(prev => prev.map(n => n.nodeId === dragging.nodeId ? { ...n, x: newX, y: newY } : n));
      }
      if (connecting) {
        setConnecting(prev => prev ? { ...prev, mx: e.clientX - rect.left, my: e.clientY - rect.top } : null);
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (dragging) setDragging(null);
      if (connecting) {
        const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
        if (target?.dataset.port === "in" && target.dataset.nid && target.dataset.nid !== connecting.fromId) {
          const nid = target.dataset.nid;
          if (!edges.find(ed => ed.sourceNodeId === connecting.fromId && ed.targetNodeId === nid)) {
            setEdges(prev => [...prev, { edgeId: `e${Date.now()}`, sourceNodeId: connecting.fromId, targetNodeId: nid }]);
          }
        }
        setConnecting(null);
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, connecting, edges]);

  const handleSave = () => {
    saveCanvas.mutate({
      flowId,
      nodes: nodes.map(n => ({ ...n, subtitle: n.subtitle || "" })),
      edges,
    });
  };

  const selectedNodeData = nodes.find(n => n.nodeId === selectedNode);

  if (!flowQuery.data && !flowQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: "#080b0e" }}>
        <p style={{ color: "#343850" }}>Fluxo nao encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-3.5 gap-2 flex-shrink-0" style={{ height: 42, borderBottom: "0.5px solid #141720" }}>
        <button className="zap-btn-outline" style={{ fontSize: 10 }} onClick={() => setLocation("/app/flows")}>
          ← Fluxos
        </button>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{flowQuery.data?.name || "Carregando..."}</span>
        {flowQuery.data && (
          <span className={`zap-tag ${flowQuery.data.status === "active" ? "zap-tag-green" : flowQuery.data.status === "paused" ? "zap-tag-amber" : "zap-tag-muted"}`}>
            {flowQuery.data.status === "active" ? "ativo" : flowQuery.data.status === "paused" ? "pausado" : "rascunho"}
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          <button className="zap-btn" onClick={handleSave} disabled={saveCanvas.isPending}>
            {saveCanvas.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Palette */}
        <div
          className="flex flex-col gap-0.5 overflow-y-auto zap-scroll flex-shrink-0"
          style={{ width: 112, background: "#060809", borderRight: "0.5px solid #141720", padding: "8px 6px" }}
        >
          <PaletteSection title="Mensagens">
            <PaletteItem type="text" label="Texto" bg="#091c34" cl="#378add" onClick={addNode} />
            <PaletteItem type="audio" label="Audio" bg="#17132a" cl="#7f77dd" onClick={addNode} />
            <PaletteItem type="image" label="Imagem" bg="#0a2016" cl="#25d366" onClick={addNode} />
            <PaletteItem type="video" label="Video" bg="#271800" cl="#ef9f27" onClick={addNode} />
          </PaletteSection>
          <PaletteSection title="Logica">
            <PaletteItem type="delay" label="Delay" bg="#271800" cl="#ef9f27" onClick={addNode} />
            <PaletteItem type="wait" label="Aguardar" bg="#17132a" cl="#7f77dd" onClick={addNode} />
            <PaletteItem type="identify" label="Identificar" bg="#0a2016" cl="#25d366" onClick={addNode} />
            <PaletteItem type="buttons" label="Botoes" bg="#091c34" cl="#378add" onClick={addNode} />
          </PaletteSection>
          <PaletteSection title="Avancado">
            <PaletteItem type="pix" label="Pix/Pag." bg="#271800" cl="#ef9f27" onClick={addNode} />
            <PaletteItem type="connect" label="Conectar" bg="#17132a" cl="#7f77dd" onClick={addNode} />
            <PaletteItem type="ai" label="Agente IA" bg="#091c34" cl="#378add" onClick={addNode} />
          </PaletteSection>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden"
          style={{
            background: "#060809",
            backgroundImage: "radial-gradient(circle, #1a1e2c 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            cursor: "default",
          }}
          onMouseDown={handleCanvasMouseDown}
        >
          {/* SVG edges */}
          <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
            <defs>
              <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,1 L0,5 L5,3z" fill="rgba(37,211,102,0.31)" />
              </marker>
            </defs>
            {edges.map(e => {
              const from = nodes.find(n => n.nodeId === e.sourceNodeId);
              const to = nodes.find(n => n.nodeId === e.targetNodeId);
              if (!from || !to) return null;
              const x1 = from.x + NW / 2, y1 = from.y + NH;
              const x2 = to.x + NW / 2, y2 = to.y;
              return (
                <path
                  key={e.edgeId}
                  d={`M${x1},${y1} C${x1},${y1 + 55} ${x2},${y2 - 55} ${x2},${y2}`}
                  stroke="rgba(37,211,102,0.31)"
                  strokeWidth="1.5"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            {connecting && (() => {
              const from = nodes.find(n => n.nodeId === connecting.fromId);
              if (!from) return null;
              const x1 = from.x + NW / 2, y1 = from.y + NH;
              return (
                <>
                  <path d={`M${x1},${y1} L${connecting.mx},${connecting.my}`} stroke="#25d366" strokeWidth="1.5" fill="none" strokeDasharray="5,3" />
                  <circle cx={connecting.mx} cy={connecting.my} r="3" fill="rgba(37,211,102,0.31)" />
                </>
              );
            })()}
          </svg>

          {/* Nodes */}
          {nodes.map(n => (
            <div
              key={n.nodeId}
              data-nid={n.nodeId}
              className="nd"
              style={{
                position: "absolute",
                left: n.x,
                top: n.y,
                width: NW,
                background: "#0c0f18",
                border: `0.5px solid ${selectedNode === n.nodeId ? "#25d366" : "#1c2030"}`,
                borderRadius: 8,
                userSelect: "none",
                boxShadow: selectedNode === n.nodeId ? "0 0 0 2px rgba(37,211,102,0.08)" : "none",
              }}
            >
              {/* Input port */}
              <div
                data-nid={n.nodeId}
                data-port="in"
                style={{
                  position: "absolute",
                  top: -4.5,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "#1c2030",
                  border: "1.5px solid #252838",
                  cursor: "crosshair",
                  zIndex: 10,
                }}
              />
              {/* Body */}
              <div
                className="nb"
                data-nid={n.nodeId}
                style={{ padding: "9px 11px", display: "flex", alignItems: "flex-start", gap: 7, cursor: "grab" }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                    background: n.bgColor,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke={n.textColor} strokeWidth="2" width="10" height="10">
                    <path d={NDEFS[n.type]?.icon || NDEFS.text.icon} />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#c8cad8", lineHeight: 1.3 }}>{n.label}</div>
                  <div style={{ fontSize: 10, color: "#343850", marginTop: 1, lineHeight: 1.3 }}>{n.subtitle}</div>
                </div>
              </div>
              {/* Output port */}
              <div
                data-nid={n.nodeId}
                data-port="out"
                style={{
                  position: "absolute",
                  bottom: -4.5,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "#1c2030",
                  border: "1.5px solid #252838",
                  cursor: "crosshair",
                  zIndex: 10,
                }}
              />
            </div>
          ))}

          {/* Canvas hints */}
          <div style={{ position: "absolute", top: 9, left: 9, fontSize: 10, color: "#1e2235", pointerEvents: "none", lineHeight: 1.6 }}>
            Arraste nos · Conecte pela porta ● · Clique para configurar
          </div>
          <div style={{ position: "absolute", bottom: 9, right: 9, display: "flex", gap: 4 }}>
            <button
              className="zap-btn-outline"
              style={{ fontSize: 10, padding: "4px 8px" }}
              onClick={() => {
                setNodes([
                  { nodeId: "n1", type: "trigger", label: "Inicio", subtitle: "Nova mensagem", x: 90, y: 30, bgColor: "#0a2016", textColor: "#25d366", config: { trigger: "new_message" } },
                  { nodeId: "n2", type: "text", label: "Enviar texto", subtitle: "Mensagem de boas-vindas", x: 90, y: 145, bgColor: "#091c34", textColor: "#378add", config: { text: "" } },
                ]);
                setEdges([{ edgeId: "e1", sourceNodeId: "n1", targetNodeId: "n2" }]);
                setNodeCounter(2);
                setSelectedNode(null);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Config panel */}
        <div
          className="flex flex-col overflow-y-auto zap-scroll flex-shrink-0"
          style={{ width: 208, background: "#060809", borderLeft: "0.5px solid #141720" }}
        >
          {selectedNodeData ? (
            <NodeConfigPanel node={selectedNodeData} onUpdate={updateNodeConfig} onDelete={deleteNode} />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 p-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1e2235" strokeWidth="1.5" width="28" height="28">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83" />
              </svg>
              <p style={{ fontSize: 11, color: "#252838", textAlign: "center", lineHeight: 1.5 }}>
                Clique em um no para editar as configuracoes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaletteSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div style={{ fontSize: 9, color: "#252838", textTransform: "uppercase", letterSpacing: 0.5, padding: "6px 4px 2px", fontWeight: 400 }}>
        {title}
      </div>
      {children}
    </>
  );
}

function PaletteItem({ type, label, bg, cl, onClick }: { type: string; label: string; bg: string; cl: string; onClick: (type: string) => void }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-md"
      style={{ padding: "5px 6px", cursor: "pointer", border: "0.5px solid transparent", transition: "all 0.1s", userSelect: "none" }}
      onClick={() => onClick(type)}
      onMouseEnter={e => { e.currentTarget.style.background = "#0e1118"; e.currentTarget.style.borderColor = "#1a1e2c"; }}
      onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.borderColor = "transparent"; }}
    >
      <div
        className="flex items-center justify-center rounded flex-shrink-0"
        style={{ width: 20, height: 20, background: bg }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke={cl} strokeWidth="2" width="10" height="10">
          <path d={NDEFS[type]?.icon || ""} />
        </svg>
      </div>
      <span style={{ fontSize: 10, color: "#5a5f7a" }}>{label}</span>
    </div>
  );
}

function NodeConfigPanel({ node, onUpdate, onDelete }: {
  node: FlowNodeLocal;
  onUpdate: (nodeId: string, key: string, value: string) => void;
  onDelete: (nodeId: string) => void;
}) {
  const fi = (lbl: string, key: string, val: string, ph: string = "", type: string = "text") => (
    <div key={key}>
      <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>{lbl}</label>
      <input
        type={type}
        className="zap-input"
        value={val || ""}
        placeholder={ph}
        onChange={e => onUpdate(node.nodeId, key, e.target.value)}
      />
    </div>
  );

  const ft = (lbl: string, key: string, val: string, ph: string = "") => (
    <div key={key}>
      <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>{lbl}</label>
      <textarea
        className="zap-input"
        rows={3}
        style={{ resize: "none" }}
        placeholder={ph}
        value={val || ""}
        onChange={e => onUpdate(node.nodeId, key, e.target.value)}
      />
    </div>
  );

  const fs = (lbl: string, key: string, val: string, opts: string[]) => (
    <div key={key}>
      <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>{lbl}</label>
      <select className="zap-input" value={val || opts[0]} onChange={e => onUpdate(node.nodeId, key, e.target.value)} style={{ background: "#060809" }}>
        {opts.map(o => <option key={o} value={o} style={{ background: "#0c0f18" }}>{o}</option>)}
      </select>
    </div>
  );

  let fields: React.ReactNode[] = [];
  fields.push(fi("Rotulo do no", "_lbl", node.label, "Nome..."));

  switch (node.type) {
    case "text": fields.push(ft("Mensagem", "text", node.config.text, "Escreva a mensagem...")); break;
    case "audio": fields.push(ft("Texto para voz", "tts", node.config.tts, "Ou cole URL de audio")); break;
    case "image": fields.push(fi("URL da imagem", "url", node.config.url, "https://...")); break;
    case "video": fields.push(fi("URL do video", "url", node.config.url, "https://...")); break;
    case "delay":
      fields.push(fi("Duracao", "duration", node.config.duration, "5", "number"));
      fields.push(fs("Unidade", "unit", node.config.unit || "seconds", ["seconds", "minutes", "hours"]));
      break;
    case "wait":
      fields.push(fi("Timeout", "timeout", node.config.timeout, "24", "number"));
      fields.push(fs("Unidade", "unit", node.config.unit || "hours", ["minutes", "hours", "days"]));
      break;
    case "identify":
      fields.push(fs("Modo", "mode", node.config.mode || "ai", ["ai", "keywords", "regex"]));
      fields.push(fi("Palavras-chave", "keywords", node.config.keywords, "sim, quero, interesse"));
      break;
    case "buttons":
      fields.push(ft("Mensagem", "text", node.config.text, "Escolha uma opcao:"));
      fields.push(ft("Botoes (1 por linha)", "btns", node.config.btns, "Sim, quero!\nSaber mais"));
      break;
    case "pix":
      fields.push(fs("Gateway", "gateway", node.config.gateway || "mercadopago", ["mercadopago", "asaas", "pagseguro"]));
      fields.push(fi("Timeout (min)", "timeout", node.config.timeout, "30", "number"));
      break;
    case "connect":
      fields.push(fs("Fluxo destino", "flow", node.config.flow, ["Boas-vindas", "Funil de vendas", "Pos-venda", "Recuperacao"]));
      break;
    case "ai":
      fields.push(fs("Modelo", "model", node.config.model || "claude", ["claude", "gpt-4o", "llama-3"]));
      fields.push(ft("Instrucao", "prompt", node.config.prompt, "Voce e um assistente..."));
      break;
    case "trigger":
      fields.push(fs("Gatilho", "trigger", node.config.trigger || "new_message", ["new_message", "keyword", "first_message"]));
      break;
  }

  return (
    <>
      <div style={{ padding: "11px 11px 8px", borderBottom: "0.5px solid #141720", flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#dde0ec" }}>{node.label}</div>
        <div style={{ fontSize: 10, color: "#343850", marginTop: 1 }}>{node.type}</div>
      </div>
      <div style={{ padding: 11, flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
        {fields}
      </div>
      <div style={{ padding: "9px 11px", borderTop: "0.5px solid #141720" }}>
        <button
          onClick={() => onDelete(node.nodeId)}
          style={{
            width: "100%",
            background: "transparent",
            border: "0.5px solid #3a1010",
            borderRadius: 5,
            padding: 5,
            fontSize: 10,
            color: "#e24b4a",
            cursor: "pointer",
          }}
        >
          Remover no
        </button>
      </div>
    </>
  );
}
