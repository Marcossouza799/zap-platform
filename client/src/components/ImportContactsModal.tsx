import { trpc } from "@/lib/trpc";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, ArrowRight, ArrowLeft, Check, X, Download, AlertCircle } from "lucide-react";

type Step = "upload" | "mapping" | "confirm" | "done";

interface ParsedData {
  columns: string[];
  previewRows: Record<string, string>[];
  totalRows: number;
  allRows: Record<string, string>[];
  errors: string[];
}

interface Mapping {
  nome: string;
  telefone: string;
  tags: string;
  email: string;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const FIELD_LABELS: Record<keyof Mapping, string> = {
  nome: "Nome *",
  telefone: "Telefone *",
  tags: "Tags (separadas por vírgula)",
  email: "E-mail",
};

const FIELD_REQUIRED: Record<keyof Mapping, boolean> = {
  nome: true,
  telefone: true,
  tags: false,
  email: false,
};

// Auto-detect column mapping by common header names
function autoDetectMapping(columns: string[]): Mapping {
  const lower = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const find = (patterns: string[]) =>
    columns.find((c) => patterns.some((p) => lower(c).includes(p))) ?? "";

  return {
    nome: find(["nome", "name", "contato", "contact", "cliente", "client"]),
    telefone: find(["tel", "fone", "phone", "celular", "whatsapp", "numero", "number"]),
    tags: find(["tag", "categoria", "category", "grupo", "group", "segmento"]),
    email: find(["email", "mail", "e-mail"]),
  };
}

export default function ImportContactsModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<Mapping>({ nome: "", telefone: "", tags: "", email: "" });
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewMutation = trpc.contacts.importPreview.useMutation();
  const confirmMutation = trpc.contacts.importConfirm.useMutation();

  // ---- File reading helpers ----
  const readFileAsBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // strip data URL prefix
        const base64 = result.split(",")[1] ?? result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const processFile = useCallback(async (f: File) => {
    setFile(f);
    try {
      const base64 = await readFileAsBase64(f);
      const data = await previewMutation.mutateAsync({ fileBase64: base64, mimeType: f.type });
      if (data.errors.length > 0 && data.totalRows === 0) {
        toast.error(`Erro ao ler arquivo: ${data.errors[0]}`);
        return;
      }
      setParsedData(data);
      setMapping(autoDetectMapping(data.columns));
      setStep("mapping");
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao processar arquivo");
    }
  }, []);

