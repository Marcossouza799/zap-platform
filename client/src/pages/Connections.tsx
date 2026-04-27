import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Wifi, WifiOff, Plus, Trash2, RefreshCw, CheckCircle2,
  AlertCircle, Loader2, QrCode, Smartphone, Globe, Key,
  ChevronDown, ChevronUp, X, Settings, Zap, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ───────────────────────────────────────────────────────────────────

type ConnectionType = "official" | "unofficial";
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface Connection {
  id: number;
  name: string;
  type: ConnectionType;
  status: ConnectionStatus;
  config: Record<string, string>;
  qrCode: string;
  phone: string;
  createdAt: Date;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const map: Record<ConnectionStatus, { label: string; color: string; Icon: any }> = {
    connected:    { label: "Conectado",     color: "text-[#25d366]",  Icon: CheckCircle2 },
    connecting:   { label: "Aguardando QR", color: "text-yellow-400", Icon: QrCode },
    disconnected: { label: "Desconectado",  color: "text-gray-400",   Icon: WifiOff },
    error:        { label: "Erro",          color: "text-red-400",    Icon: AlertCircle },
  };
  const { label, color, Icon } = map[status] ?? map.disconnected;
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
      <Icon size={13} />
      {label}
    </span>
  );
}

// ─── New Connection Modal ─────────────────────────────────────────────────────

function NewConnectionModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<"type" | "config">("type");
  const [type, setType] = useState<ConnectionType>("unofficial");
  const [name, setName] = useState("");
  // Official fields
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  // Unofficial fields
  const [serverUrl, setServerUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [instanceName, setInstanceName] = useState("");

  const createMut = trpc.connections.create.useMutation({
    onSuccess: () => {
      toast.success("Conexão criada com sucesso!");
      onCreated();
      handleClose();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleClose() {
    setStep("type");
    setName("");
    setPhoneNumberId(""); setAccessToken(""); setWebhookSecret(""); setBusinessAccountId("");
    setServerUrl(""); setApiKey(""); setInstanceName("");
    onClose();
  }

  function handleCreate() {
    if (!name.trim()) { toast.error("Informe um nome para a conexão"); return; }
    const config: Record<string, string> = type === "official"
      ? { phoneNumberId, accessToken, webhookSecret, businessAccountId }
      : { serverUrl, apiKey, instanceName };
    createMut.mutate({ name: name.trim(), type, config });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-[#0d1117] border border-[#1e2a3a] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Plus size={18} className="text-[#25d366]" />
            Nova Conexão WhatsApp
          </DialogTitle>
        </DialogHeader>

        {step === "type" ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-400">Escolha o tipo de integração:</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Official */}
              <button
                onClick={() => setType("official")}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  type === "official"
                    ? "border-[#25d366] bg-[#25d36610]"
                    : "border-[#1e2a3a] hover:border-[#25d36640]"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={20} className="text-[#25d366]" />
                  <span className="font-semibold text-sm">API Oficial</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Meta Cloud API. Requer conta Business verificada. Maior estabilidade e suporte oficial.
                </p>
                <span className="mt-2 inline-block text-[10px] bg-[#25d36620] text-[#25d366] px-2 py-0.5 rounded-full">
                  Recomendado para produção
                </span>
              </button>

              {/* Unofficial */}
              <button
                onClick={() => setType("unofficial")}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  type === "unofficial"
                    ? "border-[#25d366] bg-[#25d36610]"
                    : "border-[#1e2a3a] hover:border-[#25d36640]"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={20} className="text-yellow-400" />
                  <span className="font-semibold text-sm">API Não Oficial</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Evolution API (Baileys). Conecta via QR Code. Sem necessidade de aprovação Meta.
                </p>
                <span className="mt-2 inline-block text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full">
                  Rápido para testar
                </span>
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 text-xs">Nome da conexão</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Suporte Principal, Vendas..."
                className="bg-[#0a0f16] border-[#1e2a3a] text-white placeholder:text-gray-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleClose} className="text-gray-400">Cancelar</Button>
              <Button
                onClick={() => setStep("config")}
                disabled={!name.trim()}
                className="bg-[#25d366] hover:bg-[#1da851] text-black font-semibold"
              >
                Próximo →
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {type === "official" ? (
              <>
                <div className="flex items-center gap-2 p-3 bg-[#25d36610] border border-[#25d36630] rounded-lg">
                  <Shield size={16} className="text-[#25d366] shrink-0" />
                  <p className="text-xs text-gray-300">
                    Obtenha as credenciais no <strong>Meta for Developers</strong> → seu app → WhatsApp → Configuração.
                  </p>
                </div>
                {[
                  { label: "Phone Number ID", value: phoneNumberId, set: setPhoneNumberId, placeholder: "1234567890123456", icon: <Smartphone size={14} /> },
                  { label: "Access Token", value: accessToken, set: setAccessToken, placeholder: "EAAxxxxxxxx...", icon: <Key size={14} /> },
                  { label: "Business Account ID (opcional)", value: businessAccountId, set: setBusinessAccountId, placeholder: "9876543210", icon: <Globe size={14} /> },
                  { label: "Webhook Secret (opcional)", value: webhookSecret, set: setWebhookSecret, placeholder: "meu_segredo_webhook", icon: <Shield size={14} /> },
                ].map(({ label, value, set, placeholder, icon }) => (
                  <div key={label} className="space-y-1.5">
                    <Label className="text-gray-300 text-xs flex items-center gap-1.5">{icon}{label}</Label>
                    <Input
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                      className="bg-[#0a0f16] border-[#1e2a3a] text-white placeholder:text-gray-600 font-mono text-xs"
                    />
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-lg">
                  <Zap size={16} className="text-yellow-400 shrink-0" />
                  <p className="text-xs text-gray-300">
                    Informe os dados do seu servidor <strong>Evolution API</strong>. Após criar, clique em "Conectar" para gerar o QR Code.
                  </p>
                </div>
                {[
                  { label: "URL do Servidor", value: serverUrl, set: setServerUrl, placeholder: "https://evo.meuservidor.com", icon: <Globe size={14} /> },
                  { label: "API Key", value: apiKey, set: setApiKey, placeholder: "minha-api-key-secreta", icon: <Key size={14} /> },
                  { label: "Nome da Instância", value: instanceName, set: setInstanceName, placeholder: "minha-instancia", icon: <Smartphone size={14} /> },
                ].map(({ label, value, set, placeholder, icon }) => (
                  <div key={label} className="space-y-1.5">
                    <Label className="text-gray-300 text-xs flex items-center gap-1.5">{icon}{label}</Label>
                    <Input
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                      className="bg-[#0a0f16] border-[#1e2a3a] text-white placeholder:text-gray-600 font-mono text-xs"
                    />
                  </div>
                ))}
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep("type")} className="text-gray-400">← Voltar</Button>
              <Button
                onClick={handleCreate}
                disabled={createMut.isPending}
                className="bg-[#25d366] hover:bg-[#1da851] text-black font-semibold"
              >
                {createMut.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Criar Conexão
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── QR Code Modal ────────────────────────────────────────────────────────────

function QrCodeModal({ qrCode, onClose, onRefresh, onPoll, isPolling }: {
  qrCode: string;
  onClose: () => void;
  onRefresh: () => void;
  onPoll: () => void;
  isPolling: boolean;
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border border-[#1e2a3a] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <QrCode size={18} className="text-[#25d366]" />
            Escanear QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <p className="text-sm text-gray-400 text-center">
            Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo e escaneie o código abaixo.
          </p>
          {qrCode ? (
            <div className="p-3 bg-white rounded-xl">
              <img src={qrCode} alt="QR Code" className="w-52 h-52 object-contain" />
            </div>
          ) : (
            <div className="w-52 h-52 bg-[#0a0f16] border border-[#1e2a3a] rounded-xl flex items-center justify-center">
              <Loader2 size={32} className="animate-spin text-gray-500" />
            </div>
          )}
          <p className="text-xs text-gray-500 text-center">O QR Code expira em 60 segundos.</p>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 border-[#1e2a3a] text-gray-300 hover:bg-[#1e2a3a]"
              onClick={onRefresh}
            >
              <RefreshCw size={14} className="mr-1.5" /> Novo QR
            </Button>
            <Button
              className="flex-1 bg-[#25d366] hover:bg-[#1da851] text-black font-semibold"
              onClick={onPoll}
              disabled={isPolling}
            >
              {isPolling ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <CheckCircle2 size={14} className="mr-1.5" />}
              Já escaneei
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Connection Card ──────────────────────────────────────────────────────────

function ConnectionCard({
  conn,
  onRefetch,
}: {
  conn: Connection;
  onRefetch: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const deleteMut = trpc.connections.delete.useMutation({
    onSuccess: () => { toast.success("Conexão removida"); onRefetch(); },
    onError: (e) => toast.error(e.message),
  });
  const testMut = trpc.connections.testOfficial.useMutation({
    onSuccess: (r) => {
      if (r.success) toast.success(`Conectado: ${r.displayName ?? r.phone}`);
      else toast.error(`Falha: ${r.error}`);
      onRefetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const connectMut = trpc.connections.connectUnofficial.useMutation({
    onSuccess: (r) => {
      if (r.success) { setShowQr(true); onRefetch(); }
      else toast.error(r.error ?? "Falha ao conectar");
    },
    onError: (e) => toast.error(e.message),
  });
  const pollMut = trpc.connections.pollState.useMutation({
    onSuccess: (r) => {
      if (r.success) { toast.success("WhatsApp conectado com sucesso!"); setShowQr(false); onRefetch(); }
      else toast.error("Ainda não conectado. Tente escanear novamente.");
    },
    onError: (e) => toast.error(e.message),
  });
  const disconnectMut = trpc.connections.disconnect.useMutation({
    onSuccess: () => { toast.success("Desconectado"); onRefetch(); },
    onError: (e) => toast.error(e.message),
  });

  const isOfficial = conn.type === "official";
  const isLoading = testMut.isPending || connectMut.isPending || disconnectMut.isPending;

  return (
    <>
      <div className="bg-[#0d1117] border border-[#1e2a3a] rounded-xl p-4 hover:border-[#25d36640] transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isOfficial ? "bg-[#25d36615]" : "bg-yellow-400/10"
            }`}>
              {isOfficial
                ? <Shield size={18} className="text-[#25d366]" />
                : <Zap size={18} className="text-yellow-400" />
              }
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white truncate">{conn.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={conn.status} />
                <span className="text-[10px] text-gray-600">•</span>
                <span className="text-[10px] text-gray-500">
                  {isOfficial ? "Meta Cloud API" : "Evolution API"}
                </span>
              </div>
              {conn.phone && (
                <p className="text-xs text-gray-500 mt-0.5">{conn.phone}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Connect / Test button */}
            {conn.status !== "connected" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs border-[#1e2a3a] text-gray-300 hover:bg-[#1e2a3a] hover:text-white"
                disabled={isLoading}
                onClick={() => {
                  if (isOfficial) testMut.mutate({ id: conn.id });
                  else connectMut.mutate({ id: conn.id });
                }}
              >
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                <span className="ml-1">{isOfficial ? "Testar" : "Conectar"}</span>
              </Button>
            )}
            {/* Disconnect button */}
            {conn.status === "connected" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs border-[#1e2a3a] text-gray-300 hover:bg-red-900/20 hover:text-red-400 hover:border-red-900/40"
                disabled={isLoading}
                onClick={() => disconnectMut.mutate({ id: conn.id })}
              >
                <WifiOff size={12} />
                <span className="ml-1">Desconectar</span>
              </Button>
            )}
            {/* Show QR if connecting */}
            {conn.status === "connecting" && conn.qrCode && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                onClick={() => setShowQr(true)}
              >
                <QrCode size={12} />
                <span className="ml-1">Ver QR</span>
              </Button>
            )}
            {/* Expand config */}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-gray-500 hover:text-gray-300"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
            {/* Delete */}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-gray-600 hover:text-red-400"
              onClick={() => {
                if (confirm(`Remover "${conn.name}"?`)) deleteMut.mutate({ id: conn.id });
              }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Expanded config details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#1e2a3a] space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Configuração</p>
            {Object.entries(conn.config).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-36 shrink-0">{k}</span>
                <span className="text-xs text-gray-300 font-mono truncate">
                  {k.toLowerCase().includes("token") || k.toLowerCase().includes("key") || k.toLowerCase().includes("secret")
                    ? "••••••••" + (v?.slice(-4) ?? "")
                    : v || "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Code modal */}
      {showQr && (
        <QrCodeModal
          qrCode={conn.qrCode}
          onClose={() => setShowQr(false)}
          onRefresh={() => connectMut.mutate({ id: conn.id })}
          onPoll={() => pollMut.mutate({ id: conn.id })}
          isPolling={pollMut.isPending}
        />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Connections() {
  const [showNew, setShowNew] = useState(false);
  const { data: connections = [], isLoading, refetch } = trpc.connections.list.useQuery();

  const connected = connections.filter((c) => c.status === "connected").length;
  const total = connections.length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Smartphone size={20} className="text-[#25d366]" />
            Conexões WhatsApp
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total === 0
              ? "Nenhuma conexão configurada"
              : `${connected} de ${total} conexão${total !== 1 ? "ões" : ""} ativa${connected !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button
          onClick={() => setShowNew(true)}
          className="bg-[#25d366] hover:bg-[#1da851] text-black font-semibold gap-2"
        >
          <Plus size={16} />
          Nova Conexão
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: total, color: "text-white" },
          { label: "Conectadas", value: connected, color: "text-[#25d366]" },
          { label: "Com erro", value: connections.filter((c) => c.status === "error").length, color: "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0d1117] border border-[#1e2a3a] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Integration guide */}
      <div className="bg-[#0d1117] border border-[#1e2a3a] rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Settings size={12} /> Guia de Integração
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#25d366] flex items-center gap-1.5">
              <Shield size={12} /> API Oficial (Meta)
            </p>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
              <li>Crie um app em developers.facebook.com</li>
              <li>Adicione o produto WhatsApp</li>
              <li>Copie o Phone Number ID e Token</li>
              <li>Configure o webhook para receber mensagens</li>
            </ol>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-yellow-400 flex items-center gap-1.5">
              <Zap size={12} /> API Não Oficial (Evolution)
            </p>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
              <li>Instale o Evolution API no seu servidor</li>
              <li>Obtenha a URL e API Key do painel</li>
              <li>Defina um nome de instância único</li>
              <li>Escaneie o QR Code com seu WhatsApp</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Connection list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[#25d366]" />
        </div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#0d1117] border border-[#1e2a3a] flex items-center justify-center mb-4">
            <Smartphone size={28} className="text-gray-600" />
          </div>
          <p className="text-gray-400 font-medium">Nenhuma conexão ainda</p>
          <p className="text-gray-600 text-sm mt-1 max-w-xs">
            Adicione uma conexão WhatsApp para começar a enviar e receber mensagens automaticamente.
          </p>
          <Button
            onClick={() => setShowNew(true)}
            className="mt-4 bg-[#25d366] hover:bg-[#1da851] text-black font-semibold gap-2"
          >
            <Plus size={16} /> Adicionar primeira conexão
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              conn={conn as Connection}
              onRefetch={refetch}
            />
          ))}
        </div>
      )}

      <NewConnectionModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={() => refetch()}
      />
    </div>
  );
}
