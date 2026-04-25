import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/app");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#080b0e" }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: "2px solid #1c2030", borderTopColor: "#25d366", borderRadius: "50%" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#080b0e" }}>
      <div className="flex flex-col items-center gap-8 max-w-lg text-center px-6">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 56, height: 56, background: "#25d366" }}
        >
          <svg viewBox="0 0 24 24" fill="none" width="30" height="30">
            <path
              d="M17 3.5C15.3 2 13 1 10.5 1 5 1 .5 5.5.5 11c0 1.8.5 3.5 1.3 5L.5 23l7.2-1.3C9.2 22.5 9.8 23 10.5 23c5.5 0 10-4.5 10-10 0-2.5-1-4.7-2.5-6.4"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#dde0ec", letterSpacing: "-0.5px" }}>
            ZAP Platform
          </h1>
          <p style={{ fontSize: 14, color: "#5a5f7a", marginTop: 8, lineHeight: 1.6 }}>
            Automação inteligente para WhatsApp. Construa fluxos, gerencie leads e feche mais vendas com IA.
          </p>
        </div>
        <button
          onClick={() => { window.location.href = getLoginUrl(); }}
          className="zap-btn"
          style={{ padding: "12px 40px", fontSize: 14, borderRadius: 8 }}
        >
          Começar agora
        </button>
      </div>
    </div>
  );
}
