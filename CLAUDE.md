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
- `npm run lint` — ESLint
