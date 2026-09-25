# TODO — Sistema de Gestão da Testagem Rápida em UBS

> Arquivo vivo de planejamento e acompanhamento. **Toda alteração no projeto deve ser registrada aqui**
> (seção _Registro de alterações_) e os checkboxes devem refletir o estado real.
> Autores do projeto: Edgar Oliveira e Handriel Scheffer.

---

## 1. Visão do produto (derivada da pesquisa + BMC)

**Problema.** Em Porto Alegre a notificação de HIV, sífilis e hepatites já é digital (Sentinela), mas o
Sentinela registra **quem foi diagnosticado**, não **quem foi testado**. Na UBS ficam sem suporte:

1. Controle dos testes realizados e da taxa de positividade da unidade.
2. Seguimento de quem teve TR reagente e aguarda confirmatório.
3. Controle de estoque/lote/validade dos insumos (hoje só mensal e agregado no SISLOGLAB).
4. Verificação do início efetivo do tratamento (inexistente para sífilis e hepatites; SIMC só HIV).
5. Completude da notificação (ex.: 43,6% de escolaridade ignorada em sífilis adquirida 2024).

**Proposta.** Plataforma web que fica **a montante da notificação**: registra a testagem guiada pelo
fluxograma, acompanha casos até confirmação e tratamento, controla insumos por lote e entrega
notificações completas e indicadores por UBS e território.

**Não-objetivos.** Não substitui Sentinela, e-SUS APS, SISLOGLAB nem SIMC; não é prontuário.
Integra/exporta para eles.

## 2. Perfis de usuário (segmentos do BMC)

| Perfil | Quem | Principais tarefas |
|---|---|---|
| `executor` | Enfermeiro(a)/técnico(a) que executa TR | Registrar testagem, ver pendências do dia, registrar conduta |
| `responsavel_tecnico` | RT da UBS | Tudo do executor + estoque, notificações, indicadores da UBS |
| `acs` | Agente comunitário de saúde | Lista de busca ativa da microárea, registrar tentativa de contato |
| `gestor` | Gestão APS / Vigilância (DVS) | Indicadores agregados por UBS e território, somente leitura |
| `admin` | TI / suporte | Usuários, UBS, parâmetros (prazos, estoque mínimo), auditoria |

Beneficiários finais: pessoas testadas, com destaque para **gestantes e suas parcerias**.

## 3. Arquitetura

### 3.1 Decisão: front primeiro, backend depois
- **Fase atual: frontend completo com API mock** (dados em memória, persistidos em `localStorage`, latência
  simulada). A camada `src/data/api` expõe funções assíncronas com o mesmo contrato que o backend REST terá,
  consumidas via TanStack Query → trocar mock por HTTP não mexe nas telas.
- **Fase futura: backend** em repositório separado `trabalho-ihc-backend` (GitHub, conta EnosS2).
  Proposta: Node + NestJS (ou Fastify) + PostgreSQL + Prisma, JWT com perfis, trilha de auditoria,
  OpenAPI gerado a partir dos mesmos tipos do domínio.

### 3.2 Stack do frontend
- Vite + React 19 + TypeScript (strict)
- Tailwind CSS v4 (tokens de tema em CSS, modo claro/escuro)
- React Router (rotas protegidas por perfil)
- TanStack Query (cache/estado de servidor)
- React Hook Form + Zod (formulários e validação)
- Recharts (gráficos de indicadores)
- lucide-react (ícones), date-fns (datas pt-BR)
- Vitest + Testing Library (regras de domínio e componentes críticos)

### 3.3 Estrutura de pastas
```
src/
  app/            providers, router, layout (AppShell, Sidebar, Topbar)
  components/ui/  design system próprio (Button, Card, Badge, Field, Dialog, Table, Tabs, Toast...)
  domain/         tipos, constantes/rótulos e regras puras (testadas)
    rules/        fluxograma, seguimento, notificação, estoque, indicadores, CNS/CPF
  data/           seed determinístico, store mock, api (contrato do futuro backend)
  features/       uma pasta por módulo (auth, painel, testagem, pessoas, seguimento, busca-ativa,
                  estoque, notificacoes, indicadores, auditoria, config, ajuda)
  lib/            utilitários (formatadores, cn, datas)
```

