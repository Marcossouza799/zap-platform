import { useState } from "react";
import { AlertCircle, CheckCircle, AlertTriangle, Zap, Play } from "lucide-react";
import { toast } from "sonner";

interface FlowNode {
  id: string;
  type: string;
  title: string;
  config?: Record<string, any>;
  order: number;
}

interface ValidationError {
  nodeId: string;
  nodeTitle: string;
  type: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
}

interface FlowDebuggerProps {
  nodes: FlowNode[];
  flowName?: string;
}

export function FlowDebugger({ nodes, flowName = "Fluxo" }: FlowDebuggerProps) {
  const [showDebugger, setShowDebugger] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const validateFlow = () => {
    setIsValidating(true);
    const newErrors: ValidationError[] = [];

    // Check if flow has nodes
    if (nodes.length === 0) {
      newErrors.push({
        nodeId: "flow",
        nodeTitle: "Fluxo",
        type: "error",
        message: "Fluxo vazio - adicione pelo menos um nó",
        suggestion: "Clique em 'Adicionar Nó' para começar",
      });
    }

    // Validate each node
    nodes.forEach((node, index) => {
      // Check for required fields
      if (!node.type) {
        newErrors.push({
          nodeId: node.id,
          nodeTitle: node.title || `Nó ${index + 1}`,
          type: "error",
          message: "Tipo de nó não definido",
        });
      }

      if (!node.title || node.title.trim() === "") {
        newErrors.push({
          nodeId: node.id,
          nodeTitle: `Nó ${index + 1}`,
          type: "warning",
          message: "Título do nó está vazio",
          suggestion: "Adicione um título descritivo",
        });
      }

      // Type-specific validation
      if (node.type === "message" && !node.config?.text) {
        newErrors.push({
          nodeId: node.id,
          nodeTitle: node.title,
          type: "error",
          message: "Mensagem sem conteúdo",
          suggestion: "Configure o texto da mensagem",
        });
      }

      if (node.type === "button" && (!node.config?.buttons || node.config.buttons.length === 0)) {
        newErrors.push({
          nodeId: node.id,
          nodeTitle: node.title,
          type: "error",
          message: "Nó de botões sem opções",
          suggestion: "Adicione pelo menos um botão",
        });
      }

      if (node.type === "input" && !node.config?.inputType) {
        newErrors.push({
          nodeId: node.id,
          nodeTitle: node.title,
          type: "warning",
          message: "Tipo de entrada não especificado",
          suggestion: "Escolha entre texto, número ou email",
        });
      }

      if (node.type === "condition" && !node.config?.condition) {
        newErrors.push({
          nodeId: node.id,
          nodeTitle: node.title,
          type: "error",
          message: "Condição não definida",
          suggestion: "Configure a condição para este nó",
        });
      }
    });

    // Check for loops
    const hasLoop = checkForLoops(nodes);
    if (hasLoop) {
      newErrors.push({
        nodeId: "flow",
        nodeTitle: "Fluxo",
        type: "warning",
        message: "Possível loop infinito detectado",
        suggestion: "Verifique se há nós que se referenciam circularmente",
      });
    }

    // Check for orphaned nodes
    if (nodes.length > 1) {
      const hasOrphaned = nodes.some((node, idx) => {
        if (idx === nodes.length - 1) return false; // Last node can be orphaned
        return !node.config?.nextNodeId && idx < nodes.length - 1;
      });

      if (hasOrphaned) {
        newErrors.push({
          nodeId: "flow",
          nodeTitle: "Fluxo",
          type: "info",
          message: "Alguns nós podem não ter continuação",
          suggestion: "Verifique se todos os nós estão conectados",
        });
      }
    }

    setErrors(newErrors);
    setIsValidating(false);

    if (newErrors.length === 0) {
      toast.success("✓ Fluxo validado com sucesso!");
    } else {
      const errorCount = newErrors.filter(e => e.type === "error").length;
      const warningCount = newErrors.filter(e => e.type === "warning").length;
      toast.error(`${errorCount} erro(s), ${warningCount} aviso(s)`);
    }
  };

  const checkForLoops = (nodes: FlowNode[]): boolean => {
    // Simplified loop detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      const nextNodeId = node?.config?.nextNodeId;

      if (nextNodeId && recursionStack.has(nextNodeId)) {
        return true; // Loop detected
      }

      if (nextNodeId && !visited.has(nextNodeId)) {
        if (dfs(nextNodeId)) return true;
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertCircle size={16} style={{ color: "#ef4444" }} />;
      case "warning":
        return <AlertTriangle size={16} style={{ color: "#eab308" }} />;
      default:
        return <CheckCircle size={16} style={{ color: "#378add" }} />;
    }
  };

  return (
    <div>
      {/* Debug Button */}
      <button
        onClick={() => {
          setShowDebugger(!showDebugger);
          if (!showDebugger) validateFlow();
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors"
        style={{
          background: errors.length > 0 ? "#ef4444" : "#378add",
          color: "#fff",
          cursor: "pointer",
          fontWeight: 500,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = errors.length > 0 ? "#dc2626" : "#2563eb";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = errors.length > 0 ? "#ef4444" : "#378add";
        }}
        title="Validar fluxo"
      >
        <Zap size={14} />
        Debug {errors.length > 0 && `(${errors.length})`}
      </button>

      {/* Debug Panel */}
      {showDebugger && (
        <div
          className="fixed bottom-4 right-4 z-50 rounded-lg shadow-lg"
          style={{
            width: 400,
            maxHeight: 500,
            background: "#0c0f18",
            border: "1px solid #141720",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 border-b"
            style={{ borderColor: "#141720" }}
          >
            <h3 style={{ fontSize: 13, fontWeight: 600 }}>Debugger de Fluxo</h3>
            <button
              onClick={() => setShowDebugger(false)}
              className="p-1 hover:bg-gray-800 rounded transition-colors"
              style={{ cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isValidating ? (
              <div style={{ textAlign: "center", color: "#5a5f7a", fontSize: 12 }}>
                Validando...
              </div>
            ) : errors.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 12,
                  background: "#0a1a1a",
                  borderRadius: 6,
                  border: "1px solid #25d366",
                }}
              >
                <CheckCircle size={16} style={{ color: "#25d366" }} />
                <span style={{ fontSize: 12, color: "#25d366" }}>
                  Fluxo validado com sucesso!
                </span>
              </div>
            ) : (
              errors.map((error, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 12,
                    background: "#0a0c14",
                    borderRadius: 6,
                    border: `1px solid ${
                      error.type === "error"
                        ? "#ef4444"
                        : error.type === "warning"
                        ? "#eab308"
                        : "#378add"
                    }`,
                  }}
                >
                  <div className="flex items-start gap-2 mb-2">
                    {getErrorIcon(error.type)}
                    <div className="flex-1">
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#dde0ec" }}>
                        {error.nodeTitle}
                      </div>
                      <div style={{ fontSize: 10, color: "#5a5f7a", marginTop: 2 }}>
                        {error.message}
                      </div>
                    </div>
                  </div>
                  {error.suggestion && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "#378add",
                        background: "#141720",
                        padding: 6,
                        borderRadius: 3,
                        marginTop: 6,
                      }}
                    >
                      💡 {error.suggestion}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            className="p-4 border-t"
            style={{ borderColor: "#141720" }}
          >
            <button
              onClick={validateFlow}
              disabled={isValidating}
              className="w-full px-3 py-1.5 rounded text-xs transition-colors"
              style={{
                background: "#378add",
                color: "#fff",
                cursor: isValidating ? "not-allowed" : "pointer",
                fontWeight: 500,
                opacity: isValidating ? 0.6 : 1,
              }}
              onMouseEnter={e => {
                if (!isValidating) e.currentTarget.style.background = "#2563eb";
              }}
              onMouseLeave={e => {
                if (!isValidating) e.currentTarget.style.background = "#378add";
              }}
            >
              {isValidating ? "Validando..." : "Validar Novamente"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
