import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Copy, Check, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WebhookSetupGuideProps {
  connectionType: "official" | "unofficial";
  onSetupComplete?: () => void;
}

export function WebhookSetupGuide({ connectionType, onSetupComplete }: WebhookSetupGuideProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const { data: webhookInfo, isLoading } = trpc.connections.getWebhookInfo.useQuery();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success("Copiado para a área de transferência");
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-[#25d366]" size={24} />
      </div>
    );
  }

  if (!webhookInfo?.success) {
    return (
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-1" size={20} />
            <div>
              <p className="font-medium text-red-500">Erro ao carregar informações do webhook</p>
              <p className="text-sm text-gray-400 mt-1">Tente recarregar a página</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metaInfo = webhookInfo.platforms?.meta;
  const evolutionInfo = webhookInfo.platforms?.evolution;
  const maxSteps = connectionType === "official" ? 5 : 3;

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {Array.from({ length: maxSteps }).map((_, idx) => {
          const step = idx + 1;
          return (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step <= currentStep
                    ? "bg-[#25d366] text-black"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {step < currentStep ? <CheckCircle2 size={20} /> : step}
              </div>
              {step < maxSteps && (
                <div
                  className={`w-12 h-1 mx-2 transition-all ${
                    step < currentStep ? "bg-[#25d366]" : "bg-gray-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {connectionType === "official" ? (
        <div className="space-y-6">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Etapa 1: URL do Webhook</CardTitle>
                <CardDescription>Copie esta URL para registrar no Meta Cloud API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">URL do Webhook</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-[#25d366] flex-1 break-all">
                      {metaInfo?.webhookUrl}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(metaInfo?.webhookUrl || "", "webhook-url")}
                    >
                      {copied === "webhook-url" ? (
                        <Check size={16} className="text-[#25d366]" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Etapa 2: Token de Verificação</CardTitle>
                <CardDescription>Copie este token para registrar no Meta Cloud API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Token de Verificação</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-[#25d366] flex-1 break-all font-mono">
                      {metaInfo?.verificationToken}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(metaInfo?.verificationToken || "", "verify-token")}
                    >
                      {copied === "verify-token" ? (
                        <Check size={16} className="text-[#25d366]" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Etapa 3: Registrar no Meta Cloud API</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="space-y-3 list-decimal list-inside">
                  <li className="text-sm text-gray-300">Acesse Meta Developers</li>
                  <li className="text-sm text-gray-300">Selecione seu aplicativo WhatsApp Business</li>
                  <li className="text-sm text-gray-300">Vá para Configurações → Webhooks</li>
                  <li className="text-sm text-gray-300">Cole a URL do webhook</li>
                  <li className="text-sm text-gray-300">Cole o token de verificação</li>
                  <li className="text-sm text-gray-300">Selecione o evento: messages</li>
                  <li className="text-sm text-gray-300">Clique em Verificar e Salvar</li>
                </ol>
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Etapa 4: Testar Conexão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
                  <p className="text-sm text-green-300">✓ Webhook registrado com sucesso!</p>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>✓ Configuração Completa!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <p className="text-sm text-green-300">Seu webhook está pronto para receber mensagens!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Etapa 1: URL Base do Webhook</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">URL Base</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-[#25d366] flex-1 break-all">
                      {evolutionInfo?.baseUrl}/:instanceName
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`${evolutionInfo?.baseUrl}/:instanceName`, "evo-url")}
                    >
                      {copied === "evo-url" ? (
                        <Check size={16} className="text-[#25d366]" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Etapa 2: Registrar no Evolution API</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="space-y-3 list-decimal list-inside">
                  <li className="text-sm text-gray-300">Acesse seu painel Evolution API</li>
                  <li className="text-sm text-gray-300">Selecione sua instância</li>
                  <li className="text-sm text-gray-300">Vá para Webhooks</li>
                  <li className="text-sm text-gray-300">Cole a URL do webhook</li>
                  <li className="text-sm text-gray-300">Selecione o evento: messages.upsert</li>
                  <li className="text-sm text-gray-300">Salve as configurações</li>
                </ol>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>✓ Configuração Completa!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <p className="text-sm text-green-300">✓ Seu webhook Evolution está pronto!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-3 pt-6 border-t border-gray-700">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          ← Anterior
        </Button>
        <div className="text-sm text-gray-400">
          Etapa {currentStep} de {maxSteps}
        </div>
        <Button
          className="bg-[#25d366] hover:bg-[#20ba5a] text-black"
          onClick={() => {
            if (currentStep < maxSteps) {
              setCurrentStep(currentStep + 1);
            } else {
              onSetupComplete?.();
            }
          }}
        >
          {currentStep === maxSteps ? "Concluir" : "Próximo →"}
        </Button>
      </div>
    </div>
  );
}
