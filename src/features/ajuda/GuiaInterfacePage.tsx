import { useEffect, useState } from 'react'
import { ICONE, SIGNIFICADO_ICONE, type NomeIcone } from '@/components/icones'
import { AgravoBadge, Badge, GestanteBadge, PrazoBadge, StatusCasoBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Aviso } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/Layout'
import { NIVEL_ACESSO, PERMISSOES, type Permissao } from '@/domain/permissoes'
import { AGRAVOS, PERFIL_ROTULO, STATUS_CASO_ORDEM } from '@/domain/rotulos'
import type { Perfil } from '@/domain/types'
import { usePreferencias } from '@/app/preferencias'
import { hojeISO, somarDias } from '@/lib/datas'

const SECOES = [
  { id: 'perfis', titulo: '1. Perfis e níveis de acesso' },
  { id: 'acoes', titulo: '2. Ações e interfaces por perfil' },
  { id: 'composicao', titulo: '3. Composição, Gestalt e responsividade' },
  { id: 'cores', titulo: '4. Harmonia de cores e paleta' },
  { id: 'tipografia', titulo: '5. Tipografia' },
  { id: 'semiotica', titulo: '6. Semiótica: ícones' },
  { id: 'acessibilidade', titulo: '7. Recursos de acessibilidade' },
]

const PERMISSAO_ROTULO: Record<Permissao, string> = {
  'painel.ver': 'Ver painel',
  'testagem.registrar': 'Registrar testagem',
  'testagem.ver': 'Consultar testagens',
  'pessoa.ver': 'Consultar pessoas (dado identificado)',
  'pessoa.editar': 'Cadastrar/editar pessoas',
  'caso.ver': 'Consultar casos',
  'caso.editar': 'Conduzir seguimento',
  'busca.ver': 'Ver busca ativa',
  'busca.registrar': 'Registrar tentativa de contato',
  'estoque.ver': 'Consultar estoque',
  'estoque.gerir': 'Entrada, baixa e ajuste de lotes',
  'notificacao.ver': 'Ver notificações',
  'notificacao.enviar': 'Registrar envio de notificação',
  'indicadores.ubs': 'Indicadores da UBS',
  'indicadores.rede': 'Indicadores da rede',
  'auditoria.ver': 'Consultar auditoria',
  'config.gerir': 'Usuários e parâmetros',
}

const PERFIS: Perfil[] = ['acs', 'executor', 'responsavel_tecnico', 'gestor', 'admin']

const TELAS: Record<Perfil, { telas: string; acoes: string[] }> = {
  acs: { telas: 'Painel do ACS · Busca ativa (projetada primeiro para celular)', acoes: ['Ver quem precisa voltar à UBS na sua microárea', 'Ligar com um toque (link tel:)', 'Registrar visita, telefonema ou mensagem e o resultado'] },
  executor: { telas: 'Painel do dia · Nova testagem · Testagens · Pessoas · Seguimento', acoes: ['Registrar testagem guiada pelo fluxograma (próximo teste, lote FEFO, conduta)', 'Cadastrar pessoa já com os campos da notificação', 'Registrar coleta, resultado, doses, VDRL, parcerias e desfecho'] },
  responsavel_tecnico: { telas: 'Tudo do executor + Estoque · Notificações · Indicadores da UBS · Auditoria', acoes: ['Entrada, baixa e ajuste de lotes; fechamento SISLOGLAB em CSV', 'Conferir completude e registrar envio ao Sentinela/DVS', 'Acompanhar a cascata do cuidado da UBS'] },
  gestor: { telas: 'Painel da rede · Indicadores por coordenadoria e UBS', acoes: ['Comparar territórios (ex.: coleta no prazo, tratamento iniciado)', 'Filtrar período, coordenadoria e UBS', 'Exportar CSV — sem dados identificados'] },
  admin: { telas: 'Painel administrativo · Configurações · Auditoria', acoes: ['Criar usuários e atribuir perfil/lotação', 'Ajustar prazos e estoque mínimo', 'Consultar a trilha de auditoria'] },
}

