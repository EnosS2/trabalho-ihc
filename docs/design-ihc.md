# Design de interação e interface — Testagem UBS

Documento de IHC do sistema de gestão da testagem rápida em UBS (Edgar Oliveira e Handriel Scheffer).
A mesma informação aparece, com os componentes reais, em **Ajuda → Guia de interface** (`/ajuda/guia-de-interface`).

---

## 1. Perfis de usuários (níveis de acesso)

O sistema tem cinco perfis em níveis hierárquicos. O menu, as rotas, os botões e a API aplicam a mesma matriz
de permissões (`src/domain/permissoes.ts`). A API não depende do menu escondido: ela recusa o que o perfil não pode fazer.

| Nível | Perfil | Quem é | Escopo dos dados |
|---|---|---|---|
| 1 | Agente comunitário de saúde (ACS) | Faz a busca ativa no território | Só a própria microárea, **sem diagnóstico** |
| 2 | Executor(a) de teste rápido | Enfermeiro(a) ou técnico(a) | A própria UBS |
| 3 | Responsável técnico(a) (RT) | Enfermeiro(a) que responde pela UBS | A própria UBS, com funções de gestão |
| 4 | Gestão APS / Vigilância | Coordenadoria, DVS | Toda a rede, **só agregado** |
| 5 | Administração do sistema | Suporte de TI | Configuração, **sem dado clínico** |

**Minimização de dados (LGPD).** Cada perfil vê só o necessário. O ACS vê nome, endereço e telefone de quem
precisa voltar à UBS, mas não vê o motivo clínico. O gestor vê números. O administrador vê usuários e auditoria.
CNS e CPF aparecem mascarados nas listas (`•••• 1234`) e só se revelam no cadastro, por ação explícita. Toda
visualização de cadastro é registrada na auditoria.

## 2. Ações e interfaces para cada perfil

| Perfil | Telas | Principais ações |
|---|---|---|
| ACS | Painel do ACS, Busca ativa | Ver quem precisa voltar; ligar com um toque; registrar visita, telefonema ou mensagem e o resultado |
| Executor | Painel do dia, Nova testagem, Testagens, Pessoas, Seguimento | Registrar a testagem guiada pelo fluxograma; cadastrar pessoa; registrar coleta, resultado, doses, VDRL, parcerias e desfecho |
| RT | Tudo do executor + Estoque, Notificações, Indicadores da UBS, Auditoria | Entrada, baixa e ajuste de lotes; fechamento SISLOGLAB (CSV); conferir completude e registrar envio da notificação |
| Gestor | Painel da rede, Indicadores | Comparar coordenadorias e UBS; filtrar período; exportar CSV |
| Admin | Painel administrativo, Configurações, Auditoria | Usuários e lotação; prazos e estoque mínimo; restaurar demonstração |

Cada perfil entra num **painel próprio** com as tarefas do dia, sem telas que não usa.

**Fluxos-chave**
- **Nova testagem (assistente em 4 etapas).** Pessoa → Contexto → Testes → Conduta. Na etapa de testes, o sistema lê o
  fluxograma do Ministério da Saúde e indica o próximo teste (ex.: TR1 reagente pede TR2 de outro fabricante). Também
  sugere o lote que vence primeiro (FEFO). O botão de avançar só libera quando o fluxograma termina (prevenção de erro).
  Se for gestante com sífilis reagente, o sistema pergunta se a 1ª dose foi aplicada, conforme a Nota Técnica CAIST/SMS.
- **Seguimento do caso.** Uma trilha mostra Teste → Confirmação → Tratamento → Seguimento → Desfecho. As ações são
  contextuais: só aparece o botão que faz sentido no momento (reconhecer em vez de lembrar).
- **Busca ativa.** É criada automaticamente quando alguém perde um prazo presencial e resolvida automaticamente quando a pendência é registrada.

## 3. Composição

### Layout adotado
- **Casca da aplicação:** barra lateral escura (navegação global agrupada por etapa do trabalho: Atendimento,
  Acompanhamento, Gestão, Sistema) + barra superior (contexto UBS/coordenadoria, menu de acessibilidade e usuário)
  + área de conteúdo com largura máxima de 80rem.
