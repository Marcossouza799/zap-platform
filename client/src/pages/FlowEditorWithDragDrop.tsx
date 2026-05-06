import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Save, X, ChevronDown } from "lucide-react";
import { useDragDrop } from "@/hooks/useDragDrop";
import { DraggableFlowNode } from "@/components/DraggableFlowNode";

interface FlowNode {
  id: string;
  type: string;
  title: string;
  description?: string;
  config?: Record<string, any>;
  order: number;
  color?: string;
}

const NODE_TYPES = [
  { id: "message", label: "Mensagem", color: "#378add", icon: "💬" },
  { id: "button", label: "Botões", color: "#25d366", icon: "🔘" },
  { id: "input", label: "Entrada", color: "#f97316", icon: "📝" },
  { id: "condition", label: "Condição", color: "#8b5cf6", icon: "❓" },
  { id: "action", label: "Ação", color: "#ec4899", icon: "⚡" },
  { id: "delay", label: "Aguardar", color: "#eab308", icon: "⏱️" },
];

export default function FlowEditorWithDragDrop() {
  const { id } = useParams<{ id: string }>();
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    draggedItem,
    isDragging,
    isZoneOver,
    startDrag,
    endDrag,
    setDropZoneOver,
    handleDrop,
  } = useDragDrop();

  // Fetch flow data
  const { data: flow } = trpc.flows.get.useQuery({ id: parseInt(id || "0") });
  const updateFlow = trpc.flows.update.useMutation();

  useEffect(() => {
    // Try to load from localStorage first (for current session)
    if (id) {
      const savedNodes = localStorage.getItem(`flow-${id}-nodes`);
      if (savedNodes) {
        try {
          setNodes(JSON.parse(savedNodes));
          return;
        } catch {
          // Fall through
        }
      }
    }
    
    // Initialize with empty nodes
    setNodes([]);
  }, [id]);

  const handleAddNode = (typeId: string) => {
    const nodeType = NODE_TYPES.find(t => t.id === typeId);
    if (!nodeType) return;

    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type: typeId,
      title: nodeType.label,
      description: "Novo nó",
      order: nodes.length,
      color: nodeType.color,
    };

    setNodes([...nodes, newNode]);
    setShowNodeMenu(false);
    toast.success("Nó adicionado");
  };

  const handleReorderNodes = (fromIndex: number, toIndex: number) => {
    const newNodes = [...nodes];
    const [movedNode] = newNodes.splice(fromIndex, 1);
    newNodes.splice(toIndex, 0, movedNode);

    // Update order
    newNodes.forEach((node, idx) => {
      node.order = idx;
    });

    setNodes(newNodes);
    toast.success("Nós reorganizados");
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!confirm("Tem certeza que deseja deletar este nó?")) return;

    const newNodes = nodes.filter(n => n.id !== nodeId);
    newNodes.forEach((node, idx) => {
      node.order = idx;
    });

    setNodes(newNodes);
    toast.success("Nó removido");
  };

  const handleSaveFlow = async () => {
    if (!id || nodes.length === 0) {
      toast.error("Adicione pelo menos um nó ao fluxo");
      return;
    }

    setIsSaving(true);
    try {
      // Store nodes in localStorage for now
      localStorage.setItem(`flow-${id}-nodes`, JSON.stringify(nodes));
      toast.success("Fluxo salvo com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar fluxo");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#080b0e", color: "#dde0ec" }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: "#141720" }}
      >
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 2 }}>
            {flow?.name || "Novo Fluxo"}
          </h1>
          <p style={{ fontSize: 11, color: "#5a5f7a" }}>
            {nodes.length} nó{nodes.length !== 1 ? "s" : ""} • Arraste para reorganizar
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowNodeMenu(!showNodeMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded transition-colors"
              style={{
                background: "#378add",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 500,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#2563eb")}
              onMouseLeave={e => (e.currentTarget.style.background = "#378add")}
            >
              <Plus size={16} />
              Adicionar Nó
            </button>

            {showNodeMenu && (
              <div
                className="absolute top-full right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-20"
                style={{ minWidth: 200 }}
              >
                {NODE_TYPES.map(nodeType => (
                  <button
                    key={nodeType.id}
                    onClick={() => handleAddNode(nodeType.id)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-b-0 flex items-center gap-2"
                    style={{ fontSize: 12 }}
                  >
                    <span>{nodeType.icon}</span>
                    {nodeType.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSaveFlow}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded transition-colors"
            style={{
              background: "#25d366",
              color: "#000",
              cursor: isSaving ? "not-allowed" : "pointer",
              fontWeight: 500,
              opacity: isSaving ? 0.6 : 1,
            }}
            onMouseEnter={e => {
              if (!isSaving) e.currentTarget.style.background = "#20ba5a";
            }}
            onMouseLeave={e => {
              if (!isSaving) e.currentTarget.style.background = "#25d366";
            }}
          >
            <Save size={16} />
            {isSaving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* Nodes List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {nodes.length === 0 ? (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: "#5a5f7a", fontSize: 14 }}
          >
            <div className="text-center">
              <p style={{ marginBottom: 12 }}>Nenhum nó no fluxo</p>
              <button
                onClick={() => setShowNodeMenu(true)}
                className="px-4 py-2 rounded transition-colors"
                style={{
                  background: "#378add",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#2563eb")}
                onMouseLeave={e => (e.currentTarget.style.background = "#378add")}
              >
                Criar Primeiro Nó
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {nodes.map((node, index) => (
              <div key={node.id}>
                {/* Drop zone above */}
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropZoneOver(`zone-${index}`, true);
                  }}
                  onDragLeave={() => setDropZoneOver(`zone-${index}`, false)}
                  onDrop={e => {
                    e.preventDefault();
                    handleDrop(`zone-${index}`, handleReorderNodes);
                    setDropZoneOver(`zone-${index}`, false);
                  }}
                  style={{
                    height: isZoneOver(`zone-${index}`) ? 40 : 8,
                    background: isZoneOver(`zone-${index}`)
                      ? "rgba(37, 211, 102, 0.1)"
                      : "transparent",
                    border: isZoneOver(`zone-${index}`)
                      ? "2px dashed #25d366"
                      : "1px dashed transparent",
                    borderRadius: 4,
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#5a5f7a",
                  }}
                >
                  {isZoneOver(`zone-${index}`) && "Solte aqui"}
                </div>

                {/* Node */}
                <DraggableFlowNode
                  id={node.id}
                  index={index}
                  type={node.type}
                  title={node.title}
                  description={node.description}
                  isDragging={draggedItem?.id === node.id}
                  isDropOver={false}
                  onDragStart={startDrag}
                  onDragEnd={endDrag}
                  onDragOver={e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDragLeave={() => {}}
                  onDrop={e => {
                    e.preventDefault();
                    handleDrop(`zone-${index}`, handleReorderNodes);
                  }}
                  onDelete={() => handleDeleteNode(node.id)}
                  color={node.color}
                  icon={NODE_TYPES.find(t => t.id === node.type)?.icon}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#5a5f7a",
                      padding: "8px 0",
                    }}
                  >
                    {node.config ? (
                      <details>
                        <summary style={{ cursor: "pointer", marginBottom: 6 }}>
                          Configuração
                        </summary>
                        <pre
                          style={{
                            fontSize: 9,
                            color: "#dde0ec",
                            background: "#0a0c14",
                            padding: 8,
                            borderRadius: 4,
                            overflow: "auto",
                            maxHeight: 100,
                          }}
                        >
                          {JSON.stringify(node.config, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      "Sem configuração"
                    )}
                  </div>
                </DraggableFlowNode>
              </div>
            ))}

            {/* Final drop zone */}
            <div
              onDragOver={e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDropZoneOver(`zone-end`, true);
              }}
              onDragLeave={() => setDropZoneOver(`zone-end`, false)}
              onDrop={e => {
                e.preventDefault();
                handleDrop(`zone-end`, (from, to) => {
                  handleReorderNodes(from, nodes.length - 1);
                });
                setDropZoneOver(`zone-end`, false);
              }}
              style={{
                height: isZoneOver(`zone-end`) ? 40 : 8,
                background: isZoneOver(`zone-end`)
                  ? "rgba(37, 211, 102, 0.1)"
                  : "transparent",
                border: isZoneOver(`zone-end`)
                  ? "2px dashed #25d366"
                  : "1px dashed transparent",
                borderRadius: 4,
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: "#5a5f7a",
                marginTop: 12,
              }}
            >
              {isZoneOver(`zone-end`) && "Solte aqui"}
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      {isDragging && (
        <div
          className="flex-shrink-0 px-6 py-3 border-t text-center"
          style={{ borderColor: "#141720", fontSize: 12, color: "#5a5f7a" }}
        >
          Arrastando: <strong>{draggedItem?.type}</strong> • Solte em uma zona para reorganizar
        </div>
      )}
    </div>
  );
}
