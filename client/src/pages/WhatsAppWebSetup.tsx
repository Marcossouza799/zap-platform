import { useState, useEffect } from "react";
import { QrCode, Phone, Check, X, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

type ConnectionStatus = "idle" | "scanning" | "connected" | "error";

interface WhatsAppSession {
  id: string;
  phoneNumber: string;
  status: "active" | "inactive";
  connectedAt: string;
  lastActivity: string;
}

export default function WhatsAppWebSetup() {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [contactsCount, setContactsCount] = useState(0);

  // Simulate QR code generation
  const handleStartScanning = () => {
    setIsScanning(true);
    setStatus("scanning");
    
    // Generate mock QR code
    const mockQR = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=whatsapp-web-${Date.now()}`;
    setQrCode(mockQR);

    // Simulate connection after 3 seconds
    setTimeout(() => {
      const mockSession: WhatsAppSession = {
        id: `session-${Date.now()}`,
        phoneNumber: "+55 (11) 98765-4321",
        status: "active",
        connectedAt: new Date().toLocaleString("pt-BR"),
        lastActivity: new Date().toLocaleString("pt-BR"),
      };

      setSession(mockSession);
      setStatus("connected");
      setIsScanning(false);
      setQrCode(null);
      setContactsCount(Math.floor(Math.random() * 500) + 50);
      toast.success("WhatsApp Web conectado com sucesso!");
    }, 3000);
  };

  const handleDisconnect = () => {
    if (!confirm("Tem certeza que deseja desconectar?")) return;

    setSession(null);
    setStatus("idle");
    setQrCode(null);
    setContactsCount(0);
    toast.success("Desconectado com sucesso");
  };

  const handleSyncContacts = () => {
    toast.loading("Sincronizando contatos...");
    setTimeout(() => {
      toast.success(`${contactsCount} contatos sincronizados!`);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#080b0e", color: "#dde0ec" }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: "#141720" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          WhatsApp Web Setup
        </h1>
        <p style={{ fontSize: 12, color: "#5a5f7a" }}>
          Conecte sua conta do WhatsApp Web para usar a automação
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Status Card */}
          <div
            className="zap-card p-6"
            style={{
              background: "#0c0f18",
              borderLeft: `4px solid ${
                status === "connected" ? "#25d366" : status === "error" ? "#ef4444" : "#378add"
              }`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                  Status da Conexão
                </h3>
                <p style={{ fontSize: 12, color: "#5a5f7a" }}>
                  {status === "idle" && "Não conectado"}
                  {status === "scanning" && "Escaneando QR code..."}
                  {status === "connected" && "Conectado"}
                  {status === "error" && "Erro na conexão"}
                </p>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    status === "connected"
                      ? "#25d36633"
                      : status === "error"
                      ? "#ef444433"
                      : "#378add33",
                }}
              >
                {status === "connected" && <Check size={20} style={{ color: "#25d366" }} />}
                {status === "scanning" && (
                  <Loader2 size={20} style={{ color: "#378add", animation: "spin 1s linear infinite" }} />
                )}
                {status === "error" && <X size={20} style={{ color: "#ef4444" }} />}
                {status === "idle" && <Phone size={20} style={{ color: "#378add" }} />}
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          {status === "idle" && (
            <div
              className="zap-card p-6 text-center"
              style={{ background: "#0c0f18" }}
            >
              <QrCode size={48} style={{ margin: "0 auto 16px", color: "#378add" }} />
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Escanear QR Code
              </h3>
              <p style={{ fontSize: 12, color: "#5a5f7a", marginBottom: 16 }}>
                Clique no botão abaixo para gerar um QR code e escanear com seu telefone
              </p>
              <button
                onClick={handleStartScanning}
                disabled={isScanning}
                className="px-6 py-2 rounded transition-colors"
                style={{
                  background: "#378add",
                  color: "#fff",
                  cursor: isScanning ? "not-allowed" : "pointer",
                  fontWeight: 500,
                  opacity: isScanning ? 0.6 : 1,
                }}
                onMouseEnter={e => {
                  if (!isScanning) e.currentTarget.style.background = "#2563eb";
                }}
                onMouseLeave={e => {
                  if (!isScanning) e.currentTarget.style.background = "#378add";
                }}
              >
                {isScanning ? "Gerando QR Code..." : "Gerar QR Code"}
              </button>
            </div>
          )}

          {/* QR Code Display */}
          {qrCode && status === "scanning" && (
            <div
              className="zap-card p-6 text-center"
              style={{ background: "#0c0f18" }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                Escanear com seu telefone
              </h3>
              <img
                src={qrCode}
                alt="QR Code"
                style={{
                  width: 300,
                  height: 300,
                  margin: "0 auto 16px",
                  border: "2px solid #141720",
                  borderRadius: 8,
                }}
              />
              <p style={{ fontSize: 11, color: "#5a5f7a" }}>
                Aguardando confirmação...
              </p>
            </div>
          )}

          {/* Connected Session */}
          {session && status === "connected" && (
            <div
              className="zap-card p-6"
              style={{
                background: "#0c0f18",
                borderLeft: "4px solid #25d366",
              }}
            >
              <div className="space-y-4">
                <div>
                  <label style={{ fontSize: 11, color: "#5a5f7a", display: "block", marginBottom: 4 }}>
                    Número do WhatsApp
                  </label>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#25d366",
                      fontFamily: "monospace",
                    }}
                  >
                    {session.phoneNumber}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={{ fontSize: 11, color: "#5a5f7a", display: "block", marginBottom: 4 }}>
                      Conectado em
                    </label>
                    <div style={{ fontSize: 12, color: "#dde0ec" }}>
                      {session.connectedAt}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#5a5f7a", display: "block", marginBottom: 4 }}>
                      Última atividade
                    </label>
                    <div style={{ fontSize: 12, color: "#dde0ec" }}>
                      {session.lastActivity}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    background: "#0a0c14",
                    borderRadius: 6,
                    border: "1px solid #141720",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#5a5f7a", marginBottom: 4 }}>
                    Contatos sincronizados
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#25d366" }}>
                    {contactsCount}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSyncContacts}
                    className="flex-1 px-4 py-2 rounded transition-colors"
                    style={{
                      background: "#378add",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#2563eb")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#378add")}
                  >
                    Sincronizar Contatos
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded transition-colors"
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#dc2626")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#ef4444")}
                  >
                    <LogOut size={14} />
                    Desconectar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div
            className="zap-card p-6"
            style={{ background: "#0c0f18" }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              ℹ️ Como funciona
            </h3>
            <ol style={{ fontSize: 12, color: "#5a5f7a", lineHeight: 1.8 }}>
              <li>1. Clique em "Gerar QR Code"</li>
              <li>2. Abra WhatsApp no seu telefone</li>
              <li>3. Vá para Configurações → Dispositivos Vinculados</li>
              <li>4. Escanear QR Code com a câmera</li>
              <li>5. Aguarde a confirmação da conexão</li>
              <li>6. Seus contatos serão sincronizados automaticamente</li>
            </ol>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
