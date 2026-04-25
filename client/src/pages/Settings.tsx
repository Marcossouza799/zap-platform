import { useAuth } from "@/_core/hooks/useAuth";
import { Settings as SettingsIcon, User, Shield, Bell, Palette } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();

  return (
    <>
      <div className="flex items-center px-3.5 gap-2 flex-shrink-0" style={{ height: 42, borderBottom: "0.5px solid #141720" }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Configuracoes</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 zap-scroll" style={{ background: "#080b0e" }}>
        <div className="max-w-xl">
          {/* Profile */}
          <div className="zap-card mb-3">
            <div className="zap-section-title">Perfil</div>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 40, height: 40, background: "#0c2218", color: "#25d366", fontSize: 14, fontWeight: 600 }}
              >
                {user?.name ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "U"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#c8cad8" }}>{user?.name || "Usuario"}</div>
                <div style={{ fontSize: 11, color: "#343850" }}>{user?.email || "—"}</div>
              </div>
            </div>
          </div>

          {/* API */}
          <div className="zap-card mb-3">
            <div className="zap-section-title">Integracao WhatsApp</div>
            <p style={{ fontSize: 11, color: "#5a5f7a", lineHeight: 1.6, marginBottom: 8 }}>
              Configure a conexao com a API do WhatsApp Business. Conecte seu numero para enviar e receber mensagens automaticamente.
            </p>
            <div className="flex gap-2">
              <button className="zap-btn" onClick={() => { toast("Em breve: integracao WhatsApp Business API"); }}>
                Conectar WhatsApp
              </button>
              <button className="zap-btn-outline" onClick={() => { toast("Em breve: webhook personalizado"); }}>
                Webhook
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="zap-card mb-3">
            <div className="zap-section-title">Notificacoes</div>
            <div className="flex flex-col gap-2">
              <SettingToggle label="Notificar novo lead" description="Receba um alerta quando um novo lead iniciar conversa" />
              <SettingToggle label="Notificar pagamento PIX" description="Alerta quando um pagamento for confirmado" />
              <SettingToggle label="Resumo diario" description="Receba um resumo das metricas do dia" />
            </div>
          </div>

          {/* AI */}
          <div className="zap-card">
            <div className="zap-section-title">Modelo de IA</div>
            <p style={{ fontSize: 11, color: "#5a5f7a", lineHeight: 1.6, marginBottom: 8 }}>
              O simulador de chat usa IA para responder como um lead real. Configure o comportamento padrao.
            </p>
            <div>
              <label style={{ fontSize: 10, color: "#3a4058", display: "block", marginBottom: 3 }}>Instrucao padrao</label>
              <textarea
                className="zap-input"
                rows={3}
                style={{ resize: "none" }}
                defaultValue="Voce e um assistente de vendas no WhatsApp. Responda de forma curta e conversacional."
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SettingToggle({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "0.5px solid #0c0f18" }}>
      <div>
        <div style={{ fontSize: 11, color: "#9a9eb8" }}>{label}</div>
        <div style={{ fontSize: 10, color: "#343850" }}>{description}</div>
      </div>
      <div
        className="flex items-center justify-end rounded-full cursor-pointer"
        style={{ width: 32, height: 18, background: "#0c2218", padding: 2 }}
        onClick={e => {
          const el = e.currentTarget;
          const isOn = el.dataset.on === "1";
          el.dataset.on = isOn ? "0" : "1";
          el.style.background = isOn ? "#141720" : "#0c2218";
          const dot = el.firstElementChild as HTMLElement;
          dot.style.background = isOn ? "#343850" : "#25d366";
          dot.style.transform = isOn ? "translateX(0)" : "translateX(14px)";
        }}
        data-on="1"
      >
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#25d366", transform: "translateX(14px)", transition: "all 0.15s" }} />
      </div>
    </div>
  );
}
