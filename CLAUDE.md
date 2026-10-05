# CLAUDE.md

Sistema web de gestão da testagem rápida (HIV, sífilis, hepatites B/C) em UBS de Porto Alegre.
Trabalho de IHC de Edgar Oliveira e Handriel Scheffer.

## Regra obrigatória
- `TODO.md` é o plano vivo do projeto. **Antes de trabalhar, leia-o. Depois de qualquer alteração,
  atualize os checkboxes e adicione uma linha no "Registro de alterações"** (data + o que mudou).

## Convenções
- Interface, rótulos e textos em português do Brasil; código (identificadores) em português quando
  for termo do domínio (testagem, caso, lote) e inglês para termos técnicos genéricos.
- Regras clínicas/negócio ficam em `src/domain/rules` como funções puras, sempre com teste.
- Telas nunca acessam o store diretamente: usam os hooks de `src/data/hooks` → `src/data/api`.
  A API mock tem o mesmo contrato do futuro backend (`trabalho-ihc-backend`).

## Comandos
- `npm run dev` — servidor de desenvolvimento
- `npm run build` — typecheck + build de produção
- `npm test` — testes (Vitest)
- `npm run lint` — oxlint (os avisos `only-export-components` são conhecidos e não afetam produção)

## Mapa do código (consulte antes de buscar no projeto)
Caminhos relativos a `src/`. Atualize esta seção ao criar, mover ou renomear arquivos.

**Domínio (regras puras, com teste ao lado: `*.test.ts`)**
- `domain/types.ts` — todos os tipos (Pessoa, Testagem, Caso, Notificacao, LoteInsumo, Usuario...).
- `domain/rotulos.ts` — rótulos pt-BR de enums (agravo, sexo, raça/cor, status, motivo...). Texto de opção de select mora aqui.
- `domain/permissoes.ts` — perfis, matriz de permissões, `pode()`, níveis de acesso.
- `domain/parametros.ts` — prazos e estoque mínimo padrão.
- `domain/rules/fluxograma.ts` — interpretação dos testes rápidos (HIV TR1/TR2, sífilis, hepatites) e condutas.
- `domain/rules/seguimento.ts` — caso: criação, status derivado, pendências/prazos, ações (`aplicarAcao`), desfazer registros, etapas da fita.
- `domain/rules/notificacao.ts` — quando o caso é notificável, destino, prazo e completude da ficha.
- `domain/rules/estoque.ts` — FEFO, alertas de validade/mínimo, resumo por tipo, fechamento SISLOGLAB (CSV).
- `domain/rules/indicadores.ts` — indicadores por UBS/território.
- `domain/rules/documentos.ts` — CNS/CPF (validar, formatar, mascarar), telefone.
- `domain/rules/pessoa.ts` — `nomeDeExibicao` (nome social) e texto de busca.

**Dados (API mock com o contrato do futuro backend)**
- `data/api.ts` — um export por endpoint; aplica permissões e auditoria. `data/hooks.ts` — hooks TanStack Query que as telas usam. Senhas fictícias do login: `SENHAS_DEMO` em `api.ts`.
- `data/operacoes.ts` — escritas compartilhadas por API e seed (registrar testagem, ações do caso, notificação, busca ativa).
- `data/seed.ts` — dados fictícios determinísticos; `data/banco.ts` — estrutura e `VERSAO_BANCO` (subir ao mudar o seed); `data/store.ts` — localStorage.

**App e layout**
- `app/router.tsx` — rotas e permissão por rota. `app/navegacao.ts` — itens e grupos do menu lateral.
- `app/sessao.tsx` — sessão demo (sem sessão → `/entrar`), `usePode`, bloqueio por permissão. `app/preferencias.tsx` — fonte, alto contraste, tema, animações.
- `app/versao.ts` — versão no rodapé (data do último commit, injetada pelo `vite.config.ts`).
- `app/layout/` — `AppShell` (estrutura + rodapé), `Sidebar`, `Topbar` (menu do usuário, troca de perfil), `BuscaGlobal` (busca de pessoas, atalho `/`), `Acessibilidade`, `AlternarTema`, `Logo`.

**Design system (`components/`)**
- `ui/Form.tsx` — `Field` (rótulo/dica/erro), `GrupoCampos`, `Input`, `InputData` (dd/mm/aaaa), `Select`, `Textarea`, `Checkbox`, `RadioCards`, `Segmented`.
- `ui/Layout.tsx` — `PageHeader` (título, trilha, título da aba), `Resumo`/`Stat`, `Medidor`, `Stepper`, `LinhaDoTempo`, `DescricaoLista`, `Meta`.
- `ui/Dialog.tsx` — `Dialog` (com `alteracoesPendentes`) e `ConfirmDialog`. `ui/Toast.tsx` — avisos, com ação opcional ("Desfazer").
- `ui/Badge.tsx` — `Badge`, `AgravoBadge`, `GestanteBadge`, `PrazoBadge`, `StatusCasoBadge`. `ui/FitaDoCaso.tsx` — trilha do caso.
- `ui/Button.tsx`, `ui/Card.tsx`, `ui/Tabs.tsx`, `ui/DataTable.tsx` (tabela que vira cartões no celular), `ui/Feedback.tsx` (Carregando, EstadoVazio, EstadoErro, Aviso).
- `icones.ts` — mapa único de ícones (`ICONE`). `graficos/GraficoBarras.tsx` — gráfico com alternativa em tabela.
- `index.css` — tokens de cor (claro, escuro, alto contraste), fontes, barras de rolagem.

**Utilitários (`lib/`)**
- `datas.ts` — formatar datas, somar dias, idade, máscara dd/mm/aaaa. `texto.ts` — `plural()`. `cn.ts` — classes.
- `estadoNaUrl.ts` — `useEstadoNaUrl`/`useBooleanoNaUrl`: filtros e abas guardados na URL.

**Telas (`features/`)**
- `auth/LoginPage.tsx` — login fictício (`/entrar`): e-mail + senha da API mock e lista de acessos de demonstração.
- `painel/` — painel por perfil (UBS, ACS, gestor, admin).
- `testagem/` — `NovaTestagemPage` (assistente em 4 passos), `TestagensPage` (lista), `TestagemDetalhePage`.
- `pessoas/` — lista, detalhe, `PessoaFormulario` (cadastro, zod) usado na página e no diálogo do assistente.
- `seguimento/` — `SeguimentoPage` (quadro/lista), `CasoDetalhePage` (ações, histórico, notificação), `componentes.tsx` (lista de pendências).
- `busca-ativa/`, `notificacoes/`, `estoque/`, `indicadores/`, `auditoria/`, `config/` — uma página cada.
- `ajuda/` — Central de ajuda (FAQ, fluxogramas, teclado), `GuiaInterfacePage` (paleta, tipografia, ícones), `PerfisPage`.

**Documentação**: `TODO.md` (plano e registro de alterações), `docs/design-ihc.md` (decisões de IHC), `README.md`.
