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