### 3.4 Modelo de domínio
- **Territorio** (coordenadoria de saúde) → **UBS** → **Microárea** (ACS)
- **Usuario** (profissional): perfil, UBS, microárea (se ACS)
- **Pessoa** (usuário do SUS testado): nome, nome social, CNS, CPF, nascimento, sexo, gestante (DUM/IG),
  raça/cor, escolaridade, telefone, endereço, microárea, parcerias vinculadas
- **Testagem** (atendimento): pessoa, UBS, executor, data, motivo, gestante?, trimestre, lista de **Teste**
- **Teste**: agravo (HIV, sífilis, hepatite B, hepatite C), etapa (TR1/TR2/único), lote usado, resultado
  (reagente / não reagente / inválido), interpretação do fluxograma
- **LoteInsumo**: tipo de teste, fabricante, lote, validade, quantidade inicial/atual, UBS
- **MovimentacaoEstoque**: entrada, consumo (automático via testagem), perda, vencimento, ajuste, transferência
- **Caso** (seguimento): pessoa, agravo, origem (testagem), status, etapas com prazos, confirmatório,
  tratamento (doses), seguimento sorológico (VDRL por data/título), parcerias, desfecho
- **Notificacao**: caso, destino (Sentinela / e-mail DVS), completude, status, nº/data de envio
- **TarefaBuscaAtiva**: caso/pessoa, motivo, microárea, ACS, tentativas, status
- **EventoAuditoria**: quem, quando, ação, entidade

### 3.5 Regras de negócio (em `domain/rules`, cobertas por teste)
- **HIV** (fluxograma com dois TR): TR1 NR → não reagente (alertar janela se exposição < 30 dias);
  TR1 R → exige TR2 de outro fabricante; TR1 R + TR2 R → reagente (encaminhar/carga viral, notificar);
  TR1 R + TR2 NR → discordante → repetir; persistindo → coleta venosa para laboratório.
- **Sífilis**: TR treponêmico R → coletar não treponêmico (VDRL) para confirmar e titular.
  **Gestante com TR R → tratar no mesmo dia** (benzilpenicilina benzatina 2.400.000 UI/semana × 3 =
  7.200.000 UI, Nota Técnica CAIST/SMS) sem aguardar confirmação, tratar parceria, e já é **caso notificável**
  (sífilis em gestante: ≥1 teste reagente). Seguimento VDRL mensal na gestante; trimestral fora da gestação.
- **Hepatite B** (HBsAg R) e **Hepatite C** (anti-HCV R): coletar confirmatório (HBV/HCV carga viral),
  encaminhar; notificar.
- **Inválido** em qualquer TR → repetir com novo kit (consome estoque).
- **Prazos padrão (configuráveis)**: coleta confirmatório ≤ 7 dias; resultado confirmatório ≤ 30 dias;
  início tratamento ≤ 7 dias após confirmação (gestante sífilis: mesmo dia); notificação ≤ 7 dias; gera
  busca ativa quando a pessoa perde um prazo.
- **Completude da notificação**: campos essenciais (raça/cor, escolaridade, endereço, CNS, gestação...)
  com pontuação; bloqueia "pronto para notificar" se campos obrigatórios faltam; alerta para "ignorado".
- **Estoque**: FEFO (usar primeiro o lote que vence antes), alerta de validade ≤ 30 dias, estoque mínimo
  por tipo, consumo abatido automaticamente a cada teste registrado, fechamento mensal no formato do
  boletim SISLOGLAB (testes realizados, reagentes, perdas, vencidos).

## 3.6 Design de interação e interface (requisitos de IHC)

Documentação completa em `docs/design-ihc.md` e demonstração viva em **Ajuda → Guia de interface**.

**a) Perfis de usuários (níveis de acesso)** — 5 níveis hierárquicos de permissão (ver seção 2):
`acs` (1: própria microárea) < `executor` (2: UBS, registro) < `responsavel_tecnico` (3: UBS, gestão)
< `gestor` (4: todas UBS, leitura agregada, dados anonimizados) · `admin` (5: sistema, sem dado clínico).
Matriz de permissões em `src/domain/permissoes.ts` controla menu, rotas e botões.

