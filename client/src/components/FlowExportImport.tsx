import { useState, useRef } from "react";
import { Download, Upload, Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface FlowData {
  id: string;
  name: string;
  description?: string;
  nodes: any[];
  version: string;
  exportedAt: string;
}

interface FlowExportImportProps {
  flowId?: number;
  flowName?: string;
  flowNodes?: any[];
  onImport?: (flowData: FlowData) => void;
}

export function FlowExportImport({
  flowId,
  flowName = "Fluxo",
  flowNodes = [],
  onImport,
}: FlowExportImportProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    const flowData: FlowData = {
      id: `flow-${Date.now()}`,
      name: flowName,
      description: `Exportado em ${new Date().toLocaleString("pt-BR")}`,
      nodes: flowNodes,
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(flowData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${flowName.replace(/\s+/g, "-")}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Fluxo exportado com sucesso!");
    setShowExportMenu(false);
  };

  const handleGenerateShareCode = () => {
    const flowData: FlowData = {
      id: `flow-${Date.now()}`,
      name: flowName,
      description: `Compartilhado em ${new Date().toLocaleString("pt-BR")}`,
      nodes: flowNodes,
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
    };

    // Generate a short code from base64
    const encoded = btoa(JSON.stringify(flowData)).substring(0, 12);
    const code = `ZAP-${encoded.toUpperCase()}`;
    
    // Store in localStorage for sharing
    localStorage.setItem(`flow-share-${code}`, JSON.stringify(flowData));
    
    setShareCode(code);
    toast.success("Código de compartilhamento gerado!");
  };

  const handleCopyShareCode = () => {
    if (shareCode) {
      navigator.clipboard.writeText(shareCode);
      setCopiedCode(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const flowData = JSON.parse(content) as FlowData;

        // Validate structure
        if (!flowData.name || !Array.isArray(flowData.nodes)) {
          throw new Error("Estrutura de fluxo inválida");
        }

        onImport?.(flowData);
        toast.success("Fluxo importado com sucesso!");
        setShowImportMenu(false);
      } catch (error) {
        toast.error("Erro ao importar fluxo: " + (error as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleImportFromCode = () => {
    const code = prompt("Digite o código de compartilhamento (ex: ZAP-ABC123...):");
    if (!code) return;

    const flowDataStr = localStorage.getItem(`flow-share-${code}`);
    if (!flowDataStr) {
      toast.error("Código não encontrado ou expirado");
      return;
    }

    try {
      const flowData = JSON.parse(flowDataStr) as FlowData;
      onImport?.(flowData);
      toast.success("Fluxo importado com sucesso!");
      setShowImportMenu(false);
    } catch (error) {
      toast.error("Erro ao importar fluxo");
    }
  };

  return (
    <div className="flex gap-2">
      {/* Export Button */}
      <div className="relative">
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors"
          style={{
            background: "#378add",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 500,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#2563eb")}
          onMouseLeave={e => (e.currentTarget.style.background = "#378add")}
          title="Exportar fluxo"
        >
          <Download size={14} />
          Exportar
        </button>

        {showExportMenu && (
          <div
            className="absolute top-full left-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-20"
            style={{ minWidth: 200 }}
          >
            <button
              onClick={handleExportJSON}
              className="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors border-b border-gray-800 flex items-center gap-2"
              style={{ fontSize: 12 }}
            >
              <Download size={12} />
              Exportar como JSON
            </button>
            <button
              onClick={handleGenerateShareCode}
              className="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors flex items-center gap-2"
              style={{ fontSize: 12 }}
            >
              <Share2 size={12} />
              Gerar Código de Compartilhamento
            </button>
          </div>
        )}
      </div>

      {/* Import Button */}
      <div className="relative">
        <button
          onClick={() => setShowImportMenu(!showImportMenu)}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors"
          style={{
            background: "#25d366",
            color: "#000",
            cursor: "pointer",
            fontWeight: 500,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#20ba5a")}
          onMouseLeave={e => (e.currentTarget.style.background = "#25d366")}
          title="Importar fluxo"
        >
          <Upload size={14} />
          Importar
        </button>

        {showImportMenu && (
          <div
            className="absolute top-full left-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-20"
            style={{ minWidth: 200 }}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors border-b border-gray-800 flex items-center gap-2"
              style={{ fontSize: 12 }}
            >
              <Upload size={12} />
              Importar Arquivo JSON
            </button>
            <button
              onClick={handleImportFromCode}
              className="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors flex items-center gap-2"
              style={{ fontSize: 12 }}
            >
              <Share2 size={12} />
              Importar de Código
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportJSON}
          style={{ display: "none" }}
        />
      </div>

      {/* Share Code Display */}
      {shareCode && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs"
          style={{
            background: "#0c0f18",
            border: "1px solid #141720",
            color: "#dde0ec",
          }}
        >
          <span style={{ fontFamily: "monospace", fontSize: 11 }}>{shareCode}</span>
          <button
            onClick={handleCopyShareCode}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
            style={{ cursor: "pointer" }}
          >
            {copiedCode ? (
              <Check size={12} style={{ color: "#25d366" }} />
            ) : (
              <Copy size={12} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
