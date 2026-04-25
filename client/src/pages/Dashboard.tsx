import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const AVATAR_COLORS = ["zap-avatar-green", "zap-avatar-blue", "zap-avatar-purple", "zap-avatar-amber"];

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

export default function Dashboard() {
  const { user } = useAuth();
  const stats = trpc.dashboard.stats.useQuery();
  const flowsQuery = trpc.flows.list.useQuery();
  const contactsQuery = trpc.contacts.list.useQuery();

  const s = stats.data || { totalContacts: 0, totalMessages: 0, activeFlows: 0, activeConversations: 0, conversionRate: 0 };
  const recentContacts = (contactsQuery.data || []).slice(0, 5);
  const activeFlows = (flowsQuery.data || []).filter(f => f.status === "active").slice(0, 5);
  const allFlows = flowsQuery.data || [];

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <>
      {/* Top bar */}
      <div
        className="flex items-center px-3.5 gap-2 flex-shrink-0"
        style={{ height: 42, borderBottom: "0.5px solid #141720" }}
      >
        <span style={{ fontSize: 13, fontWeight: 500 }}>Dashboard</span>
        <span style={{ fontSize: 11, color: "#343850" }}>Visao geral · {today}</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="zap-pill">
            <div style={{ width: 5, height: 5, background: "#25d366", borderRadius: "50%" }} />
            Conectado
          </div>
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: 22, height: 22, background: "#0c2218", color: "#25d366", fontSize: 9, fontWeight: 600 }}
          >
            {user?.name ? getInitials(user.name) : "U"}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 zap-scroll" style={{ background: "#080b0e" }}>
        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
          <StatCard label="Total contatos" value={String(s.totalContacts)} color="#25d366" />
          <StatCard label="Mensagens" value={String(s.totalMessages)} color="#378add" />
          <StatCard label="Taxa conversao" value={`${s.conversionRate ?? 0}%`} color="#a855f7" />
          <StatCard label="Conversas ativas" value={String(s.activeConversations)} color="#ef9f27" />
          <StatCard label="Fluxos ativos" value={String(s.activeFlows)} color="#25d366" />
        </div>

        {/* Two column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 10 }}>
          {/* Recent conversations */}
          <div className="zap-card">
            <div className="zap-section-title">Ultimos contatos</div>
            {recentContacts.length === 0 && (
              <p style={{ fontSize: 11, color: "#343850" }}>Nenhum contato ainda. Adicione na aba Contatos.</p>
            )}
            {recentContacts.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-2 py-1.5"
                style={{ borderBottom: i < recentContacts.length - 1 ? "0.5px solid #141720" : "none" }}
              >
                <div className={`zap-avatar ${getAvatarColor(i)}`} style={{ width: 22, height: 22, fontSize: 9 }}>
                  {getInitials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#c0c3d4" }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: "#343850", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.phone}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span style={{ fontSize: 10, color: "#252838" }}>
                    {new Date(c.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className={`zap-tag ${c.status === "active" ? "zap-tag-green" : c.status === "waiting" ? "zap-tag-amber" : "zap-tag-red"}`}>
                    {c.status === "active" ? "ativo" : c.status === "waiting" ? "aguardando" : "inativo"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-2.5">
            {/* Active flows */}
            <div className="zap-card">
              <div className="zap-section-title">Fluxos ativos</div>
              {allFlows.length === 0 && (
                <p style={{ fontSize: 11, color: "#343850" }}>Nenhum fluxo criado ainda.</p>
              )}
              <div className="flex flex-col gap-1.5">
                {allFlows.slice(0, 5).map(f => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between px-2 py-1.5 rounded"
                    style={{ background: "#080b10", border: "0.5px solid #141720" }}
                  >
                    <span style={{ fontSize: 11, color: "#9a9eb8" }}>{f.name}</span>
                    <span className={`zap-tag ${f.status === "active" ? "zap-tag-green" : f.status === "paused" ? "zap-tag-amber" : "zap-tag-muted"}`}>
                      {f.status === "active" ? "ativo" : f.status === "paused" ? "pausado" : "rascunho"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline */}
            <div className="zap-card">
              <div className="zap-section-title">Pipeline de leads</div>
              <PipelineBar label="Ativos" pct={s.totalContacts > 0 ? Math.round((s.activeConversations / Math.max(s.totalContacts, 1)) * 100) : 0} color="#25d366" />
              <PipelineBar label="Mensagens" pct={Math.min(100, s.totalMessages)} color="#378add" />
              <PipelineBar label="Fluxos" pct={Math.min(100, s.activeFlows * 20)} color="#7f77dd" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="zap-stat-card">
      <div style={{ fontSize: 10, color: "#343850", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: -0.8, color }}>{value}</div>
    </div>
  );
}

function PipelineBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-1" style={{ fontSize: 10, color: "#3a4058" }}>
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ background: "#141720", borderRadius: 2, height: 4 }}>
        <div style={{ background: color, width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: 2 }} />
      </div>
    </div>
  );
}