**b) Ações e interfaces por perfil**
| Perfil | Menu/telas | Ações |
|---|---|---|
| ACS | Painel ACS, Busca ativa (mobile-first) | Ver pendências da microárea, registrar tentativa de contato/desfecho |
| Executor | Painel, Nova testagem, Testagens, Pessoas, Seguimento | Cadastrar pessoa, registrar TR guiado, registrar conduta/tratamento/VDRL |
| RT | + Estoque, Notificações, Indicadores da UBS | Entrada/perda de lotes, fechamento SISLOGLAB, validar e marcar notificação |
| Gestor | Painel gestor, Indicadores (UBS/território) | Filtrar, comparar territórios, exportar CSV |
| Admin | Configurações, Auditoria | Usuários, UBS, prazos, estoque mínimo, reset demo |

**c) Composição**
- Layout: *shell* com barra lateral (navegação global) + barra superior (contexto: UBS, perfil, busca,
  acessibilidade) + área de conteúdo com cabeçalho de página (título, descrição, ação primária à direita).
- Gestalt: **proximidade** (campos agrupados em `fieldset`), **região comum** (cartões por assunto, como no
  BMC), **similaridade** (mesma cor/forma = mesmo status ou agravo em todo o sistema), **continuidade**
  (stepper do assistente e linha do tempo do caso), **figura-fundo** (diálogos com fundo escurecido),
  **pregnância** (uma ação primária por tela), **fechamento** (barras de progresso de prazo/completude).
- Responsivo: mobile-first; `< lg` a barra lateral vira gaveta; tabelas viram cartões em telas pequenas;
  alvos de toque ≥ 44px; grid 1→2→3/4 colunas.

**d) Harmonia de cores e paleta** — esquema **complementar dividido**: azul-petróleo (confiança,
institucional, igual ao cabeçalho do BMC) como primária + âmbar como acento/atenção; neutros frios.
Cores semânticas (sucesso/atenção/perigo/info) sempre acompanhadas de ícone + texto. Agravos com paleta
categórica segura para daltonismo (Okabe-Ito): HIV vermelhão, Sífilis azul, Hep. B verde-azulado,
Hep. C púrpura. Tokens em `src/index.css`, modo claro/escuro e alto contraste, todos com contraste AA.

**e) Tipografia** — **Atkinson Hyperlegible** (Braille Institute, projetada para baixa visão, diferencia
I/l/1, O/0) para a interface; **JetBrains Mono** para códigos (CNS, lote). Escala 12/14/16/18/20/24/30,
base 16px, altura de linha 1,5, números tabulares em tabelas. Usuário pode aumentar a fonte (A+/A−).

**f) Semiótica: ícones** — biblioteca única (Lucide, traço uniforme 2px), sempre acompanhados de rótulo
textual. Mapa de ícones: testagem = frasco, pessoas = usuários, seguimento = rota, busca ativa = pegadas/pin,
estoque = pacote, notificação = envio, indicadores = gráfico, auditoria = escudo, gestante = bebê.
Agravos representados por **siglas** (HIV, SIF, HBV, HCV) em selos coloridos — doenças não têm pictograma
universal, a sigla é o signo já usado pelos profissionais. Status: ✓ círculo (ok), triângulo (atenção),
relógio (aguardando), X (vencido/erro).

**g) Recursos de acessibilidade** (WCAG 2.2 AA)
- `lang="pt-BR"`, landmarks semânticos, link "pular para o conteúdo", títulos hierárquicos por página
- Navegação completa por teclado, foco visível, ordem de foco lógica, diálogos com foco preso e `Esc`
- Rótulos em todos os campos, erros ligados via `aria-describedby`, `aria-live` para avisos (toasts)
- Informação nunca só por cor (ícone + texto), contraste AA, modo alto contraste e modo escuro
- Ajuste de tamanho de fonte, respeito a `prefers-reduced-motion`, alvos de toque ≥ 44px
- Linguagem simples, confirmação antes de ações destrutivas, desfazer quando possível

## 4. Módulos / telas e checklist

### Fase 0 — Planejamento e base
- [x] Ler pesquisa exploratória, pesquisa desk, cartões de insight e BMC
- [x] Criar este TODO.md com arquitetura e plano
- [x] CLAUDE.md com a regra de manter o TODO atualizado
- [x] Scaffold Vite + React + TS + Tailwind + dependências
- [x] Tema/tokens (claro/escuro), tipografia, design system base
- [x] Layout (AppShell, Sidebar por perfil, Topbar com UBS/perfil, skip link)