- **Página:** trilha de navegação → título (h1) e descrição → **uma** ação primária à direita → indicadores em linha →
  conteúdo principal à esquerda e apoio à direita (leitura em "F").
- **Formulários longos:** barra de ações fixa no rodapé (Voltar / Continuar / Finalizar).

### Princípios de Gestalt aplicados
| Princípio | Onde |
|---|---|
| Proximidade | Campos agrupados em blocos (Identificação, Dados para a vigilância, Contato e endereço, Gestação); itens de menu agrupados por etapa |
| Região comum | Cartões delimitam um assunto cada, como os blocos do Business Model Canvas |
| Similaridade | O mesmo agravo tem sempre a mesma sigla e cor; o mesmo status tem sempre o mesmo selo e ícone |
| Continuidade | Stepper do assistente, trilha do caso e linha do tempo |
| Figura-fundo | Diálogos sobre fundo escurecido; barra lateral escura contra conteúdo claro |
| Fechamento | Barras de completude da ficha e de estoque lidas como "quanto falta" |
| Pregnância | Uma única ação primária por tela; hierarquia tipográfica simples |

### Recursos responsivos
- Abordagem mobile-first; pontos de quebra em 640, 768, 1024 e 1280px.
- Em telas ≥ 1024px a barra lateral fica fixa; abaixo disso vira gaveta modal (foco preso, Esc fecha).
- Tabelas viram cartões com pares rótulo/valor em telas pequenas, sem rolagem horizontal.
- Grades de indicadores passam de 1 para 2 e 4 colunas; o quadro de casos rola na horizontal.
- Alvos de toque têm no mínimo 44px.
- A busca ativa foi desenhada para o celular do ACS: telefone clicável (`tel:`) e endereço em destaque.

## 4. Harmonia de cores e paleta

**Esquema complementar dividido.** A base é o **azul-petróleo**, uma cor institucional e calma, associada à saúde,
no mesmo tom do cabeçalho do BMC. O acento é o **âmbar**, próximo do complementar, usado para atenção e identidade
sem competir com o vermelho de perigo. Os neutros são frios, para manter a unidade.

| Papel | Token | Claro | Escuro |
|---|---|---|---|
| Primária | `--primary` | `#1D5B7C` | `#6CB4DC` |
| Primária forte (barra lateral) | `--primary-strong` / `--sidebar` | `#173447` | `#0A1319` |
| Acento | `--accent-fill` | `#E9A23B` | `#F2B35C` |
| Foco | `--focus` | `#C26A00` | `#F2B35C` |
| Fundo / superfície | `--bg` / `--surface` | `#F2F5F7` / `#FFFFFF` | `#0D161D` / `#131F28` |
| Texto / secundário | `--fg` / `--muted` | `#13212B` / `#4B5D6A` | `#E5ECF1` / `#A5B4C0` |
| Sucesso / atenção / perigo / info | `--success` … | `#1C6B3E` / `#8A5100` / `#B42318` / `#1F5FA6` | `#6FCF97` / `#F2C063` / `#F28B82` / `#8AB8F0` |

**Cores dos agravos (paleta categórica Okabe-Ito, segura para daltonismo)**

| Agravo | Claro | Escuro |
|---|---|---|
| HIV | `#D55E00` | `#D9691A` |
| Sífilis | `#0072B2` | `#3D8FD6` |
| Hepatite B | `#009E73` | `#16A07A` |
| Hepatite C | `#CC79A7` | `#C470B8` |

A paleta foi **verificada com um validador de daltonismo** (deuteranopia, protanopia, tritanopia), com faixa de
luminosidade, croma e contraste. No modo escuro, a versão original reprovou e os tons foram ajustados até
passar. Como alguns pares ficam perto do limite, **a cor nunca aparece sozinha**: ela sempre acompanha a sigla.

**Regras**
- Contraste de 4,5:1 para textos e 3:1 para bordas de controle (WCAG 2.2 AA).
- Cores semânticas sempre acompanham ícone e texto.
- Há três temas: claro (**padrão**), escuro e **alto contraste** (preto sobre branco, bordas pretas). A troca
  claro/escuro fica num botão de lua/sol no canto inferior da barra lateral (sempre à mão, sem abrir menu); o alto
  contraste fica no menu Acessibilidade. A troca é animada: o ícone gira de lua para sol e o novo tema se revela
  num círculo a partir do botão, dando continuidade visual (sem "piscar"). Com "reduzir animações" a troca é imediata.