  // ---- Drag & drop ----
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) processFile(f);
    },
    [processFile]
  );

  // ---- Confirm import ----
  const handleConfirm = async () => {
    if (!parsedData) return;
    try {
      const result = await confirmMutation.mutateAsync({
        rows: parsedData.allRows,
        mapping: {
          nome: mapping.nome,
          telefone: mapping.telefone,
          tags: mapping.tags,
          email: mapping.email,
        },
      });
      setImportResult(result);
      setStep("done");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao importar contatos");
    }
  };

  // ---- Preview of mapped data ----
  const mappedPreview = parsedData
    ? parsedData.previewRows.map((row) => ({
        nome: mapping.nome ? (row[mapping.nome] ?? "") : "",
        telefone: mapping.telefone ? (row[mapping.telefone] ?? "") : "",
        tags: mapping.tags ? (row[mapping.tags] ?? "") : "",
        email: mapping.email ? (row[mapping.email] ?? "") : "",
      }))
    : [];

  const canProceedToConfirm = mapping.nome && mapping.telefone;

  // ---- CSV template download ----
  const downloadTemplate = () => {
    const csv = "nome,telefone,tags,email\nJoão Silva,5511999990001,cliente;vip,joao@email.com\nMaria Souza,5511999990002,lead,maria@email.com";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_contatos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Styles ----
  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const modalStyle: React.CSSProperties = {
    background: "#0c0f18", border: "0.5px solid #1e2235", borderRadius: 10,
    width: "min(640px, 96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column",
    overflow: "hidden",
  };
  const headerStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 18px", borderBottom: "0.5px solid #141720",
  };
  const bodyStyle: React.CSSProperties = { padding: "18px 18px 14px", overflowY: "auto", flex: 1 };
  const footerStyle: React.CSSProperties = {
    display: "flex", justifyContent: "flex-end", gap: 8,
    padding: "12px 18px", borderTop: "0.5px solid #141720",
  };

  const selectStyle: React.CSSProperties = {
    background: "#080b0e", border: "0.5px solid #1e2235", borderRadius: 5,
    color: "#c8cde0", fontSize: 11, padding: "5px 8px", width: "100%",
  };

  const stepLabels = ["Upload", "Mapeamento", "Confirmação"];
  const stepIndex = step === "upload" ? 0 : step === "mapping" ? 1 : step === "confirm" ? 2 : 3;

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e8ecf5" }}>Importar Contatos</span>
            <span style={{ fontSize: 10, color: "#343850", marginLeft: 8 }}>CSV ou Excel</span>
          </div>
          <button onClick={onClose} style={{ color: "#5a5f7a", background: "none", border: "none", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>

        {/* Step indicator */}
        {step !== "done" && (
          <div style={{ display: "flex", alignItems: "center", padding: "10px 18px", gap: 0, borderBottom: "0.5px solid #141720" }}>
            {stepLabels.map((label, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center", flex: i < stepLabels.length - 1 ? 1 : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700,
                    background: i < stepIndex ? "#0c2218" : i === stepIndex ? "#25d366" : "#141720",
                    color: i < stepIndex ? "#25d366" : i === stepIndex ? "#080b0e" : "#5a5f7a",
                    border: i < stepIndex ? "0.5px solid #153520" : i === stepIndex ? "none" : "0.5px solid #1e2235",
                  }}>
                    {i < stepIndex ? <Check size={9} /> : i + 1}
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
        <div style={bodyStyle}>

          {/* ---- STEP 1: Upload ---- */}
          {step === "upload" && (
            <div>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `1.5px dashed ${isDragging ? "#25d366" : "#1e2235"}`,
                  borderRadius: 8, padding: "32px 20px", textAlign: "center",
                  cursor: "pointer", transition: "border-color 0.15s",
                  background: isDragging ? "#0c2218" : "#080b0e",
                }}
              >
                <Upload size={28} style={{ color: isDragging ? "#25d366" : "#343850", margin: "0 auto 10px" }} />
                <p style={{ fontSize: 12, color: "#c8cde0", marginBottom: 4 }}>
                  Arraste um arquivo ou <span style={{ color: "#25d366" }}>clique para selecionar</span>
                </p>
                <p style={{ fontSize: 10, color: "#343850" }}>Suporta CSV, XLS e XLSX · Máximo 5.000 contatos</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processFile(f);
                  }}
                />
              </div>

              {previewMutation.isPending && (
                <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#25d366" }}>
                  Processando arquivo...
                </div>
              )}

              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={downloadTemplate}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#378add", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <Download size={11} /> Baixar template CSV
                </button>
                <span style={{ fontSize: 10, color: "#343850" }}>— use como modelo para formatar sua planilha</span>
              </div>

              <div style={{ marginTop: 14, background: "#080b0e", border: "0.5px solid #141720", borderRadius: 6, padding: "10px 12px" }}>
                <p style={{ fontSize: 10, color: "#5a5f7a", marginBottom: 4 }}>Colunas esperadas no arquivo:</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["nome", "telefone", "tags", "email"].map((f) => (
                    <span key={f} style={{ fontSize: 9, background: "#0c0f18", border: "0.5px solid #1e2235", borderRadius: 4, padding: "2px 6px", color: "#c8cde0" }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---- STEP 2: Mapping ---- */}
          {step === "mapping" && parsedData && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <FileText size={13} style={{ color: "#25d366" }} />
                <span style={{ fontSize: 11, color: "#c8cde0" }}>{file?.name}</span>
                <span style={{ fontSize: 10, color: "#343850" }}>· {parsedData.totalRows} linhas detectadas</span>
              </div>

              {parsedData.errors.length > 0 && (
                <div style={{ background: "#1a0a0a", border: "0.5px solid #3d1010", borderRadius: 6, padding: "8px 10px", marginBottom: 12, display: "flex", gap: 6 }}>
                  <AlertCircle size={12} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 10, color: "#ef9f9f" }}>{parsedData.errors[0]}</span>
                </div>
              )}

              <p style={{ fontSize: 11, color: "#5a5f7a", marginBottom: 12 }}>
                Mapeie as colunas do seu arquivo para os campos do contato:
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {(Object.keys(FIELD_LABELS) as (keyof Mapping)[]).map((field) => (
                  <div key={field}>
                    <label style={{ fontSize: 10, color: "#5a5f7a", display: "block", marginBottom: 4 }}>
                      {FIELD_LABELS[field]}
                    </label>
                    <select
                      value={mapping[field]}
                      onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                      style={selectStyle}
                    >
                      <option value="">— não importar —</option>
                      {parsedData.columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              {parsedData.previewRows.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 10, color: "#5a5f7a", marginBottom: 6 }}>Pré-visualização (primeiras {parsedData.previewRows.length} linhas):</p>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                      <thead>
                        <tr>
                          {["nome", "telefone", "tags", "email"].filter((f) => mapping[f as keyof Mapping]).map((f) => (
                            <th key={f} style={{ textAlign: "left", padding: "4px 8px", color: "#5a5f7a", borderBottom: "0.5px solid #141720", fontWeight: 500 }}>
                              {f.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mappedPreview.map((row, i) => (
                          <tr key={i}>
                            {["nome", "telefone", "tags", "email"].filter((f) => mapping[f as keyof Mapping]).map((f) => (
                              <td key={f} style={{ padding: "4px 8px", color: "#c8cde0", borderBottom: "0.5px solid #0c0f18", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {row[f as keyof typeof row] || <span style={{ color: "#343850" }}>—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- STEP 3: Confirm ---- */}
          {step === "confirm" && parsedData && (
            <div>
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#0c2218", border: "1.5px solid #153520", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <Upload size={20} style={{ color: "#25d366" }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#e8ecf5", marginBottom: 6 }}>
                  Pronto para importar
                </p>
                <p style={{ fontSize: 11, color: "#5a5f7a" }}>
                  <span style={{ color: "#25d366", fontWeight: 600 }}>{parsedData.totalRows}</span> contatos serão processados.
                  Duplicatas (mesmo telefone) serão ignoradas automaticamente.
                </p>
              </div>

              <div style={{ background: "#080b0e", border: "0.5px solid #141720", borderRadius: 6, padding: "12px 14px", marginTop: 8 }}>
                <p style={{ fontSize: 10, color: "#5a5f7a", marginBottom: 8 }}>Resumo do mapeamento:</p>
                {(Object.keys(FIELD_LABELS) as (keyof Mapping)[]).filter((f) => mapping[f]).map((f) => (
                  <div key={f} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "#5a5f7a" }}>{FIELD_LABELS[f].replace(" *", "")}</span>
                    <span style={{ fontSize: 10, color: "#c8cde0" }}>← {mapping[f]}</span>
                  </div>
                ))}
              </div>

              {confirmMutation.isPending && (
                <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#25d366" }}>
                  Importando contatos...
                </div>
              )}
            </div>
          )}

          {/* ---- DONE ---- */}
          {step === "done" && importResult && (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#0c2218", border: "1.5px solid #153520", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Check size={22} style={{ color: "#25d366" }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#e8ecf5", marginBottom: 8 }}>Importação concluída!</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 14 }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#25d366" }}>{importResult.inserted}</p>
                  <p style={{ fontSize: 10, color: "#5a5f7a" }}>Importados</p>
                </div>
                <div style={{ width: 1, background: "#141720" }} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#ef9f27" }}>{importResult.skipped}</p>
                  <p style={{ fontSize: 10, color: "#5a5f7a" }}>Ignorados (duplicatas)</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          {step === "done" ? (
            <button
              onClick={onClose}
              style={{ background: "#25d366", color: "#080b0e", border: "none", borderRadius: 5, padding: "6px 16px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
            >
              Fechar
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  if (step === "mapping") setStep("upload");
                  else if (step === "confirm") setStep("mapping");
                  else onClose();
                }}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "0.5px solid #1e2235", borderRadius: 5, padding: "6px 12px", fontSize: 11, color: "#c8cde0", cursor: "pointer" }}
              >
                <ArrowLeft size={11} />
                {step === "upload" ? "Cancelar" : "Voltar"}
              </button>

              {step === "mapping" && (
                <button
                  disabled={!canProceedToConfirm}
                  onClick={() => setStep("confirm")}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    background: canProceedToConfirm ? "#25d366" : "#141720",
                    color: canProceedToConfirm ? "#080b0e" : "#343850",
                    border: "none", borderRadius: 5, padding: "6px 14px", fontSize: 11, fontWeight: 600,
                    cursor: canProceedToConfirm ? "pointer" : "not-allowed",
                  }}
                >
                  Continuar <ArrowRight size={11} />
                </button>
              )}

              {step === "confirm" && (
                <button
                  disabled={confirmMutation.isPending}
                  onClick={handleConfirm}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    background: "#25d366", color: "#080b0e",
                    border: "none", borderRadius: 5, padding: "6px 16px", fontSize: 11, fontWeight: 600,
                    cursor: confirmMutation.isPending ? "not-allowed" : "pointer",
                    opacity: confirmMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {confirmMutation.isPending ? "Importando..." : `Importar ${parsedData?.totalRows ?? ""} contatos`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