### Fase 1 — Domínio e dados mock
- [x] Tipos do domínio e rótulos pt-BR
- [x] Regras: fluxograma, seguimento/prazos, notificação/completude, estoque, indicadores, CNS/CPF
- [x] Testes unitários das regras (Vitest)
- [x] Seed determinístico (territórios, UBS, usuários, pessoas, testagens, casos, lotes)
- [x] Store mock persistido + API assíncrona + auditoria automática
- [x] Hooks TanStack Query

### Fase 2 — Telas
- [x] Sessão demo (entra direto como executor; troca de perfil no menu do usuário; explicação em `/perfis`) + rotas protegidas
- [x] Painel (pendências do dia, prazos vencendo, alertas de estoque, atalhos) por perfil
- [x] Nova testagem — assistente em etapas: pessoa → contexto → testes guiados pelo fluxograma → conduta/resumo
- [x] Testagens — lista com filtros
- [x] Pessoas — busca (nome/CNS/CPF), cadastro/edição, detalhe com linha do tempo
- [x] Seguimento — lista/quadro de casos por etapa com prazos (SLA) + detalhe do caso
      (confirmatório, tratamento/doses, VDRL, parcerias, desfecho)
- [x] Busca ativa — lista da microárea (mobile-first), registrar tentativa/resultado
- [x] Estoque — lotes (FEFO), entrada de lote, perdas/ajustes, movimentações, alertas, fechamento SISLOGLAB (CSV)
- [x] Notificações — fila com completude, corrigir campos, marcar como notificado (Sentinela / e-mail DVS)
- [x] Indicadores — por UBS e território: testes, positividade, tempo até confirmação, tratamento iniciado,
      completude, evitabilidade; gráficos e exportação
- [x] Auditoria — trilha filtrável
- [x] Configurações — UBS, usuários, parâmetros de prazos e estoque mínimo, reset dos dados demo
- [x] Ajuda — central de ajuda com fluxogramas e FAQ

### Fase 3 — Qualidade (IHC)
- [x] Acessibilidade: navegação por teclado, foco visível, ARIA, contraste AA, textos alternativos
- [x] Responsivo (ACS no celular), estados vazios/carregando/erro, confirmações em ações destrutivas
- [x] Mensagens de erro claras e prevenção de erros (heurísticas de Nielsen)
- [x] Privacidade (LGPD): mascarar CPF/CNS em listas, dado sensível só no detalhe
- [x] Build de produção sem erros + lint + testes passando
- [x] README com como rodar, perfis demo e decisões
- [x] `docs/design-ihc.md`: perfis/níveis, ações por perfil, composição/Gestalt/responsivo, paleta,
      tipografia, semiótica/ícones, acessibilidade
- [x] Página "Guia de interface" (Ajuda) demonstrando paleta, tipografia, ícones e acessibilidade
- [x] Verificação no navegador real (Playwright + Chrome): todos os perfis, assistente de ponta a ponta, celular,
      modo escuro, alto contraste — sem erros de console
- [ ] Teste com leitor de tela (NVDA) e avaliação com usuários reais (teste de usabilidade / SUS)
- [ ] Silenciar/ajustar avisos de lint `only-export-components` (apenas fast refresh; não afetam produção)
- [x] Barra de acessibilidade: A+/A−, alto contraste, tema claro/escuro (preferência salva)

### Fase 4 — Backend (repositório `trabalho-ihc-backend`, depois do front)
- [ ] Criar repositório no GitHub (requer `gh` CLI autenticado ou criação manual)
- [ ] API REST espelhando `src/data/api` (OpenAPI)
- [ ] PostgreSQL + migrações, seed equivalente
- [ ] Autenticação JWT + perfis + auditoria
- [ ] Trocar a implementação mock do front por cliente HTTP (flag `VITE_API_URL`)

### Ideias futuras (backlog)
- Integração com e-SUS APS (CDS/PEC) e exportação para Sentinela
- PWA/offline para ACS
- Deploy do front (GitHub Pages / Vercel)

## 5. Registro de alterações

