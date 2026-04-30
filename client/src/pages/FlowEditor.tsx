/**
 * FlowEditor — Visual flow builder
 * - Exclusive connectors: each output port → only ONE edge; each input → only ONE incoming
 * - Click edge midpoint (×) to delete it
 * - Multi-port nodes (buttons, condition, pix, webhook)
 * - Config panel with per-type forms
 * - Variables support: {{nome}}, {{telefone}}, {{email}}
 * - Auto-save indicator
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Constants ───────────────────────────────────────────────────────────────

const NW = 162; // node width
const NH = 64;  // node height
const PR = 5;   // port radius

// ─── Node definitions ────────────────────────────────────────────────────────

type NodeType =
  | "trigger" | "text" | "audio" | "image" | "video"
  | "delay" | "wait" | "identify" | "buttons" | "condition"
  | "pix" | "connect" | "ai" | "tag" | "webhook" | "end";

interface PortDef { id: string; label?: string }

interface NodeDef {
  bg: string; cl: string; lbl: string; sub: string;
  icon: string; category: string;
  outputs: PortDef[];
}

const NDEFS: Record<NodeType, NodeDef> = {
  trigger:   { bg: "#0a2016", cl: "#25d366", lbl: "Trigger",       sub: "Início do fluxo",     icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.57 3.29A2 2 0 0 1 3.54 1h3a2 2 0 0 1 2 1.72", category: "Início",     outputs: [{ id: "out" }] },
  text:      { bg: "#091c34", cl: "#378add", lbl: "Texto",          sub: "Enviar mensagem",      icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",                                                                                    category: "Mensagens",  outputs: [{ id: "out" }] },
  audio:     { bg: "#17132a", cl: "#7f77dd", lbl: "Áudio",          sub: "Enviar áudio",         icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z",                                                                                             category: "Mensagens",  outputs: [{ id: "out" }] },
  image:     { bg: "#0a2016", cl: "#25d366", lbl: "Imagem",         sub: "Enviar imagem",        icon: "M3 3h18v18H3zM8.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",                                                                                      category: "Mensagens",  outputs: [{ id: "out" }] },
  video:     { bg: "#271800", cl: "#ef9f27", lbl: "Vídeo",          sub: "Enviar vídeo",         icon: "M23 7l-7 5 7 5V7zM1 5h15v14H1z",                                                                                                                    category: "Mensagens",  outputs: [{ id: "out" }] },
  delay:     { bg: "#271800", cl: "#ef9f27", lbl: "Delay",          sub: "Aguardar tempo",       icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",                                                                                              category: "Lógica",     outputs: [{ id: "out" }] },
  wait:      { bg: "#17132a", cl: "#7f77dd", lbl: "Aguardar",       sub: "Esperar resposta",     icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",                                                                                   category: "Lógica",     outputs: [{ id: "out" }] },
  identify:  { bg: "#0a2016", cl: "#25d366", lbl: "Identificar",    sub: "Capturar dado",        icon: "M11 11a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",                                                                                           category: "Lógica",     outputs: [{ id: "out" }] },
  buttons:   { bg: "#091c34", cl: "#378add", lbl: "Botões",         sub: "Menu de opções",       icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01",                                                                                                          category: "Interação",  outputs: [{ id: "opt1", label: "Opção 1" }, { id: "opt2", label: "Opção 2" }, { id: "opt3", label: "Opção 3" }] },
  condition: { bg: "#1a0f00", cl: "#fb923c", lbl: "Condição",       sub: "Desvio condicional",   icon: "M22 3H2l8 9.46V19l4 2v-8.54z",                                                                                                                      category: "Lógica",     outputs: [{ id: "yes", label: "Sim" }, { id: "no", label: "Não" }] },
  pix:       { bg: "#271800", cl: "#ef9f27", lbl: "PIX",            sub: "Gerar cobrança",       icon: "M2 5h20v14H2zM2 10h20",                                                                                                                             category: "Pagamento",  outputs: [{ id: "paid", label: "Pago" }, { id: "pending", label: "Pendente" }] },
  connect:   { bg: "#17132a", cl: "#7f77dd", lbl: "Conectar",       sub: "Transferir atendente", icon: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",                                                                                      category: "Integração", outputs: [{ id: "out" }] },
  ai:        { bg: "#091c34", cl: "#378add", lbl: "Agente IA",      sub: "Claude responde",      icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4l4 2",                                                                                              category: "IA",         outputs: [{ id: "out" }] },
  tag:       { bg: "#0a1a1a", cl: "#22d3ee", lbl: "Tag",            sub: "Marcar contato",       icon: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z",                                                                  category: "Lógica",     outputs: [{ id: "out" }] },
  webhook:   { bg: "#1a0a0a", cl: "#f87171", lbl: "Webhook",        sub: "Chamar API externa",   icon: "M18 20V10M12 20V4M6 20v-6",                                                                                                                         category: "Integração", outputs: [{ id: "success", label: "Sucesso" }, { id: "error", label: "Erro" }] },
  end:       { bg: "#1a0a0a", cl: "#f87171", lbl: "Fim",            sub: "Encerrar fluxo",       icon: "M18 6L6 18M6 6l12 12",                                                                                                                              category: "Fim",        outputs: [] },
};

const CATEGORIES = ["Início", "Mensagens", "Lógica", "Interação", "IA", "Pagamento", "Integração", "Fim"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FNode {
  nodeId: string;
  type: NodeType;
  label: string;
  subtitle: string;
  x: number;
  y: number;
  bgColor: string;
  textColor: string;
  config: Record<string, string>;
  outputs: PortDef[];
}

interface FEdge {
  edgeId: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`; }

/** Canvas position of an output port */
function outPortPos(node: FNode, portId: string): { x: number; y: number } {
  const idx = node.outputs.findIndex(p => p.id === portId);
  const total = node.outputs.length;
  if (total === 0) return { x: node.x + NW, y: node.y + NH / 2 };
  if (total === 1) return { x: node.x + NW, y: node.y + NH / 2 };
  const step = NH / (total + 1);
  return { x: node.x + NW, y: node.y + step * (idx + 1) };
}

