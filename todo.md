# Project TODO

- [x] Database schema: flows, flow_nodes, flow_edges, contacts, messages, kanban_columns, kanban_cards
- [x] Dark mode design system matching prototype (#080b0e bg, #25d366 accent, compact typography)
- [x] Sidebar navigation with icon-only layout (Dashboard, Inbox, Contacts, Flows, Kanban, Settings)
- [x] Dashboard with real-time metrics (contacts, messages, active conversations, active flows)
- [x] Dashboard recent conversations list
- [x] Dashboard active flows list
- [x] Dashboard pipeline progress bars
- [x] Contacts page with table, search, status, tags
- [x] Add contact modal
- [x] Kanban board with configurable columns (Novo Lead, Qualificado, Proposta, Fechado, Perdido)
- [x] Kanban drag-and-drop cards between columns
- [x] Add kanban card modal
- [x] Flow builder: visual canvas with drag-and-drop nodes
- [x] Flow builder: node palette (trigger, text, audio, image, video, delay, wait, identify, buttons, pix, connect, ai)
- [x] Flow builder: edge connections between nodes via ports
- [x] Flow builder: node configuration panel with dynamic forms per node type
- [x] Flow management: create, rename, duplicate, delete flows
- [x] Flow management: list saved flows with status
- [x] Chat simulation with AI integration via LLM helper
- [x] Chat message history persistence
- [x] Settings page with WhatsApp and AI config sections
- [x] Authentication with login gate in AppLayout
- [x] All data persisted per user in database
- [x] Vitest tests for router structure and auth
- [x] Edit contact modal
- [x] Auto/manual AI mode toggle in chat
- [x] Verify flow_nodes and kanban_cards tables exist in DB
- [x] Conversion rate metric on dashboard

## Importação em Massa de Contatos

- [x] Instalar dependência papaparse (CSV) e xlsx (Excel) no servidor
- [x] Endpoint tRPC: contacts.importPreview — recebe arquivo base64, retorna linhas parseadas + colunas detectadas
- [x] Endpoint tRPC: contacts.importConfirm — recebe mapeamento de colunas + linhas, insere no banco em lote
- [x] Modal de importação na página Contatos com 3 etapas: Upload → Mapeamento → Confirmação
- [x] Etapa 1: drag-and-drop de arquivo CSV/XLSX com preview do nome e contagem de linhas
- [x] Etapa 2: mapeamento visual de colunas do arquivo para campos do contato (nome, telefone, tags, email)
- [x] Etapa 3: preview das primeiras 5 linhas mapeadas + botão "Importar X contatos"
- [x] Feedback de progresso e resultado (X importados, Y duplicados ignorados)
- [x] Template CSV para download
- [x] Vitest tests para o endpoint de importação

## Segmentação por Tags no Disparo de Fluxos

- [x] Schema: tabela flow_dispatches para registrar histórico de disparos (flowId, tags, totalContacts, status, createdAt)
- [x] Backend: endpoint flows.getContactsByTags — retorna contatos filtrados por array de tags (com contagem)
- [x] Backend: endpoint flows.dispatch — registra disparo com tags selecionadas e retorna contatos afetados
- [x] Backend: endpoint flows.getDispatches — lista histórico de disparos de um fluxo
- [x] UI: modal "Disparar Fluxo" na FlowList com seletor de tags, preview de contatos afetados e confirmação
- [x] UI: exibir todas as tags únicas dos contatos do usuário no seletor (carregadas dinamicamente)
- [x] UI: contador em tempo real de contatos que serão atingidos ao selecionar/desmarcar tags
- [x] UI: opção "Todos os contatos" (sem filtro de tag) no modal de disparo
- [x] UI: histórico de disparos por fluxo na FlowList (data, tags usadas, quantidade de contatos)
- [x] Vitest tests para getContactsByTags e flows.dispatch

## Histórico de Interações por Contato

- [x] Schema: tabela contact_events (contactId, userId, type, title, description, metadata, createdAt)
- [x] Backend: helper getContactEvents(contactId, userId) — retorna eventos ordenados por data desc
- [x] Backend: helper createContactEvent(data) — insere evento de interação
- [x] Backend: endpoint contacts.getEvents — lista histórico de um contato
- [x] Backend: endpoint contacts.addNote — adiciona nota manual ao histórico
- [x] Integração: registrar evento ao disparar fluxo para um contato
- [x] Integração: registrar evento ao enviar/receber mensagem no chat de simulação
- [x] UI: drawer/painel lateral de perfil do contato com timeline de eventos
- [x] UI: timeline com ícones por tipo de evento (fluxo, mensagem, nota, criação, tag)
- [x] UI: botão "Ver histórico" em cada linha da tabela de Contatos
- [x] UI: campo para adicionar nota manual no histórico
- [x] UI: exibir metadados relevantes por tipo (nome do fluxo, conteúdo da mensagem, tags adicionadas)
- [x] Vitest tests para getContactEvents e createContactEvent

## Integração WhatsApp + Melhorias de Fluxo

### WhatsApp Connections
- [x] Schema: tabela whatsapp_connections (userId, name, type: official|unofficial, status, config JSON, createdAt)
- [x] Backend: CRUD endpoints para connections (list, create, update, delete, testConnection)
- [x] Backend: webhook handler para receber mensagens da Meta Cloud API
- [x] Backend: webhook handler para Evolution API (não oficial)
- [x] Backend: helper para enviar mensagem via Meta Cloud API
- [x] Backend: helper para enviar mensagem via Evolution API
- [x] UI: tela /app/connections com lista de conexões ativas
- [x] UI: modal de nova conexão com seletor de tipo (Oficial / Não Oficial)
- [x] UI: formulário Oficial: Phone Number ID, Token, Webhook Secret
- [x] UI: formulário Não Oficial: URL do servidor Evolution, API Key, nome da instância
- [x] UI: status visual de conexão (conectado, desconectado, aguardando QR)
- [x] UI: QR Code para conexão não oficial (Evolution API)
- [x] Sidebar: adicionar ícone de Conexões na navegação

### Melhorias no Construtor de Fluxos
- [x] Conectores exclusivos: cada saída só pode ter 1 conexão (remover a antiga ao criar nova)
- [x] Deletar conexão: hover sobre a linha + botão × vermelho no meio
- [x] Visual: linha fica vermelha ao hover
- [x] Visual: botão × vermelho no meio da linha para deletar
- [x] Visual: cursor pointer sobre as linhas de conexão
- [x] Melhorar handles de conexão (pontos de saída/entrada mais visíveis, verde quando conectado)

### Funcionalidades ZapData/Gerachat
- [x] Nó de Condição: bifurcação Sim/Não com operadores configuráveis
- [x] Nó de Identificar: capturar variável (nome, telefone, email, CPF, custom)
- [x] Templates de mensagem com variáveis {{nome}}, {{telefone}}, {{email}}
- [x] Hint de variáveis disponíveis no painel de config
- [x] Nó de Webhook: POST para URL externa com método e body JSON configuráveis
- [x] Contador de nós e conexões no toolbar do editor

### Webhooks e Testes Finais
- [x] Webhook handler Meta Cloud API: GET (verificação) + POST (mensagens recebidas)
- [x] Webhook handler Evolution API: POST /api/webhook/evolution/:instanceName
- [x] Registrar rotas de webhook no servidor Express
- [x] Helper sendTextOfficial (Meta Cloud API)
- [x] Helper sendTextUnofficial (Evolution API)
- [x] Helper unificado sendMessage (official | unofficial)
- [x] Vitest tests: send helpers, registerWebhookRoutes, Meta GET challenge, Meta GET rejeição
- [x] 68 testes passando no total

## Motor de Execução de Fluxos

- [x] Schema: tabela flow_sessions (contactId, flowId, currentNodeId, variables JSON, status, createdAt, updatedAt)
- [x] Schema: tabela flow_execution_logs (sessionId, nodeId, nodeType, input, output, status, createdAt)
- [x] Backend: flowEngine.ts — processNode() para cada tipo de nó (text, audio, image, delay, buttons, condition, ai, pix, webhook, tag, identify, end)
- [x] Backend: startFlow(contactId, flowId, connectionId) — iniciar sessão de fluxo para um contato
- [x] Backend: resumeFlow(sessionId, inboundMessage) — retomar fluxo após resposta do contato (nós wait/identify/buttons)
- [x] Backend: integrar engine ao webhookHandlers.ts — ao receber mensagem, verificar se contato tem sessão ativa e retomar, ou verificar triggers
- [x] Backend: nó Trigger — ativar fluxo ao receber palavra-chave ou qualquer mensagem
- [x] Backend: nó Text — enviar mensagem de texto com suporte a variáveis {{nome}}, {{telefone}}
- [x] Backend: nó Delay — aguardar N segundos antes de prosseguir
- [x] Backend: nó Buttons — enviar lista de opções e aguardar resposta do contato
- [x] Backend: nó Condition — bifurcar baseado em variável ou tag do contato
- [x] Backend: nó AI — chamar LLM e enviar resposta gerada
- [x] Backend: nó Identify — aguardar resposta e salvar em variável (nome, telefone, email, custom)
- [x] Backend: nó Tag — adicionar/remover tag do contato
- [x] Backend: nó Webhook — fazer POST para URL externa
- [x] Backend: nó End — encerrar sessão do fluxo
- [x] Backend: endpoint sessions.list — listar sessões ativas por fluxo
- [x] Backend: endpoint sessions.logs — logs de execução por sessão
- [x] UI: página /app/monitor com sessões ativas, histórico e stats
- [x] UI: sidebar com ícone Activity para Monitor de Execuções
- [x] Vitest tests para flowEngine (sessions router, db helpers) — 78 testes passando

## Publication Feature (Fase 2 - Webhook Público + Onboarding)

### Webhook Público Verificável
- [x] Endpoint público GET /api/webhook/info — retorna URL pública do webhook e token de verificação
- [x] Endpoint público GET /api/webhook/status — health check para Meta Cloud API verificar disponibilidade
- [x] tRPC procedure connections.getWebhookInfo — retorna URL pública e token para o frontend
- [x] Melhorar verificação Meta Cloud API: validar token de verificação com segurança
- [x] Melhorar verificação Evolution API: adicionar validação de headers customizados
- [x] Vitest tests para endpoints públicos de webhook

### Onboarding Guiado de Conexão WhatsApp
- [x] Tela /app/connections/setup com checklist passo a passo
- [x] Etapa 1: Escolher tipo de conexão (Oficial Meta / Não Oficial Evolution)
- [x] Etapa 2: Preencher credenciais (Phone Number ID + Token para Meta, ou URL + API Key para Evolution)
- [x] Etapa 3: Configurar webhook — exibir URL pública e instruções para registrar na Meta/Evolution
- [x] Etapa 4: Testar conexão — botão "Testar Agora" com feedback em tempo real
- [x] Etapa 5: Confirmação de sucesso com próximas ações
- [x] Componente WebhookSetupGuide com instruções visuais para cada plataforma
- [x] Vitest tests para componentes de onboarding

### Live Test Panel (Teste ao Vivo)
- [x] Tela /app/test-flow com painel de teste de fluxo em tempo real
- [x] Seletor de fluxo + contato (ou criar contato de teste)
- [x] Seletor de conexão WhatsApp para usar no teste
- [x] Botão "Iniciar Teste" que dispara o fluxo
- [x] Log em tempo real de execução (nó atual, variáveis, entrada/saída)
- [x] Chat simulado para responder a nós de espera (buttons, identify)
- [x] Visualização de mensagens que seriam enviadas via WhatsApp
- [x] Vitest tests para componentes de live test

### Validação End-to-End
- [x] Testar fluxo com Meta Cloud API real (enviar mensagem real)
- [x] Testar fluxo com Evolution API real (enviar mensagem real)
- [x] Verificar webhook recebe mensagens de entrada corretamente
- [x] Verificar resumeFlow funciona ao receber resposta do contato
- [x] Verificar variáveis são capturadas e usadas corretamente
- [x] Vitest tests para integração end-to-end
