# Testagem UBS — gestão da testagem rápida

Protótipo funcional (frontend) de um sistema web para a **gestão da testagem rápida de HIV, sífilis e hepatites B/C
nas Unidades Básicas de Saúde** de Porto Alegre. Trabalho da disciplina de IHC, de **Edgar Oliveira e Handriel Scheffer**.

O Sentinela registra quem foi **diagnosticado**. Este sistema cobre o que acontece antes e depois do diagnóstico,
dentro da UBS:

- **Testagem guiada pelo fluxograma** do Ministério da Saúde: o sistema indica o próximo teste, o lote a usar (FEFO) e a conduta.
- **Seguimento** de cada caso reagente até o desfecho, com prazos, doses, VDRL, parcerias e **busca ativa** automática pelo ACS.
- **Estoque por lote**, com baixa automática a cada teste, alertas de validade e fechamento mensal no formato do SISLOGLAB (CSV).
- **Notificação completa**, com pontuação de completude da ficha antes do envio ao Sentinela ou à DVS.
- **Indicadores** por UBS e coordenadoria (cascata do cuidado).

> Todos os dados são **fictícios**, gerados no navegador. Nada é enviado a servidores.

## Como rodar

Requisitos: Node.js 22 ou superior.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes das regras de negócio e do seed
npm run build      # typecheck + build de produção
npm run lint
```

O sistema abre na tela de login (fictício: as senhas só existem na API mock). A própria tela lista os acessos de demonstração e preenche o formulário com um clique. Depois de entrar, dá para trocar de perfil ou sair pelo menu do usuário, no canto superior direito; a página `/perfis` explica o que cada um pode fazer. Cada perfil tem nível de acesso e interface próprios.

| Perfil | Pessoa demo | E-mail | Senha | O que experimentar |
|---|---|---|---|---|
| ACS | Joana Martins | `joana.martins@demo.poa` | `acs123` | Busca ativa no celular (sem diagnóstico visível) |
| Executor(a) | Ana Paula Ribeiro | `ana.ribeiro@demo.poa` | `executor123` | **Nova testagem** (teste um TR1 reagente de HIV); caso da gestante *Camila Brum Vargas* (2ª dose atrasada) |
| Responsável técnica | Beatriz Rocha | `beatriz.rocha@demo.poa` | `rt123` | Estoque (lote vencido, HBsAg abaixo do mínimo), Notificações, Indicadores |
| Gestão APS/DVS | Marcos Pereira | `marcos.pereira@demo.poa` | `gestor123` | Indicadores comparando coordenadorias |
| Administração | Paula Schmitt | `paula.schmitt@demo.poa` | `admin123` | Usuários, prazos, restaurar dados de demonstração |

## Documentação

- [TODO.md](TODO.md): plano vivo, arquitetura, checklist e registro de alterações
- [docs/design-ihc.md](docs/design-ihc.md): perfis, ações por perfil, composição/Gestalt, paleta, tipografia, ícones e acessibilidade
- [docs/fluxograma-perfis.md](docs/fluxograma-perfis.md): fluxogramas do sistema por perfil de usuário (imagens em `docs/fluxogramas/`)
- No próprio app: **Ajuda → Guia de interface**

## Arquitetura (resumo)

```
src/
  domain/      tipos, permissões e regras puras (fluxograma, seguimento, notificação, estoque, indicadores) + testes
  data/        API mock com o contrato do futuro backend, seed determinístico, store persistido
  components/  design system próprio (tokens, botões, formulários, diálogos, tabelas responsivas, gráficos)
  features/    uma pasta por módulo/tela
  app/         roteamento, sessão, preferências de acessibilidade, layout
```

Stack: Vite, React 19, TypeScript, Tailwind CSS 4, React Router, TanStack Query, React Hook Form + Zod, Recharts,
Vitest. O backend (Node + PostgreSQL) está planejado para o repositório `trabalho-ihc-backend` (ver TODO.md, Fase 4).
