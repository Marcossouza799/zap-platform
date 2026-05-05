import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  GitBranch,
  Columns3,
  Settings,
  LogOut,
  Loader2,
  Smartphone,
  Activity,
  Zap,
} from "lucide-react";
import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/app" },
  { icon: MessageSquare, label: "Inbox + IA", path: "/app/inbox" },
  { icon: Users, label: "Contatos", path: "/app/contacts" },
];

const navItems2 = [
  { icon: GitBranch, label: "Editor de Fluxos", path: "/app/flows" },
  { icon: Columns3, label: "CRM Kanban", path: "/app/kanban" },
  { icon: Smartphone, label: "Conexões WhatsApp", path: "/app/connections" },
  { icon: Activity, label: "Monitor de Execuções", path: "/app/monitor" },
  { icon: Zap, label: "Teste ao Vivo", path: "/app/test-flow" },
];

const navItems3 = [
  { icon: Settings, label: "Configurações", path: "/app/settings" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#080b0e" }}>
        <Loader2 className="animate-spin" style={{ color: "#25d366" }} size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#080b0e" }}>
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{ width: 40, height: 40, background: "#25d366" }}
            >
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                <path
                  d="M17 3.5C15.3 2 13 1 10.5 1 5 1 .5 5.5.5 11c0 1.8.5 3.5 1.3 5L.5 23l7.2-1.3C9.2 22.5 9.8 23 10.5 23c5.5 0 10-4.5 10-10 0-2.5-1-4.7-2.5-6.4"
                  stroke="#fff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 600, color: "#dde0ec" }}>ZAP Platform</span>
          </div>
          <p style={{ fontSize: 13, color: "#5a5f7a", textAlign: "center" }}>
            Faça login para acessar a plataforma de automação
          </p>
          <button
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="zap-btn"
            style={{ padding: "10px 32px", fontSize: 13, borderRadius: 8 }}
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  const initials = user.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#080b0e", color: "#dde0ec" }}>
      {/* Sidebar */}
      <div
        className="flex flex-col items-center py-2.5 gap-0.5 flex-shrink-0"
        style={{ width: 50, background: "#060809", borderRight: "0.5px solid #141720" }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-center rounded-lg mb-3.5 cursor-pointer"
          style={{ width: 28, height: 28, background: "#25d366" }}
          onClick={() => setLocation("/app")}
        >
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path
              d="M17 3.5C15.3 2 13 1 10.5 1 5 1 .5 5.5.5 11c0 1.8.5 3.5 1.3 5L.5 23l7.2-1.3C9.2 22.5 9.8 23 10.5 23c5.5 0 10-4.5 10-10 0-2.5-1-4.7-2.5-6.4"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Nav group 1 */}
        {navItems.map((item) => (
          <NavButton
            key={item.path}
            icon={item.icon}
            label={item.label}
            active={location === item.path}
            onClick={() => setLocation(item.path)}
          />
        ))}

        {/* Separator */}
        <div style={{ width: 20, height: 0.5, background: "#141720", margin: "5px 0" }} />

        {/* Nav group 2 */}
        {navItems2.map((item) => (
          <NavButton
            key={item.path}
            icon={item.icon}
            label={item.label}
            active={location === item.path || location.startsWith(item.path + "/")}
            onClick={() => setLocation(item.path)}
          />
        ))}

        {/* Separator */}
        <div style={{ width: 20, height: 0.5, background: "#141720", margin: "5px 0" }} />

        {/* Nav group 3 */}
        {navItems3.map((item) => (
          <NavButton
            key={item.path}
            icon={item.icon}
            label={item.label}
            active={location === item.path}
            onClick={() => setLocation(item.path)}
          />
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User avatar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={logout}
              className="flex items-center justify-center rounded-full mb-1"
              style={{
                width: 28,
                height: 28,
                background: "#0c2218",
                color: "#25d366",
                fontSize: 9,
                fontWeight: 600,
              }}
            >
              {initials}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Sair ({user.name})
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </div>
    </div>
  );
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{
            width: 36,
            height: 36,
            background: active ? "#0e1e10" : "transparent",
            color: active ? "#25d366" : "#3a4058",
          }}
        >
          <Icon size={16} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
