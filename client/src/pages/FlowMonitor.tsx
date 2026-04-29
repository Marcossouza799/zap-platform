import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Zap,
  User,
  GitBranch,
  MessageSquare,
} from "lucide-react";

// ─── Status helpers ────────────────────────────────────────────────────────

const statusConfig = {
  active: { label: "Ativo", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Activity },
  waiting: { label: "Aguardando", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  completed: { label: "Concluído", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
  error: { label: "Erro", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
};

const logStatusConfig = {
  ok: { color: "text-green-400", icon: "✓" },
  waiting: { color: "text-yellow-400", icon: "⏳" },
  error: { color: "text-red-400", icon: "✗" },
};

const nodeTypeIcon: Record<string, string> = {
  trigger: "⚡",
  text: "💬",
  mensagem: "💬",
  audio: "🎵",
  image: "🖼️",
  video: "🎬",
  delay: "⏱️",
  buttons: "🔘",
  opcoes: "🔘",
  identify: "🪪",
  identificar: "🪪",
  condition: "🔀",
  condição: "🔀",
  ai: "🤖",
  ia: "🤖",
  tag: "🏷️",
  webhook: "🌐",
  pix: "💳",
  end: "🏁",
  fim: "🏁",
  wait: "⏸️",
};

// ─── Session row component ─────────────────────────────────────────────────

function SessionRow({ session }: { session: any }) {
  const [expanded, setExpanded] = useState(false);
  const logsQuery = trpc.sessions.logs.useQuery(
    { sessionId: session.id },
    { enabled: expanded }
  );

  const cfg = statusConfig[session.status as keyof typeof statusConfig] ?? statusConfig.active;
  const StatusIcon = cfg.icon;

  return (
    <div className="border border-[#1a2332] rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0d1520] transition-colors text-left"
      >
        <span className="text-[#4a6080]">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        {/* Session ID */}
        <span className="text-xs text-[#4a6080] w-10 shrink-0">#{session.id}</span>

        {/* Status badge */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${cfg.color} shrink-0`}>
          <StatusIcon size={10} />
          {cfg.label}
        </span>

        {/* Flow ID */}
        <span className="flex items-center gap-1 text-xs text-[#8899aa]">
          <GitBranch size={11} />
          Fluxo #{session.flowId}
        </span>

        {/* Contact ID */}
        <span className="flex items-center gap-1 text-xs text-[#8899aa]">
          <User size={11} />
          Contato #{session.contactId}
        </span>

        {/* Current node */}
        {session.currentNodeId && (
          <span className="flex items-center gap-1 text-xs text-[#4a6080]">
            <MessageSquare size={11} />
            Nó: <code className="text-[#25d366] text-[10px]">{session.currentNodeId}</code>
          </span>
        )}

        {/* Date */}
        <span className="ml-auto text-xs text-[#4a6080] shrink-0">
          {new Date(session.createdAt).toLocaleString("pt-BR")}
        </span>
      </button>

      {/* Expanded logs */}
      {expanded && (
        <div className="border-t border-[#1a2332] bg-[#060a0f] px-4 py-3">
          {logsQuery.isLoading ? (
            <p className="text-xs text-[#4a6080] animate-pulse">Carregando logs...</p>
          ) : logsQuery.data && logsQuery.data.length > 0 ? (
            <div className="space-y-1">
              {logsQuery.data.map((log: any) => {
                const ls = logStatusConfig[log.status as keyof typeof logStatusConfig] ?? logStatusConfig.ok;
                const icon = nodeTypeIcon[log.nodeType?.toLowerCase()] ?? "▸";
                return (
                  <div key={log.id} className="flex items-start gap-2 text-xs font-mono">
                    <span className="text-[#4a6080] w-16 shrink-0 pt-0.5">
                      {new Date(log.createdAt).toLocaleTimeString("pt-BR")}
                    </span>
                    <span className={`${ls.color} w-4 shrink-0 pt-0.5`}>{ls.icon}</span>
                    <span className="text-[#8899aa] w-5 shrink-0 pt-0.5">{icon}</span>
                    <span className="text-[#aabbcc] shrink-0 pt-0.5">[{log.nodeType}]</span>
                    {log.input && (
                      <span className="text-[#4a6080] truncate max-w-[200px]" title={log.input}>
                        ← {log.input}
                      </span>
                    )}
                    {log.output && (
                      <span className="text-[#25d366] truncate max-w-[300px]" title={log.output}>
                        → {log.output}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[#4a6080]">Nenhum log de execução encontrado.</p>
          )}

          {/* Variables */}
          {session.variables && Object.keys(session.variables).length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#1a2332]">
              <p className="text-xs text-[#4a6080] mb-1">Variáveis coletadas:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(session.variables).map(([k, v]) => (
                  <span key={k} className="text-xs bg-[#0d1520] border border-[#1a2332] rounded px-2 py-0.5">
                    <span className="text-[#8899aa]">{k}:</span>{" "}
                    <span className="text-[#25d366]">{String(v)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function FlowMonitor() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFlowId, setFilterFlowId] = useState<number | undefined>(undefined);

  const statsQuery = trpc.sessions.stats.useQuery(undefined, { refetchInterval: 10_000 });
  const sessionsQuery = trpc.sessions.list.useQuery(
    { flowId: filterFlowId, limit: 100 },
    { refetchInterval: 10_000 }
  );
  const flowsQuery = trpc.flows.list.useQuery();

  const stats = statsQuery.data ?? { active: 0, waiting: 0, completed: 0, error: 0, total: 0 };

  const sessions = (sessionsQuery.data ?? []).filter((s: any) =>
    filterStatus === "all" ? true : s.status === filterStatus
  );

  const statCards = [
    { label: "Total", value: stats.total, color: "text-white", bg: "bg-[#0d1520]", icon: Activity },
    { label: "Ativos", value: stats.active, color: "text-blue-400", bg: "bg-blue-500/10", icon: Activity },
    { label: "Aguardando", value: stats.waiting, color: "text-yellow-400", bg: "bg-yellow-500/10", icon: Clock },
    { label: "Concluídos", value: stats.completed, color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle2 },
    { label: "Erros", value: stats.error, color: "text-red-400", bg: "bg-red-500/10", icon: XCircle },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <Zap size={20} className="text-[#25d366]" />
              Monitor de Execuções
            </h1>
            <p className="text-sm text-[#4a6080] mt-0.5">
              Acompanhe em tempo real as sessões de fluxo em andamento
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { sessionsQuery.refetch(); statsQuery.refetch(); }}
            className="border-[#1a2332] text-[#8899aa] hover:text-white hover:bg-[#0d1520] gap-2"
          >
            <RefreshCw size={13} className={sessionsQuery.isFetching ? "animate-spin" : ""} />
            Atualizar
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-5 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.label}
                className={`${card.bg} border-[#1a2332] p-4 cursor-pointer hover:border-[#25d366]/30 transition-colors`}
                onClick={() => setFilterStatus(card.label === "Total" ? "all" : card.label.toLowerCase().replace("í", "i").replace("ú", "u").replace("ã", "a"))}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={card.color} />
                  <span className="text-xs text-[#4a6080]">{card.label}</span>
                </div>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {["all", "active", "waiting", "completed", "error"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  filterStatus === s
                    ? "bg-[#25d366] text-black font-medium"
                    : "bg-[#0d1520] text-[#8899aa] hover:text-white border border-[#1a2332]"
                }`}
              >
                {s === "all" ? "Todos" : statusConfig[s as keyof typeof statusConfig]?.label ?? s}
              </button>
            ))}
          </div>

          {/* Flow filter */}
          <select
            value={filterFlowId ?? ""}
            onChange={(e) => setFilterFlowId(e.target.value ? Number(e.target.value) : undefined)}
            className="ml-auto bg-[#0d1520] border border-[#1a2332] rounded px-3 py-1 text-xs text-[#8899aa] focus:outline-none focus:border-[#25d366]/50"
          >
            <option value="">Todos os fluxos</option>
            {(flowsQuery.data ?? []).map((f: any) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* Sessions list */}
        <div className="space-y-2">
          {sessionsQuery.isLoading ? (
            <div className="text-center py-12 text-[#4a6080] text-sm">Carregando sessões...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <Activity size={32} className="text-[#1a2332] mx-auto mb-3" />
              <p className="text-[#4a6080] text-sm">Nenhuma sessão encontrada.</p>
              <p className="text-[#2a3a4a] text-xs mt-1">
                As sessões aparecem aqui quando contatos enviam mensagens e acionam fluxos ativos.
              </p>
            </div>
          ) : (
            sessions.map((session: any) => (
              <SessionRow key={session.id} session={session} />
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