const TOKENS_COR: { grupo: string; itens: { nome: string; token: string; uso: string }[] }[] = [
  {
    grupo: 'Primária (azul-petróleo) — confiança, ação principal',
    itens: [
      { nome: 'Primária', token: '--primary', uso: 'Botões, links, item ativo' },
      { nome: 'Primária forte', token: '--primary-strong', uso: 'Barra lateral / cabeçalho (como no BMC)' },
      { nome: 'Primária suave', token: '--primary-soft', uso: 'Seleção, fundos de destaque' },
    ],
  },
  {
    grupo: 'Acento (âmbar) — complementar dividido; atenção e marca',
    itens: [
      { nome: 'Acento', token: '--accent', uso: 'Texto de destaque (gestante)' },
      { nome: 'Acento preenchimento', token: '--accent-fill', uso: 'Logotipo, contadores, item ativo' },
      { nome: 'Foco', token: '--focus', uso: 'Contorno de foco do teclado' },
    ],
  },
  {
    grupo: 'Neutros frios',
    itens: [
      { nome: 'Fundo', token: '--bg', uso: 'Fundo da aplicação' },
      { nome: 'Superfície', token: '--surface', uso: 'Cartões' },
      { nome: 'Texto', token: '--fg', uso: 'Texto principal' },
      { nome: 'Texto secundário', token: '--muted', uso: 'Descrições, legendas' },
      { nome: 'Borda de controle', token: '--border-strong', uso: 'Campos de formulário (≥ 3:1)' },
    ],
  },
  {
    grupo: 'Semânticas — sempre com ícone e texto',
    itens: [
      { nome: 'Sucesso', token: '--success', uso: 'No prazo, concluído, não reagente' },
      { nome: 'Atenção', token: '--warning', uso: 'Prazo próximo, campo ignorado' },
      { nome: 'Perigo', token: '--danger', uso: 'Vencido, reagente, erro' },
      { nome: 'Informação', token: '--info', uso: 'Orientações' },
    ],
  },
  {
    grupo: 'Agravos — paleta categórica Okabe-Ito (segura para daltonismo)',
    itens: [
      { nome: 'HIV', token: '--hiv-solid', uso: 'Selo HIV (texto em --hiv)' },
      { nome: 'Sífilis', token: '--sif-solid', uso: 'Selo SIF (texto em --sif)' },
      { nome: 'Hepatite B', token: '--hbv-solid', uso: 'Selo HBV (texto em --hbv)' },
      { nome: 'Hepatite C', token: '--hcv-solid', uso: 'Selo HCV (texto em --hcv)' },
    ],
  },
]