| Data | Alteração |
|---|---|
| 2026-09-24 | Planejamento inicial: TODO.md, CLAUDE.md, arquitetura e escopo do frontend. |
| 2026-09-24 | Incluídos requisitos de IHC (seção 3.6): perfis/níveis, ações por perfil, composição/Gestalt/responsivo, paleta, tipografia, semiótica, acessibilidade. |
| 2026-09-24 | Scaffold (Vite 8, React 19, TS 6, Tailwind 4, React Router 8, TanStack Query, Zod, Recharts, Vitest). |
| 2026-09-24 | Domínio + regras puras com testes; seed determinístico (10 UBS, 5 coordenadorias, ~800 testagens) testado; API mock com permissões por perfil e auditoria; persistência comprimida (lz-string) com gravação agrupada. |
| 2026-09-24 | Design system (tokens claro/escuro/alto contraste, Atkinson Hyperlegible), AppShell, login por perfil, painéis por perfil, busca ativa, assistente de nova testagem. Paleta de agravos validada (validador de daltonismo): tons do modo escuro ajustados para #D9691A/#3D8FD6/#16A07A/#C470B8. |
| 2026-09-24 | Correção: baixa de estoque valida uso do mesmo lote várias vezes na mesma testagem. |
| 2026-09-24 | Telas restantes: testagens (lista/detalhe), pessoas (lista/detalhe/formulário), seguimento (quadro/lista/detalhe do caso com ações contextuais e completude), notificações, estoque (visão geral, lotes, movimentações, fechamento SISLOGLAB CSV), indicadores (cascata do cuidado, comparação por UBS), auditoria, configurações, ajuda e guia de interface. |
| 2026-09-24 | Correções: anotação usa autor/data da sessão; diálogo devolve o foco ao desmontar; valor grande do KPI sem tabular-nums; barra lateral ocupa a altura toda; assistente em 1 coluna até 2xl; rótulo da linha de referência não corta. |
| 2026-09-24 | Seed com estoque realista (lotes de 25 un., TR2 de 10) e mínimos ≈ 30 dias de consumo (TR1/sífilis 20, hepatites 15, TR2 5); seed reserva unidades por testagem; VERSAO_BANCO = 2 (regenera dados antigos). 37 testes passando. |
| 2026-09-24 | Documentação: README e docs/design-ihc.md. |
| 2026-09-24 | Login: removido o parágrafo de subtítulo abaixo do título (pedido do usuário). |
| 2026-09-24 | Tema claro passa a ser o padrão (removida a opção "sistema"; preferência antiga "sistema" vira claro). Troca claro/escuro saiu do menu Acessibilidade e virou botão lua/sol no canto inferior da barra lateral (desktop e gaveta mobile); desabilitado com alto contraste. "Restaurar padrão" da acessibilidade não mexe mais no tema. |
| 2026-09-24 | Troca de tema animada: ícone lua↔sol gira e cresce com efeito de mola; o novo tema se revela num círculo a partir do botão (View Transitions API, 550ms), com fallback de fade de cores (`tema-em-transicao`) e troca instantânea com "reduzir animações". Componente em `src/app/layout/AlternarTema.tsx`. |
| 2026-09-24 | Barra superior: removido o ícone de casa antes do contexto da UBS (casa sugeria link para o início). Novo ícone da marca e da aba: cassete de teste rápido com faixas C/T em azul (`public/favicon.svg` e `Logo.tsx`), no lugar da gota com "+" em âmbar. |
| 2026-09-24 | Removida a tela de login/seleção de perfil: sem sessão, o sistema entra com o primeiro perfil demo ativo (Executor(a) Ana Paula; `entrarComPerfilPadrao` na API mock). Menu do usuário troca de perfil (lista dos 6 perfis, marca o atual) e perdeu o "Sair". Rota oculta `/perfis` (fora do menu lateral, link "O que muda em cada perfil?" no menu do usuário) explica níveis/tarefas e permite trocar. `/entrar` redireciona para o painel. |
| 2026-09-24 | Menu Acessibilidade saiu da barra superior e foi para o rodapé da barra lateral, ao lado do botão lua/sol (desktop e gaveta mobile); o painel abre para cima com posição fixa (`src/app/layout/Acessibilidade.tsx`), Esc fecha só o painel. Guia de interface e docs/design-ihc.md atualizados. |
| 2026-09-24 | Botão Acessibilidade: ícone do cadeirante (Lucide) trocado pelo símbolo universal de acesso (pessoa de braços abertos em círculo duplo, SVG próprio), em branco. |
| 2026-09-24 | Título da aba padronizado como "<nome da tela> · Testagem UBS": `PageHeader` ganhou `tituloAba` para quando o h1 é pessoal. Painel → "Painel" (antes a saudação "Boa noite, Ana"); telas com nome de paciente usam nome genérico ("Cadastro da pessoa", "Editar cadastro", "Caso de HIV" etc.), por sigilo. |
| 2026-09-24 | Redesenho visual guiado pelo SKILL.md (frontend-design). Elemento de identidade: **fita do caso** (`src/components/ui/FitaDoCaso.tsx`), a trilha do cuidado desenhada como a janela do cassete de teste rápido, com uma faixa por etapa, nas pendências do painel, nos cartões e na lista do seguimento e no detalhe do caso (substitui o stepper ali). Regra pura `etapasDoCaso` com teste; `PendenciaPainel` ganhou `status`. Painel da UBS: sem a fileira de 4 cartões de número; a fila de pendências é o conteúdo principal e os números viram linhas em "Na UBS agora"; alertas em linhas com ícone em vez de caixas coloridas. Estoque: alertas e saldo por teste em listas com fios (antes, 5 cartões iguais). `Stat` agora é célula de `Resumo` (faixa única dividida por fios), sem ícone. Superfícies sem sombra (sombra só em menus/diálogos/avisos) e raio por hierarquia (painel 8px, controle 6px, selo 2px). Escala tipográfica 1,25 (31/25/20/16/14/12px). Removidos os tiques de template: CAIXA ALTA nos grupos da barra lateral, fonte monoespaçada (JetBrains Mono desinstalada; algarismos tabulares da Atkinson no lugar), "·" entre metadados (componente `Meta`), rótulos "HIV — TR1" (agora "HIV (TR1)"), setas "→" em links, plurais "caso(s)" (`plural()` em `src/lib/texto.ts`, com teste; corrige "1 dias"). Colunas do quadro: "Aguarda coleta/resultado/tratamento". VERSAO_BANCO = 3 (textos de esquema/exame sem travessão). Guia de interface e docs/design-ihc.md atualizados. |
| 2026-09-24 | Formulários: campos lado a lado agora alinham rótulo com rótulo e caixa com caixa mesmo quando só um tem dica (`Field` usa subgrid dentro do novo `GrupoCampos`; espaçamento por margem para não abrir vão entre rótulo e caixa). Blocos do cadastro de pessoa e das configurações viraram `GrupoCampos`: título de seção com fio acima, sem a legenda cortando a borda arredondada. Barra superior: removido o contexto "UBS Glória, CS Oeste" (fica no menu do usuário e na descrição do painel). "Na UBS agora": número colado ao texto, sem coluna de largura fixa (o 8 e o 2 ficavam longe do texto). Notificações: toda célula da faixa de números tem detalhe, para não sobrar vão em branco. |
| 2026-09-25 | Revisão de quebras nos números: células de `Resumo` alinham número/rótulo/detalhe por subgrid (rótulo em duas linhas não desalinha mais o detalhe, ex.: painel da gestão); número ímpar de células no celular estica a última (sem quadrado vazio, ex.: painel do admin); botão "Ver tabela" dos gráficos não quebra mais em duas linhas; Indicadores: sem caso encerrado ou sem confirmatório, a frase diz isso em vez de mostrar "—". Rodapé sem travessão. |
| 2026-09-25 | Menu lateral: item ativo virou uma aba da cor da página encaixada no conteúdo (cantos côncavos), no lugar do fundo azul + barra âmbar; na gaveta mobile, pílula da mesma cor. Modo escuro: `--sidebar` #172a38 (um pouco mais clara que a página) para a aba aparecer; token `--sidebar-active` removido. Âmbar fora de seleção e contagem: contadores do menu neutros (vencidas em vermelho; no item ativo, azul claro); foco do teclado em azul da marca (`--focus` #1d5b7c; `--focus-sobre-escuro` #8cc6e6 na barra lateral; laranja mantido no alto contraste). |
