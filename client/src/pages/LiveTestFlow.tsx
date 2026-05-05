import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Play, Square, Send, Loader2, AlertCircle, CheckCircle2,
  MessageCircle, Settings, RefreshCw, Download, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExecutionLog {
  timestamp: string;
  nodeId: number;
  nodeType: string;
  status: "pending" | "success" | "error";
  message: string;
  data?: Record<string, any>;
}

export default function LiveTestFlow() {
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [testContactName, setTestContactName] = useState("");
  const [testContactPhone, setTestContactPhone] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "bot"; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fetch flows and connections
  const { data: flows } = trpc.flows.list.useQuery();
  const { data: connections } = trpc.connections.list.useQuery();

  // Auto-scroll to bottom of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [executionLogs]);

  const handleStartTest = async () => {
    if (!selectedFlowId || !selectedConnectionId) {
      toast.error("Selecione um fluxo e uma conexão");
      return;
    }

    if (!testContactPhone) {
      toast.error("Informe o telefone de teste");
      return;
    }

    setIsRunning(true);
    setExecutionLogs([]);
    setChatMessages([]);

    try {
      // Log: Starting test
      setExecutionLogs([
        {
          timestamp: new Date().toLocaleTimeString(),
          nodeId: 0,
          nodeType: "start",
          status: "success",
          message: `Iniciando teste do fluxo com contato: ${testContactPhone}`,
        },
      ]);

      // Simulate flow execution
      // In a real implementation, this would call a tRPC procedure
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setExecutionLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          nodeId: 1,
          nodeType: "trigger",
          status: "success",
          message: "Nó Trigger ativado",
          data: { keyword: "oi" },
        },
      ]);

      setChatMessages([
        {
          role: "bot",
          content: "Olá! Bem-vindo ao nosso atendimento automático. Como posso ajudar?",
        },
      ]);
    } catch (error) {
      toast.error("Erro ao iniciar teste");
      setIsRunning(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !isRunning) return;

    // Add user message
    setChatMessages((prev) => [...prev, { role: "user", content: inputMessage }]);

    // Add log entry
    setExecutionLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        nodeId: 2,
        nodeType: "identify",
        status: "success",
        message: `Mensagem recebida: "${inputMessage}"`,
        data: { input: inputMessage },
      },
    ]);

    // Simulate bot response
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "Obrigado pela sua mensagem! Estou processando sua solicitação.",
        },
      ]);

      setExecutionLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          nodeId: 3,
          nodeType: "text",
          status: "success",
          message: "Mensagem enviada ao usuário",
          data: { output: "Obrigado pela sua mensagem! Estou processando sua solicitação." },
        },
      ]);
    }, 500);

    setInputMessage("");
  };

  const handleStopTest = () => {
    setIsRunning(false);
    setExecutionLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        nodeId: 0,
        nodeType: "end",
        status: "success",
        message: "Teste finalizado",
      },
    ]);
  };

  const handleExportLogs = () => {
    const logsText = executionLogs
      .map((log) => `[${log.timestamp}] ${log.nodeType}: ${log.message}`)
      .join("\n");

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(logsText));
    element.setAttribute("download", `test-logs-${Date.now()}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast.success("Logs exportados");
  };

  return (
    <div className="min-h-screen bg-[#080b0e] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Teste ao Vivo de Fluxo</h1>
          <p className="text-gray-400">
            Teste seus fluxos de automação em tempo real antes de publicar
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900 border-gray-700 sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings size={20} />
                  Configuração
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Flow Selection */}
                <div>
                  <Label className="text-sm text-gray-300 mb-2 block">Selecione o Fluxo</Label>
                  <Select value={selectedFlowId?.toString() || ""} onValueChange={(v) => setSelectedFlowId(Number(v))}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Escolha um fluxo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {flows?.map((flow) => (
                        <SelectItem key={flow.id} value={flow.id.toString()}>
                          {flow.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Connection Selection */}
                <div>
                  <Label className="text-sm text-gray-300 mb-2 block">Selecione a Conexão</Label>
                  <Select value={selectedConnectionId?.toString() || ""} onValueChange={(v) => setSelectedConnectionId(Number(v))}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Escolha uma conexão..." />
                    </SelectTrigger>
                    <SelectContent>
                      {connections?.map((conn) => (
                        <SelectItem key={conn.id} value={conn.id.toString()}>
                          {conn.name} ({conn.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Test Contact */}
                <div>
                  <Label className="text-sm text-gray-300 mb-2 block">Telefone de Teste</Label>
                  <Input
                    placeholder="+55 11 99999-9999"
                    value={testContactPhone}
                    onChange={(e) => setTestContactPhone(e.target.value)}
                    disabled={isRunning}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-300 mb-2 block">Nome do Contato (opcional)</Label>
                  <Input
                    placeholder="João Silva"
                    value={testContactName}
                    onChange={(e) => setTestContactName(e.target.value)}
                    disabled={isRunning}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                {/* Control Buttons */}
                <div className="space-y-2 pt-4 border-t border-gray-700">
                  {!isRunning ? (
                    <Button
                      onClick={handleStartTest}
                      className="w-full bg-[#25d366] hover:bg-[#20ba5a] text-black font-semibold"
                    >
                      <Play size={16} className="mr-2" />
                      Iniciar Teste
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopTest}
                      variant="destructive"
                      className="w-full"
                    >
                      <Square size={16} className="mr-2" />
                      Parar Teste
                    </Button>
                  )}

                  <Button
                    onClick={handleExportLogs}
                    variant="outline"
                    className="w-full"
                    disabled={executionLogs.length === 0}
                  >
                    <Download size={16} className="mr-2" />
                    Exportar Logs
                  </Button>
                </div>

                {/* Status Indicator */}
                <div className="mt-6 p-3 rounded-lg bg-gray-800 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    {isRunning ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-[#25d366] animate-pulse" />
                        <span className="text-sm text-[#25d366] font-medium">Teste em andamento</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-gray-500" />
                        <span className="text-sm text-gray-400">Pronto para testar</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {executionLogs.length} evento{executionLogs.length !== 1 ? "s" : ""} registrado{executionLogs.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Execution Logs & Chat */}
          <div className="lg:col-span-2 space-y-6">
            {/* Execution Logs */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageCircle size={20} />
                    Log de Execução
                  </span>
                  {executionLogs.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setExecutionLogs([]);
                        setChatMessages([]);
                      }}
                    >
                      <RefreshCw size={16} />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto bg-gray-950 p-4 rounded-lg border border-gray-800">
                  {executionLogs.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      Nenhum evento registrado. Inicie um teste para ver os logs.
                    </p>
                  ) : (
                    executionLogs.map((log, idx) => (
                      <div key={idx} className="text-xs font-mono space-y-1">
                        <div className="flex items-start gap-2">
                          {log.status === "success" && (
                            <CheckCircle2 size={14} className="text-[#25d366] mt-0.5 flex-shrink-0" />
                          )}
                          {log.status === "error" && (
                            <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                          )}
                          {log.status === "pending" && (
                            <Loader2 size={14} className="text-yellow-500 mt-0.5 flex-shrink-0 animate-spin" />
                          )}
                          <div className="flex-1">
                            <span className="text-gray-400">[{log.timestamp}]</span>
                            <span className="text-[#25d366] ml-2">{log.nodeType}</span>
                            <span className="text-gray-300 ml-2">{log.message}</span>
                          </div>
                        </div>
                        {log.data && (
                          <div className="ml-6 text-gray-500">
                            {JSON.stringify(log.data, null, 2)
                              .split("\n")
                              .map((line, i) => (
                                <div key={i}>{line}</div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </CardContent>
            </Card>

            {/* Chat Simulation */}
            {isRunning && (
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle size={20} />
                    Simulação de Chat
                  </CardTitle>
                  <CardDescription>Simule respostas do usuário</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Chat Messages */}
                  <div className="space-y-3 max-h-64 overflow-y-auto bg-gray-950 p-4 rounded-lg border border-gray-800">
                    {chatMessages.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">
                        Nenhuma mensagem ainda. Inicie o teste para começar.
                      </p>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-lg ${
                              msg.role === "user"
                                ? "bg-[#25d366] text-black"
                                : "bg-gray-800 text-gray-100"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite sua resposta..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      className="bg-gray-800 border-gray-700"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim()}
                      className="bg-[#25d366] hover:bg-[#20ba5a] text-black"
                    >
                      <Send size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