function luminancia(hex: string) {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contraste(a: string, b: string) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** Lê os tokens do tema ATIVO: a paleta exibida muda com claro/escuro/alto contraste. */
function useTokens() {
  const { prefs } = usePreferencias()
  const [valores, setValores] = useState<Record<string, string>>({})
  useEffect(() => {
    const t = setTimeout(() => {
      const css = getComputedStyle(document.documentElement)
      const todos = TOKENS_COR.flatMap((g) => g.itens.map((i) => i.token)).concat('--surface')
      setValores(Object.fromEntries(todos.map((k) => [k, css.getPropertyValue(k).trim()])))
    }, 50)
    return () => clearTimeout(t)
  }, [prefs])
  return valores
}

function Secao({ id, titulo, children, descricao }: { id: string; titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <Card aria-labelledby={`s-${id}`} id={id} className="scroll-mt-24">
      <CardHeader id={`s-${id}`} titulo={titulo} descricao={descricao} />
      <CardBody>{children}</CardBody>
    </Card>
  )
}

export default function GuiaInterfacePage() {
  const tokens = useTokens()
  const hoje = hojeISO()
  const superficie = tokens['--surface'] || '#ffffff'

  return (
    <>
      <PageHeader
        titulo="Guia de interface"
        descricao="Como os princípios de IHC foram aplicados neste sistema. A página usa os próprios componentes e tokens da aplicação."
        trilha={[{ rotulo: 'Ajuda', para: '/ajuda' }, { rotulo: 'Guia de interface' }]}
      />
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Seções do guia" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="flex flex-col gap-1 text-sm">
            {SECOES.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-lg px-3 py-2 font-bold text-muted hover:bg-surface-3 hover:text-fg">
                  {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-col gap-6">
          <Secao id="perfis" titulo={SECOES[0].titulo} descricao="Cinco níveis hierárquicos. O menu, as rotas, os botões e a API aplicam a mesma matriz.">
            <ul className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {PERFIS.map((p) => (
                <li key={p} className="rounded-xl border border-border p-3">
                  <p className="text-xs font-bold text-primary">Nível {NIVEL_ACESSO[p].nivel}</p>
                  <p className="font-bold">{PERFIL_ROTULO[p]}</p>
                  <p className="text-sm text-muted">Escopo: {NIVEL_ACESSO[p].escopo}</p>
                </li>
              ))}
            </ul>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <caption className="mb-2 text-left font-bold">Matriz de permissões</caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="py-2 pr-2 text-left">Permissão</th>
                    {PERFIS.map((p) => (
                      <th key={p} scope="col" className="px-2 py-2 text-center">N{NIVEL_ACESSO[p].nivel}<span className="block text-xs font-normal text-muted">{PERFIL_ROTULO[p].split(' ')[0]}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(PERMISSAO_ROTULO) as Permissao[]).map((perm) => (
                    <tr key={perm} className="border-b border-border last:border-0">
                      <th scope="row" className="py-1.5 pr-2 text-left font-normal">{PERMISSAO_ROTULO[perm]}</th>
                      {PERFIS.map((p) => (
                        <td key={p} className="px-2 py-1.5 text-center">
                          {PERMISSOES[p].includes(perm) ? (
                            <><ICONE.ok className="inline size-4 text-success" aria-hidden /><span className="sr-only">Sim</span></>
                          ) : (
                            <><span aria-hidden className="text-muted">—</span><span className="sr-only">Não</span></>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Aviso tom="info" className="mt-4" titulo="Minimização de dados (LGPD)">
              O ACS vê só nome, endereço e telefone de quem precisa voltar — nunca o diagnóstico. O gestor vê apenas números
              agregados. O administrador não acessa dados clínicos.
            </Aviso>
          </Secao>

          <Secao id="acoes" titulo={SECOES[1].titulo} descricao="Cada perfil entra num painel próprio com as tarefas do seu dia.">
            <ul className="grid gap-4 md:grid-cols-2">
              {PERFIS.map((p) => (
                <li key={p} className="rounded-xl border border-border p-4">
                  <p className="font-bold">{PERFIL_ROTULO[p]}</p>
                  <p className="mt-1 text-sm text-muted">{TELAS[p].telas}</p>
                  <ul className="mt-2 list-disc pl-5 text-sm">
                    {TELAS[p].acoes.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          </Secao>

          <Secao id="composicao" titulo={SECOES[2].titulo}>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 font-bold">Layout adotado</h3>
                <div aria-hidden className="grid h-52 grid-cols-[4.5rem_1fr] overflow-hidden rounded-xl border border-border text-[0.65rem] font-bold">
                  <div className="row-span-2 bg-sidebar p-2 text-sidebar-fg">Navegação global<div className="mt-2 flex flex-col gap-1">{[1, 2, 3, 4, 5].map((i) => <span key={i} className="h-2 rounded bg-white/25" />)}</div></div>
                  <div className="border-b border-border bg-surface p-2 text-muted">Barra superior: contexto · acessibilidade · usuário</div>
                  <div className="bg-bg p-2">
                    <p className="text-fg">Título da página + ação primária</p>
                    <div className="mt-2 grid grid-cols-4 gap-1">{[1, 2, 3, 4].map((i) => <span key={i} className="h-6 rounded bg-surface" />)}</div>
                    <div className="mt-1 grid grid-cols-[2fr_1fr] gap-1"><span className="h-16 rounded bg-surface" /><span className="h-16 rounded bg-surface" /></div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Leitura em “F”: contexto e título no topo, indicadores em linha, conteúdo principal à esquerda e apoio à direita.
                  Largura máxima de 80rem para linhas confortáveis.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-bold">Princípios de Gestalt aplicados</h3>
                <dl className="flex flex-col gap-2 text-sm">
                  {[
                    ['Proximidade', 'Campos agrupados em blocos (Identificação, Vigilância, Endereço); menu agrupado por etapa do trabalho.'],
                    ['Região comum', 'Cartões delimitam um assunto cada — como os blocos do Business Model Canvas.'],
                    ['Similaridade', 'Mesmo agravo = mesma sigla e cor em todas as telas; mesmo status = mesmo selo.'],
                    ['Continuidade', 'Assistente em etapas, trilha do caso (teste → confirmação → tratamento → desfecho) e linha do tempo.'],
                    ['Figura-fundo', 'Diálogos sobre fundo escurecido; barra lateral escura contra conteúdo claro.'],
                    ['Fechamento', 'Barras de progresso de completude e de estoque são lidas como “quanto falta”.'],
                    ['Pregnância', 'Uma única ação primária por tela, no canto superior direito ou na barra fixa inferior.'],
                  ].map(([t, d]) => (
                    <div key={t}>
                      <dt className="font-bold">{t}</dt>
                      <dd className="text-muted">{d}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <h3 className="mt-6 mb-2 font-bold">Recursos responsivos</h3>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              <li>• Mobile-first; pontos de quebra em 640, 768, 1024 e 1280px.</li>
              <li>• Barra lateral fixa em ≥ 1024px; abaixo disso vira gaveta com foco preso.</li>
              <li>• Tabelas viram cartões com pares rótulo/valor em telas pequenas — sem rolagem horizontal.</li>
              <li>• Grades 1 → 2 → 4 colunas para indicadores; quadro de casos rola horizontalmente.</li>
              <li>• Alvos de toque de no mínimo 44px; barra de ações fixa no rodapé do assistente.</li>
              <li>• Busca ativa pensada para o celular do ACS: telefone clicável, endereço em destaque.</li>
            </ul>
          </Secao>

          <Secao id="cores" titulo={SECOES[3].titulo} descricao="Valores lidos do tema ativo — troque para escuro ou alto contraste no menu Acessibilidade e veja a paleta mudar.">
            <Aviso tom="info" className="mb-5" titulo="Harmonia: complementar dividido">
              Azul-petróleo (institucional, calmo, associado à saúde; o mesmo tom do cabeçalho do BMC) é a base. O âmbar, próximo do
              complementar, marca atenção e identidade sem competir com o vermelho de perigo. Neutros frios mantêm a unidade.
              Contraste mínimo de 4,5:1 para textos e 3:1 para bordas de controles (WCAG 2.2 AA).
            </Aviso>
            <div className="flex flex-col gap-6">
              {TOKENS_COR.map((g) => (
                <div key={g.grupo}>
                  <h3 className="mb-2 font-bold">{g.grupo}</h3>
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {g.itens.map((i) => {
                      const hex = tokens[i.token]
                      const c = hex?.startsWith('#') && superficie.startsWith('#') ? contraste(hex, superficie) : null
                      return (
                        <li key={i.token} className="flex gap-3 rounded-xl border border-border p-3">
                          <span className="size-12 shrink-0 rounded-lg border border-border" style={{ background: `var(${i.token})` }} aria-hidden />
                          <span className="min-w-0 text-sm">
                            <span className="block font-bold">{i.nome}</span>
                            <span className="block font-mono text-xs text-muted">{i.token} · {hex}</span>
                            <span className="block text-xs text-muted">{i.uso}</span>
                            {c !== null && <span className="block text-xs font-bold">{c.toFixed(1)}:1 sobre superfície</span>}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">
              A paleta dos agravos foi verificada com um validador de daltonismo (deuteranopia, protanopia, tritanopia) nos modos claro
              e escuro. Como a separação entre alguns pares fica perto do limite, a cor nunca aparece sozinha: sempre vem com a sigla.
            </p>
          </Secao>

          <Secao id="tipografia" titulo={SECOES[4].titulo}>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-sm font-bold text-muted">Interface</p>
                <p className="text-3xl font-bold">Atkinson Hyperlegible</p>
                <p className="mt-1 text-sm text-muted">
                  Criada pelo Braille Institute para leitores com baixa visão: letras de formas bem distintas e aberturas amplas.
                  Em plantão, com pressa e tela pequena, confundir “1” com “l” num resultado não é aceitável.
                </p>
                <p className="mt-3 rounded-lg bg-surface-2 p-3 text-2xl" aria-label="Exemplo de caracteres ambíguos: I maiúsculo, l minúsculo, 1, O maiúsculo, 0">Il1 O0 rn m · 1:16</p>
              </div>
              <div>
                <p className="text-sm font-bold text-muted">Códigos (CNS, lote)</p>
                <p className="font-mono text-3xl font-bold">JetBrains Mono</p>
                <p className="mt-1 text-sm text-muted">Monoespaçada para conferir dígitos alinhados: CNS, CPF e números de lote.</p>
                <p className="mt-3 rounded-lg bg-surface-2 p-3 font-mono text-xl">700 4812 3390 0127</p>
              </div>
            </div>
            <h3 className="mt-6 mb-2 font-bold">Escala (base 16px, razão ≈ 1,2)</h3>
            <ul className="flex flex-col gap-2">
              {[
                ['text-3xl', '30px · título de página', 'font-bold'],
                ['text-2xl', '24px · título (mobile) / número de destaque', 'font-bold'],
                ['text-lg', '18px · título de cartão', 'font-bold'],
                ['text-base', '16px · texto corrido', ''],
                ['text-sm', '14px · rótulos, descrições, tabelas', ''],
                ['text-xs', '12px · metadados (uso mínimo)', ''],
              ].map(([c, r, p]) => (
                <li key={c} className="flex flex-wrap items-baseline gap-4 border-b border-border pb-2 last:border-0">
                  <span className="w-20 font-mono text-xs text-muted">{c}</span>
                  <span className={`${c} ${p}`}>{r}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">
              Dois pesos apenas (regular 400 e negrito 700), altura de linha 1,5, números tabulares em tabelas. O usuário pode ampliar
              todo o texto até 137,5% (A+), e o layout acompanha porque tudo é medido em rem.
            </p>
          </Secao>

          <Secao id="semiotica" titulo={SECOES[5].titulo} descricao="Uma biblioteca (Lucide, traço de 2px). Um conceito = um signo, sempre com rótulo em texto.">
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(Object.keys(ICONE) as NomeIcone[]).map((k) => {
                const I = ICONE[k]
                return (
                  <li key={k} className="flex items-start gap-3 rounded-xl border border-border p-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <I className="size-5" aria-hidden />
                    </span>
                    <span className="text-sm">{SIGNIFICADO_ICONE[k]}</span>
                  </li>
                )
              })}
            </ul>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div>
                <h3 className="mb-2 font-bold">Agravos: siglas</h3>
                <p className="mb-2 text-sm text-muted">Doenças não têm pictograma universal; a sigla é o signo que a equipe já usa.</p>
                <div className="flex flex-wrap gap-2">{AGRAVOS.map((a) => <AgravoBadge key={a} agravo={a} />)} <GestanteBadge /></div>
              </div>
              <div>
                <h3 className="mb-2 font-bold">Etapas do caso</h3>
                <div className="flex flex-wrap gap-2">{STATUS_CASO_ORDEM.map((s) => <StatusCasoBadge key={s} status={s} />)}</div>
              </div>
              <div>
                <h3 className="mb-2 font-bold">Prazos: cor + ícone + texto</h3>
                <div className="flex flex-wrap gap-2">
                  <PrazoBadge prazo={somarDias(hoje, 5)} diasRestantes={5} />
                  <PrazoBadge prazo={somarDias(hoje, 1)} diasRestantes={1} />
                  <PrazoBadge prazo={somarDias(hoje, -3)} diasRestantes={-3} />
                </div>
              </div>
            </div>
          </Secao>

          <Secao id="acessibilidade" titulo={SECOES[6].titulo} descricao="Meta: WCAG 2.2 nível AA.">
            <div className="grid gap-6 lg:grid-cols-2">
              <ul className="flex flex-col gap-2 text-sm">
                {[
                  'Link “Pular para o conteúdo” (primeiro Tab da página).',
                  'Navegação completa por teclado, foco visível em âmbar de 3px.',
                  'Estrutura semântica: landmarks, um h1 por página, tabelas com caption e cabeçalhos.',
                  'Rótulo visível em todo campo; erros ligados ao campo (aria-describedby) com ícone e texto.',
                  'Avisos anunciados por leitor de tela (aria-live) e foco movido ao conteúdo ao trocar de página.',
                  'Diálogos nativos com foco preso, Esc para fechar e foco devolvido à origem.',
                  'Abas com setas do teclado (padrão ARIA); gráficos com alternativa em tabela.',
                  'Informação nunca depende só de cor; contraste AA; modos escuro e alto contraste.',
                  'Texto ampliável até 137,5%, respeito a “reduzir movimento”, alvos de toque ≥ 44px.',
                  'Linguagem simples, confirmação antes de ações irreversíveis, aviso ao sair com dados não salvos.',
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <ICONE.ok className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3">
                <h3 className="font-bold">Teste agora</h3>
                <p className="text-sm text-muted">Pressione Tab para ver o foco. Use o menu “Acessibilidade” no topo para trocar tema, contraste e tamanho.</p>
                <div className="flex flex-wrap gap-2">
                  <Button>Ação primária</Button>
                  <Button variante="secundario">Secundária</Button>
                  <Button variante="fantasma">Fantasma</Button>
                  <Button variante="perigo">Perigo</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tom="sucesso" icone={ICONE.ok}>Concluído</Badge>
                  <Badge tom="atencao" icone={ICONE.atencao}>Atenção</Badge>
                  <Badge tom="perigo" icone={ICONE.erro}>Vencido</Badge>
                  <Badge tom="info" icone={ICONE.info}>Informação</Badge>
                </div>
              </div>
            </div>
          </Secao>
        </div>
      </div>
    </>
  )
}