- Os tokens ficam em `src/index.css`.

## 5. Tipografia

- **Atkinson Hyperlegible** na interface. Foi criada pelo Braille Institute para leitores com baixa visão e distingue
  bem `I l 1` e `O 0`. Isso importa num resultado lido com pressa, numa tela pequena.
- **JetBrains Mono** em códigos (CNS, CPF, lote), para conferir os dígitos alinhados.
- A escala tem base de 16px e razão ≈ 1,2: 12 · 14 · 16 · 18 · 24 · 30px.
- São usados dois pesos (400 e 700), com altura de linha 1,5 e números tabulares em tabelas.
- O usuário pode ampliar o texto até 137,5% (A+). O layout acompanha porque tudo é medido em `rem`.
- As fontes são servidas pelo próprio app (`@fontsource`), sem depender de CDN.

## 6. Semiótica: ícones adotados

A biblioteca é única (**Lucide**, traço de 2px, cantos arredondados). Cada conceito tem **um** signo, sempre
acompanhado de rótulo em texto. O mapa fica em `src/components/icones.ts`.

| Conceito | Ícone | Motivo |
|---|---|---|
| Painel | casa | ponto de partida |
| Nova testagem | frasco de laboratório | ato de testar |
| Testagens | prancheta | registro/histórico |
| Pessoas | usuários | cadastro de pessoas |
| Seguimento | rota | caminho do caso até o desfecho |
| Busca ativa | pegadas | ir até a pessoa |
| Estoque | pacote | kits e lotes |
| Notificações | avião de papel (envio) | enviar à vigilância |
| Indicadores | gráfico de barras | medir e comparar |
| Auditoria | escudo | segurança e rastreabilidade |
| Gestante | bebê | transmissão vertical |
| Tratamento / dose | seringa | aplicação |
| Confirmatório | tubos de ensaio | exame laboratorial |
| Status | ✓ círculo, △ triângulo, relógio, ✕ círculo | concluído, atenção, aguardando, vencido |

**Agravos são representados por siglas** (HIV, SIF, HBV, HCV) em selos coloridos. Doenças não têm pictograma
universal, e a sigla é o signo que a equipe já usa no dia a dia.

## 7. Recursos de acessibilidade (meta: WCAG 2.2 AA)

- `lang="pt-BR"`, landmarks semânticos, um `h1` por página e títulos de aba (`document.title`) por página.
- Link **"Pular para o conteúdo"**. Ao trocar de página, o foco vai para o conteúdo, e o leitor de tela anuncia.
- Navegação completa por teclado, com **foco visível** em âmbar de 3px e ordem lógica.
- Diálogos usam o `<dialog>` nativo: foco preso, `Esc` fecha e o foco volta à origem. A gaveta do menu mobile também prende o foco.
- Abas seguem o padrão ARIA (setas, Home/End). Os grupos de opção usam rádios nativos, que funcionam com as setas.
- Todo campo tem rótulo visível. Erros ficam ligados ao campo por `aria-describedby`, com ícone e texto, e há um resumo de erros no topo do formulário.
- Avisos temporários usam `aria-live`: `polite` para sucesso e `assertive` para erro.
- Todo gráfico tem **alternativa em tabela** e resumo textual para leitores de tela.
- A informação **nunca depende só de cor**. Há modos escuro e **alto contraste**.
- O texto pode ser ampliado (A−/A+). O sistema respeita `prefers-reduced-motion` e tem a opção "Reduzir animações".
- Alvos de toque têm no mínimo 44px.
- **Prevenção de erros (Nielsen):**
  - validação de CNS e CPF por dígito verificador;
  - bloqueio de datas futuras;
  - aviso ao sair do assistente com testes lidos;
  - confirmação antes de ações irreversíveis;
  - botão "Desfazer último teste";
  - detecção de cadastro duplicado.
- Linguagem simples, sem jargão técnico de sistema.