/** Canvas position of the input port */
function inPortPos(node: FNode): { x: number; y: number } {
  return { x: node.x, y: node.y + NH / 2 };
}

/** Cubic bezier SVG path */
function bezier(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(Math.abs(x2 - x1) * 0.45, 50);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FlowEditor({ flowId }: { flowId: number }) {
  const [, setLocation] = useLocation();

  const [nodes, setNodes] = useState<FNode[]>([]);
  const [edges, setEdges] = useState<FEdge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [paletteSearch, setPaletteSearch] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(true);

  // Drag
  const dragRef = useRef<{ nodeId: string; ox: number; oy: number } | null>(null);
  // Connect (drawing edge)
  const connectRef = useRef<{ srcId: string; portId: string; mx: number; my: number } | null>(null);
  const [connectPreview, setConnectPreview] = useState<{ srcId: string; portId: string; mx: number; my: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const flowQuery = trpc.flows.get.useQuery({ id: flowId }, { enabled: !!flowId });
  const flowMeta = trpc.flows.list.useQuery();
  const currentFlow = flowMeta.data?.find(f => f.id === flowId);

  const saveMut = trpc.flows.saveCanvas.useMutation({
    onSuccess: () => toast.success("Fluxo salvo!"),
    onError: (e) => toast.error("Erro ao salvar: " + e.message),
  });
  const toggleMut = trpc.flows.update.useMutation({
    onSuccess: () => { toast.success("Status atualizado"); void flowMeta.refetch(); },
  });

  useEffect(() => {
    if (!flowQuery.data) return;
    const data = flowQuery.data;
    const rawNodes = (data as any).nodes ?? [];
    const rawEdges = (data as any).edges ?? [];
    if (rawNodes.length > 0) {
      setNodes(rawNodes.map((n: any) => {
        const def = NDEFS[n.type as NodeType] ?? NDEFS.text;
        const savedOutputs = (n.config as any)?._outputs as PortDef[] | undefined;
        return {
          nodeId: n.nodeId,
          type: n.type as NodeType,
          label: n.label,
          subtitle: n.subtitle ?? def.sub,
          x: n.x, y: n.y,
          bgColor: n.bgColor ?? def.bg,
          textColor: n.textColor ?? def.cl,
          config: { ...(n.config ?? {}) } as Record<string, string>,
          outputs: savedOutputs ?? [...def.outputs],
        };
      }));
      setEdges((rawEdges ?? []).map((e: any) => ({
        edgeId: e.edgeId,
        sourceNodeId: e.sourceNodeId,
        sourcePortId: e.sourcePortId ?? "out",
        targetNodeId: e.targetNodeId,
      })));
    } else {
      // Default starter nodes
      setNodes([
        { nodeId: "n1", type: "trigger", label: "Trigger", subtitle: "Início do fluxo", x: 80, y: 60, bgColor: "#0a2016", textColor: "#25d366", config: { trigger: "new_message" }, outputs: [{ id: "out" }] },
        { nodeId: "n2", type: "text",    label: "Texto",   subtitle: "Mensagem de boas-vindas", x: 320, y: 60, bgColor: "#091c34", textColor: "#378add", config: { text: "" }, outputs: [{ id: "out" }] },
      ]);
      setEdges([{ edgeId: "e1", sourceNodeId: "n1", sourcePortId: "out", targetNodeId: "n2" }]);
    }
  }, [flowQuery.data]);

  // ── Node ops ──────────────────────────────────────────────────────────────

  function addNode(type: NodeType) {
    const def = NDEFS[type];
    const id = uid();
    const rect = canvasRef.current?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 - NW / 2 + Math.random() * 40 - 20 : 200;
    const cy = rect ? rect.height / 2 - NH / 2 + Math.random() * 40 - 20 : 150;
    setNodes(prev => [...prev, {
      nodeId: id, type,
      label: def.lbl, subtitle: def.sub,
      x: Math.max(0, cx), y: Math.max(0, cy),
      bgColor: def.bg, textColor: def.cl,
      config: {},
      outputs: [...def.outputs],
    }]);
    setSelectedId(id);
  }

  function deleteNode(id: string) {
    setNodes(prev => prev.filter(n => n.nodeId !== id));
    setEdges(prev => prev.filter(e => e.sourceNodeId !== id && e.targetNodeId !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updateNode(nodeId: string, key: string, value: string) {
    setNodes(prev => prev.map(n => {
      if (n.nodeId !== nodeId) return n;
      if (key === "_lbl") return { ...n, label: value };
      if (key === "_sub") return { ...n, subtitle: value };
      return { ...n, config: { ...n.config, [key]: value } };
    }));
  }

  function updateOutputs(nodeId: string, outputs: PortDef[]) {
    setNodes(prev => prev.map(n => n.nodeId === nodeId ? { ...n, outputs } : n));
  }

  function deleteEdge(edgeId: string) {
    setEdges(prev => prev.filter(e => e.edgeId !== edgeId));
  }

  // ── Mouse handlers ────────────────────────────────────────────────────────

  const getCanvasPos = useCallback((e: MouseEvent | React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  function onNodeMouseDown(e: React.MouseEvent, nodeId: string) {
    e.stopPropagation();
    setSelectedId(nodeId);
    const node = nodes.find(n => n.nodeId === nodeId)!;
    const pos = getCanvasPos(e);
    dragRef.current = { nodeId, ox: pos.x - node.x, oy: pos.y - node.y };
  }

  function onOutPortMouseDown(e: React.MouseEvent, nodeId: string, portId: string) {
    e.stopPropagation();
    const pos = getCanvasPos(e);
    connectRef.current = { srcId: nodeId, portId, mx: pos.x, my: pos.y };
    setConnectPreview({ ...connectRef.current });
  }

  function onInPortMouseUp(e: React.MouseEvent, targetNodeId: string) {
    e.stopPropagation();
    if (!connectRef.current) return;
    const { srcId, portId } = connectRef.current;
    if (srcId === targetNodeId) { connectRef.current = null; setConnectPreview(null); return; }

    setEdges(prev => {
      // Remove existing edge from this source port (exclusive output)
      const withoutSrcPort = prev.filter(ed => !(ed.sourceNodeId === srcId && ed.sourcePortId === portId));
      // Remove existing edge into this target (exclusive input)
      const withoutTarget = withoutSrcPort.filter(ed => ed.targetNodeId !== targetNodeId);
      return [...withoutTarget, { edgeId: uid(), sourceNodeId: srcId, sourcePortId: portId, targetNodeId }];
    });
    connectRef.current = null;
    setConnectPreview(null);
  }

  function onCanvasMouseDown(e: React.MouseEvent) {
    if ((e.target as Element).classList.contains("canvas-bg")) {
      setSelectedId(null);
    }
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const pos = getCanvasPos(e);
        const nx = Math.max(0, pos.x - dragRef.current.ox);
        const ny = Math.max(0, pos.y - dragRef.current.oy);
        setNodes(prev => prev.map(n => n.nodeId === dragRef.current!.nodeId ? { ...n, x: nx, y: ny } : n));
      }
      if (connectRef.current) {
        const pos = getCanvasPos(e);
        connectRef.current.mx = pos.x;
        connectRef.current.my = pos.y;
        setConnectPreview({ ...connectRef.current });
      }
    };
    const onUp = (e: MouseEvent) => {
      if (dragRef.current) { dragRef.current = null; }
      if (connectRef.current) {
        // Check if released on an input port
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
        const tgt = el?.dataset.inport;
        if (tgt && tgt !== connectRef.current.srcId) {
          const { srcId, portId } = connectRef.current;
          setEdges(prev => {
            const withoutSrcPort = prev.filter(ed => !(ed.sourceNodeId === srcId && ed.sourcePortId === portId));
            const withoutTarget = withoutSrcPort.filter(ed => ed.targetNodeId !== tgt);
            return [...withoutTarget, { edgeId: uid(), sourceNodeId: srcId, sourcePortId: portId, targetNodeId: tgt }];
          });
        }
        connectRef.current = null;
        setConnectPreview(null);
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [getCanvasPos]);

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave() {
    saveMut.mutate({
      flowId,
      nodes: nodes.map(n => ({
        nodeId: n.nodeId, type: n.type, label: n.label, subtitle: n.subtitle,
        x: n.x, y: n.y, bgColor: n.bgColor, textColor: n.textColor,
        config: { ...n.config, _outputs: n.outputs as any },
      })),
      edges: edges.map(e => ({
        edgeId: e.edgeId, sourceNodeId: e.sourceNodeId,
        sourcePortId: e.sourcePortId, targetNodeId: e.targetNodeId,
      })),
    });
  }

  // ── Palette filter ────────────────────────────────────────────────────────

  const paletteGroups = useMemo(() => {
    const q = paletteSearch.toLowerCase();
    const map: Record<string, Array<[NodeType, NodeDef]>> = {};
    for (const [type, def] of Object.entries(NDEFS) as [NodeType, NodeDef][]) {
      if (q && !def.lbl.toLowerCase().includes(q) && !def.sub.toLowerCase().includes(q)) continue;
      if (!map[def.category]) map[def.category] = [];
      map[def.category].push([type, def]);
    }
    return map;
  }, [paletteSearch]);

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedNode = nodes.find(n => n.nodeId === selectedId) ?? null;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#080b0e" }}>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-3 flex-shrink-0" style={{ height: 42, background: "#060809", borderBottom: "0.5px solid #141720" }}>
        <button
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: "#3a4058", padding: "4px 8px", borderRadius: 5, background: "transparent" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#dde0ec")}
          onMouseLeave={e => (e.currentTarget.style.color = "#3a4058")}
          onClick={() => setLocation("/app/flows")}
        >
          ← Fluxos
        </button>
        <div style={{ width: 0.5, height: 14, background: "#141720" }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: "#dde0ec" }}>{currentFlow?.name ?? "Carregando..."}</span>
        {currentFlow && (
          <span className={`zap-tag ${currentFlow.status === "active" ? "zap-tag-green" : currentFlow.status === "paused" ? "zap-tag-amber" : "zap-tag-muted"}`}>
            {currentFlow.status === "active" ? "ativo" : currentFlow.status === "paused" ? "pausado" : "rascunho"}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#252838" }}>{nodes.length} nós · {edges.length} conexões</span>
        <div style={{ width: 0.5, height: 14, background: "#141720" }} />
        {currentFlow && (
          <button
            className="zap-btn-outline"
            style={{ fontSize: 10, padding: "4px 10px", color: currentFlow.status === "active" ? "#ef9f27" : "#25d366" }}
            onClick={() => toggleMut.mutate({ id: flowId, status: currentFlow.status === "active" ? "paused" : "active" })}
          >
            {currentFlow.status === "active" ? "⏸ Pausar" : "▶ Ativar"}
          </button>
        )}
        <button className="zap-btn" style={{ fontSize: 10, padding: "4px 12px" }} onClick={handleSave} disabled={saveMut.isPending}>
          {saveMut.isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Palette ── */}
        <div
          className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{ width: paletteOpen ? 140 : 32, background: "#060809", borderRight: "0.5px solid #141720", transition: "width 0.18s" }}
        >
          <div className="flex items-center justify-between px-2 py-2 flex-shrink-0" style={{ borderBottom: "0.5px solid #141720" }}>
            {paletteOpen && <span style={{ fontSize: 9, color: "#252838", textTransform: "uppercase", letterSpacing: 0.5 }}>Nós</span>}
            <button
              onClick={() => setPaletteOpen(o => !o)}
              style={{ marginLeft: "auto", color: "#252838", background: "none", border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
              title={paletteOpen ? "Recolher" : "Expandir"}
            >
              {paletteOpen ? "‹" : "›"}
            </button>
          </div>
          {paletteOpen && (
            <>
              <div className="px-2 py-1.5 flex-shrink-0">
                <input
                  value={paletteSearch}
                  onChange={e => setPaletteSearch(e.target.value)}
                  placeholder="Buscar…"
                  className="zap-input"
                  style={{ fontSize: 10, padding: "3px 6px", height: 24 }}
                />
              </div>
              <div className="flex-1 overflow-y-auto zap-scroll px-1.5 pb-3">
                {CATEGORIES.filter(cat => paletteGroups[cat]?.length).map(cat => (
                  <div key={cat}>
                    <div style={{ fontSize: 9, color: "#1e2235", textTransform: "uppercase", letterSpacing: 0.5, padding: "6px 4px 2px" }}>{cat}</div>
                    {paletteGroups[cat].map(([type, def]) => (
                      <div
                        key={type}
                        onClick={() => addNode(type)}
                        className="flex items-center gap-1.5 rounded-md"
                        style={{ padding: "4px 5px", cursor: "pointer", transition: "background 0.1s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#0e1118")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}
                      >
                        <div className="flex items-center justify-center rounded flex-shrink-0" style={{ width: 18, height: 18, background: def.bg }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke={def.cl} strokeWidth="2" width="9" height="9">
                            <path d={def.icon} />
                          </svg>
                        </div>
                        <span style={{ fontSize: 10, color: "#5a5f7a" }}>{def.lbl}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Canvas ── */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden"
          style={{ background: "#060809", backgroundImage: "radial-gradient(circle, #1a1e2c 1px, transparent 1px)", backgroundSize: "22px 22px", cursor: connectPreview ? "crosshair" : "default" }}
          onMouseDown={onCanvasMouseDown}
        >
          <svg
            ref={svgRef}
            className="canvas-bg"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
          >
            <defs>
              <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,1 L0,5 L5,3z" fill="rgba(37,211,102,0.4)" />
              </marker>
            </defs>

            {/* Edges */}
            {edges.map(edge => {
              const src = nodes.find(n => n.nodeId === edge.sourceNodeId);
              const tgt = nodes.find(n => n.nodeId === edge.targetNodeId);
              if (!src || !tgt) return null;
              const sp = outPortPos(src, edge.sourcePortId);
              const tp = inPortPos(tgt);
              const midX = (sp.x + tp.x) / 2;
              const midY = (sp.y + tp.y) / 2;
              const hovered = hoveredEdgeId === edge.edgeId;
              return (
                <g key={edge.edgeId}>
                  {/* Hit area */}
                  <path
                    d={bezier(sp.x, sp.y, tp.x, tp.y)}
                    fill="none" stroke="transparent" strokeWidth={14}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredEdgeId(edge.edgeId)}
                    onMouseLeave={() => setHoveredEdgeId(null)}
                    onClick={e => { e.stopPropagation(); deleteEdge(edge.edgeId); }}
                  />
                  {/* Visible path */}
                  <path
                    d={bezier(sp.x, sp.y, tp.x, tp.y)}
                    fill="none"
                    stroke={hovered ? "#ef4444" : "rgba(37,211,102,0.35)"}
                    strokeWidth={hovered ? 2 : 1.5}
                    strokeDasharray={hovered ? "4 3" : undefined}
                    markerEnd="url(#arr)"
                    style={{ pointerEvents: "none", transition: "stroke 0.12s" }}
                  />
                  {/* Delete button */}
                  {hovered && (
                    <g
                      transform={`translate(${midX},${midY})`}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredEdgeId(edge.edgeId)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                      onClick={e => { e.stopPropagation(); deleteEdge(edge.edgeId); }}
                    >
                      <circle r={8} fill="#1a0a0a" stroke="#ef4444" strokeWidth={1.5} />
                      <text x={0} y={4} textAnchor="middle" fill="#ef4444" fontSize={12} fontWeight="bold" style={{ pointerEvents: "none" }}>×</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Connect preview */}
            {connectPreview && (() => {
              const src = nodes.find(n => n.nodeId === connectPreview.srcId);
              if (!src) return null;
              const sp = outPortPos(src, connectPreview.portId);
              return (
                <path
                  d={bezier(sp.x, sp.y, connectPreview.mx, connectPreview.my)}
                  fill="none" stroke="#25d366" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.6}
                  style={{ pointerEvents: "none" }}
                />
              );
            })()}
          </svg>

          {/* Nodes (HTML overlay) */}
          {nodes.map(node => {
            const def = NDEFS[node.type];
            const isSelected = selectedId === node.nodeId;
            return (
              <div
                key={node.nodeId}
                style={{
                  position: "absolute",
                  left: node.x, top: node.y,
                  width: NW, height: NH,
                  background: "#0c0f18",
                  border: `0.5px solid ${isSelected ? "#25d366" : "#1c2030"}`,
                  borderRadius: 8,
                  boxShadow: isSelected ? "0 0 0 2px rgba(37,211,102,0.1)" : "none",
                  userSelect: "none",
                  cursor: "grab",
                  zIndex: isSelected ? 10 : 1,
                }}
                onMouseDown={e => onNodeMouseDown(e, node.nodeId)}
                onClick={e => { e.stopPropagation(); setSelectedId(node.nodeId); }}
              >
                {/* Input port */}
                <div
                  data-inport={node.nodeId}
                  style={{
                    position: "absolute", left: -PR, top: NH / 2 - PR,
                    width: PR * 2, height: PR * 2, borderRadius: "50%",
                    background: "#1c2030", border: "1.5px solid #252838",
                    cursor: "crosshair", zIndex: 20,
                  }}
                  onMouseUp={e => onInPortMouseUp(e, node.nodeId)}
                />

                {/* Body */}
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 12px 10px 10px", height: "100%" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 5, background: node.bgColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={node.textColor} strokeWidth="2" width="11" height="11">
                      <path d={def.icon} />
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "#c8cad8", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.label}</div>
                    <div style={{ fontSize: 9.5, color: "#343850", marginTop: 1, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.subtitle}</div>
                  </div>
                </div>

                {/* Output ports */}
                {node.outputs.map((port, idx) => {
                  const total = node.outputs.length;
                  const step = NH / (total + 1);
                  const py = step * (idx + 1) - PR;
                  const hasEdge = edges.some(e => e.sourceNodeId === node.nodeId && e.sourcePortId === port.id);
                  return (
                    <div key={port.id}>
                      {port.label && total > 1 && (
                        <div style={{
                          position: "absolute", right: PR * 2 + 4, top: step * (idx + 1) - 7,
                          fontSize: 8, color: "#3a4058", whiteSpace: "nowrap",
                          pointerEvents: "none",
                        }}>
                          {port.label}
                        </div>
                      )}
                      <div
                        style={{
                          position: "absolute", right: -PR, top: py,
                          width: PR * 2, height: PR * 2, borderRadius: "50%",
                          background: hasEdge ? "#25d366" : "#1c2030",
                          border: `1.5px solid ${hasEdge ? "#25d366" : "#252838"}`,
                          cursor: "crosshair", zIndex: 20,
                          transition: "background 0.15s",
                        }}
                        onMouseDown={e => { e.stopPropagation(); onOutPortMouseDown(e, node.nodeId, port.id); }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Empty state */}
          {nodes.length === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#0d1117", border: "0.5px solid #1e2a3a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#25d366" strokeWidth="1.5" width="24" height="24"><path d="M22 3H2l8 9.46V19l4 2v-8.54z" /></svg>
              </div>
              <p style={{ fontSize: 12, color: "#343850" }}>Canvas vazio — clique em um nó na paleta para começar</p>
            </div>
          )}

          {/* Hint */}
          <div style={{ position: "absolute", top: 8, left: 8, fontSize: 9.5, color: "#1e2235", pointerEvents: "none", lineHeight: 1.7 }}>
            Arraste nós · Conecte pelas portas ● · Passe o mouse sobre uma conexão para excluí-la
          </div>
        </div>

        {/* ── Config Panel ── */}
        <div
          className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{ width: 220, background: "#060809", borderLeft: "0.5px solid #141720" }}
        >
          {selectedNode ? (
            <NodeConfig
              node={selectedNode}
              onUpdate={updateNode}
              onUpdateOutputs={updateOutputs}
              onDelete={deleteNode}
            />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 p-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1e2235" strokeWidth="1.5" width="28" height="28">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <p style={{ fontSize: 10, color: "#252838", textAlign: "center", lineHeight: 1.5 }}>
                Clique em um nó para configurar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Node Config Panel ────────────────────────────────────────────────────────

function NodeConfig({ node, onUpdate, onUpdateOutputs, onDelete }: {
  node: FNode;
  onUpdate: (nodeId: string, key: string, value: string) => void;
  onUpdateOutputs: (nodeId: string, outputs: PortDef[]) => void;
  onDelete: (nodeId: string) => void;
}) {
  const def = NDEFS[node.type];
  const c = node.config;

  const fi = (lbl: string, key: string, ph = "", type = "text") => (
    <div key={key}>
      <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>{lbl}</label>
      <input type={type} className="zap-input" value={c[key] ?? ""} placeholder={ph}
        onChange={e => onUpdate(node.nodeId, key, e.target.value)} />
    </div>
  );

  const ft = (lbl: string, key: string, ph = "", rows = 3) => (
    <div key={key}>
      <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>{lbl}</label>
      <textarea className="zap-input" rows={rows} style={{ resize: "none" }} value={c[key] ?? ""} placeholder={ph}
        onChange={e => onUpdate(node.nodeId, key, e.target.value)} />
    </div>
  );

  const fs = (lbl: string, key: string, opts: string[]) => (
    <div key={key}>
      <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>{lbl}</label>
      <select className="zap-input" value={c[key] ?? opts[0]} style={{ background: "#060809" }}
        onChange={e => onUpdate(node.nodeId, key, e.target.value)}>
        {opts.map(o => <option key={o} value={o} style={{ background: "#0c0f18" }}>{o}</option>)}
      </select>
    </div>
  );

  const varHint = <p key="var-hint" style={{ fontSize: 9, color: "#252838", marginTop: 2 }}>Variáveis: {"{{nome}}"} {"{{telefone}}"} {"{{email}}"}</p>;

  let fields: React.ReactNode[] = [];
  fields.push(fi("Rótulo do nó", "_lbl", "Nome..."));

  switch (node.type) {
    case "trigger":
      fields.push(fs("Gatilho", "trigger", ["new_message", "keyword", "first_message", "schedule"]));
      fields.push(fi("Palavra-chave", "keyword", "Olá, oi, start..."));
      break;
    case "text":
      fields.push(ft("Mensagem", "text", "Escreva a mensagem...", 4));
      fields.push(varHint);
      break;
    case "audio":
      fields.push(fi("URL do áudio", "url", "https://..."));
      fields.push(ft("Texto para voz (TTS)", "tts", "Texto que será falado...", 3));
      break;
    case "image":
      fields.push(fi("URL da imagem", "url", "https://..."));
      fields.push(fi("Legenda", "caption", "Legenda opcional..."));
      break;
    case "video":
      fields.push(fi("URL do vídeo", "url", "https://..."));
      fields.push(fi("Legenda", "caption", "Legenda opcional..."));
      break;
    case "delay":
      fields.push(fi("Duração", "duration", "5", "number"));
      fields.push(fs("Unidade", "unit", ["seconds", "minutes", "hours"]));
      break;
    case "wait":
      fields.push(fi("Timeout", "timeout", "24", "number"));
      fields.push(fs("Unidade", "unit", ["minutes", "hours", "days"]));
      break;
    case "identify":
      fields.push(fs("Variável", "variable", ["name", "phone", "email", "cpf", "custom"]));
      fields.push(fi("Pergunta ao usuário", "question", "Qual é o seu nome?"));
      break;
    case "buttons":
      fields.push(ft("Texto do menu", "text", "Escolha uma opção:", 3));
      fields.push(varHint);
      // Dynamic outputs editor
      fields.push(
        <div key="outputs">
          <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 4 }}>Opções / Saídas</label>
          {node.outputs.map((port, idx) => (
            <div key={port.id} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
              <div style={{ width: 16, height: 16, borderRadius: 3, background: "#091c34", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#378add", flexShrink: 0 }}>{idx + 1}</div>
              <input
                className="zap-input"
                style={{ flex: 1, fontSize: 10, padding: "3px 6px" }}
                value={port.label ?? ""}
                placeholder={`Opção ${idx + 1}`}
                onChange={e => {
                  const updated = node.outputs.map(p => p.id === port.id ? { ...p, label: e.target.value } : p);
                  onUpdateOutputs(node.nodeId, updated);
                }}
              />
              {node.outputs.length > 1 && (
                <button
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#3a1010", fontSize: 13, lineHeight: 1, padding: 0 }}
                  onClick={() => onUpdateOutputs(node.nodeId, node.outputs.filter(p => p.id !== port.id))}
                >×</button>
              )}
            </div>
          ))}
          {node.outputs.length < 6 && (
            <button
              style={{ fontSize: 10, color: "#25d366", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              onClick={() => {
                const newId = `opt${Date.now().toString(36)}`;
                onUpdateOutputs(node.nodeId, [...node.outputs, { id: newId, label: `Opção ${node.outputs.length + 1}` }]);
              }}
            >+ Adicionar opção</button>
          )}
        </div>
      );
      break;
    case "condition":
      fields.push(fi("Variável", "variable", "{{status}}, {{valor}}..."));
      fields.push(fs("Operador", "operator", ["equals", "not_equals", "contains", "starts_with", "greater_than", "less_than"]));
      fields.push(fi("Valor", "value", "Valor para comparar"));
      break;
    case "pix":
      fields.push(fi("Valor (R$)", "amount", "0.00", "number"));
      fields.push(fi("Descrição", "description", "Pagamento do produto X"));
      fields.push(fs("Gateway", "gateway", ["mercadopago", "asaas", "pagseguro", "stripe"]));
      fields.push(fi("Expiração (min)", "expiration", "30", "number"));
      break;
    case "connect":
      fields.push(fi("Departamento", "department", "Suporte, Vendas..."));
      fields.push(fi("Mensagem de transferência", "message", "Transferindo para atendente..."));
      break;
    case "ai":
      fields.push(fs("Modelo", "model", ["claude-3-5-sonnet", "claude-3-haiku", "gpt-4o"]));
      fields.push(ft("Prompt do sistema", "prompt", "Você é um assistente de vendas...", 4));
      fields.push(fi("Máx. de turnos", "maxTurns", "5", "number"));
      break;
    case "tag":
      fields.push(fi("Tags (separadas por vírgula)", "tags", "vip, cliente, lead-quente"));
      break;
    case "webhook":
      fields.push(fi("URL", "url", "https://api.meuservico.com/webhook"));
      fields.push(fs("Método", "method", ["POST", "GET", "PUT"]));
      fields.push(ft("Body (JSON)", "body", '{"nome": "{{nome}}"}', 3));
      break;
    case "end":
      fields.push(
        <div key="end-info" style={{ fontSize: 10, color: "#3a4058", background: "#1a0a0a", borderRadius: 5, padding: "6px 8px" }}>
          Este nó encerra o fluxo. Nenhuma configuração necessária.
        </div>
      );
      break;
  }

  return (
    <>
      <div style={{ padding: "10px 12px 8px", borderBottom: "0.5px solid #141720", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: 4, background: def.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={def.cl} strokeWidth="2" width="11" height="11">
              <path d={def.icon} />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#dde0ec" }}>{node.label}</div>
            <div style={{ fontSize: 9, color: "#252838", marginTop: 1 }}>{def.sub}</div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto zap-scroll" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 9 }}>
        {fields}
      </div>
      <div style={{ padding: "9px 12px", borderTop: "0.5px solid #141720", flexShrink: 0 }}>
        <button
          onClick={() => onDelete(node.nodeId)}
          style={{ width: "100%", background: "transparent", border: "0.5px solid #3a1010", borderRadius: 5, padding: 5, fontSize: 10, color: "#e24b4a", cursor: "pointer" }}
        >
          Remover nó
        </button>
      </div>
    </>
  );
}
