import { useLocation } from "wouter";
import { WebhookSetupGuide } from "@/components/WebhookSetupGuide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Smartphone, Globe } from "lucide-react";

interface ConnectionSetupProps {
  type?: string;
}

export function ConnectionSetup({ type = "official" }: ConnectionSetupProps) {
  const [, navigate] = useLocation();
  const connectionType = (type as "official" | "unofficial") || "official";

  return (
    <div className="min-h-screen bg-[#080b0e] text-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/connections")}
            className="mb-4 text-gray-400 hover:text-white"
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            {connectionType === "official" ? (
              <Globe className="text-[#25d366]" size={32} />
            ) : (
              <Smartphone className="text-[#25d366]" size={32} />
            )}
            <div>
              <h1 className="text-3xl font-bold">
                {connectionType === "official" ? "Meta Cloud API" : "Evolution API"}
              </h1>
              <p className="text-gray-400">
                {connectionType === "official"
                  ? "Configurar webhook para receber mensagens do WhatsApp Official"
                  : "Configurar webhook para receber mensagens do WhatsApp Unofficial"}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle>Guia de Configuração Passo a Passo</CardTitle>
          </CardHeader>
          <CardContent>
            <WebhookSetupGuide
              connectionType={connectionType}
              onSetupComplete={() => navigate("/app/connections")}
            />
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 <strong>Dica:</strong> Se você já tem uma conexão criada, pode usar este guia para registrar o webhook na plataforma WhatsApp correspondente.
          </p>
        </div>
      </div>
    </div>
  );
}
