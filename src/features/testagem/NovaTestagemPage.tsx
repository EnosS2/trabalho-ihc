import { ArrowLeft, ArrowRight, Search, Undo2, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ICONE } from '@/components/icones'
import { AgravoBadge, Badge, GestanteBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Aviso, Carregando, EstadoVazio } from '@/components/ui/Feedback'
import { Checkbox, Field, Input, RadioCards, Select, Textarea } from '@/components/ui/Form'
import { PageHeader, Stepper } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import type { Caso, Pessoa, ResultadoTR, Testagem, TipoTeste } from '@/domain/types'
import { usePessoa, usePessoas, useLotesTestagem, useRegistrarTestagem, useSalvarPessoa } from '@/data/hooks'
import { interpretarTestagem, testagemConcluida } from '@/domain/rules/fluxograma'
import { mascararDocumento } from '@/domain/rules/documentos'
import {
  AGRAVO_ROTULO,
  AGRAVOS,
  CONCLUSAO_ROTULO,
  MOTIVO_ROTULO,
  RESULTADO_TR_ROTULO,
  TIPO_TESTE_AGRAVO,
  TIPO_TESTE_ROTULO,
} from '@/domain/rotulos'
import type { Agravo, InterpretacaoAgravo, MotivoTestagem } from '@/domain/types'
import { formatarData, semanasGestacao } from '@/lib/datas'
import { cn } from '@/lib/cn'
import { PessoaFormulario } from '@/features/pessoas/PessoaFormulario'

const PASSOS = ['Pessoa', 'Contexto', 'Testes', 'Conduta']

interface TesteLocal {
  tipo: TipoTeste
  loteId: string
  resultado: ResultadoTR
}

// ---------- Passo 1: pessoa ----------

function PassoPessoa({ selecionada, aoSelecionar }: { selecionada?: Pessoa; aoSelecionar: (p: Pessoa) => void }) {
  const [termo, setTermo] = useState('')
  const [atraso, setAtraso] = useState('')
  const [cadastrando, setCadastrando] = useState(false)
  const { data, isFetching } = usePessoas(atraso)
  const salvar = useSalvarPessoa()
  const toast = useToast()

  useEffect(() => {
    const t = setTimeout(() => setAtraso(termo), 250)
    return () => clearTimeout(t)
  }, [termo])

  return (
    <Card>
      <CardHeader
        titulo="Quem será testado?"
        descricao="Busque pelo nome, CNS ou CPF. Evite cadastros duplicados."
        icone={<ICONE.pessoas className="size-5" aria-hidden />}
        acoes={
          <Button variante="secundario" icone={UserPlus} onClick={() => setCadastrando(true)}>
            Cadastrar nova pessoa
          </Button>
        }
      />
      <CardBody className="flex flex-col gap-4">
        <Field label="Buscar pessoa" dica="Digite ao menos 3 letras do nome ou 4 dígitos do documento.">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <Input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} className="pl-10" autoFocus />
          </div>
        </Field>
        <div aria-live="polite" className="sr-only">
          {data ? `${data.length} pessoa(s) encontrada(s)` : ''}
        </div>
        {isFetching && !data && <Carregando />}
        {data && data.length === 0 && (
          <EstadoVazio
            icone={ICONE.pessoas}
            titulo="Ninguém encontrado"
            descricao="Confira a grafia ou cadastre a pessoa."
            acao={
              <Button icone={UserPlus} onClick={() => setCadastrando(true)}>
                Cadastrar nova pessoa
              </Button>
            }
          />
        )}
        {data && data.length > 0 && (
          <fieldset>
            <legend className="sr-only">Resultados da busca</legend>
            <ul className="flex flex-col gap-2">
              {data.slice(0, 8).map(({ pessoa, idade, casosAtivos, ultimaTestagem }) => {
                const sel = selecionada?.id === pessoa.id
                return (
                  <li key={pessoa.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 hover:bg-surface-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus',
                        sel ? 'border-primary bg-primary-soft' : 'border-border',
                      )}
                    >
                      <input
                        type="radio"
                        name="pessoa"
                        checked={sel}
                        onChange={() => aoSelecionar(pessoa)}
                        className="size-4 accent-[var(--primary)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 font-bold">
                          {pessoa.nomeSocial ?? pessoa.nome}
                          {pessoa.gestante && <GestanteBadge />}
                          {casosAtivos > 0 && (
                            <Badge tom="info" icone={ICONE.seguimento}>
                              {casosAtivos} caso(s) em seguimento
                            </Badge>
                          )}
                        </span>
                        <span className="block text-sm text-muted">
                          {idade} anos · CNS {mascararDocumento(pessoa.cns)} · CPF {mascararDocumento(pessoa.cpf)}
                          {ultimaTestagem ? ` · última testagem ${formatarData(ultimaTestagem)}` : ''}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        )}
      </CardBody>
      <Dialog aberto={cadastrando} aoFechar={() => setCadastrando(false)} titulo="Cadastrar pessoa" largura="lg">
        <PessoaFormulario
          rotuloSalvar="Cadastrar e selecionar"
          salvando={salvar.isPending}
          aoCancelar={() => setCadastrando(false)}
          aoSalvar={async (dados) => {
            try {
              const p = await salvar.mutateAsync({ dados })
              toast.sucesso(`${p.nome} cadastrada(o).`)
              aoSelecionar(p)
              setCadastrando(false)
            } catch (e) {
              toast.erro(e)
            }
          }}
        />
      </Dialog>
    </Card>
  )
}

// ---------- Passo 3: testes guiados ----------

function PainelAgravo({
  agravo,
  interpretacao,
  testes,
  lotes,
  usoPorLote,
  aoRegistrar,
  aoDesfazer,
}: {
  agravo: Agravo
  interpretacao: InterpretacaoAgravo
  testes: TesteLocal[]
  lotes: ReturnType<typeof useLotesTestagem>['data']
  usoPorLote: Map<string, number>
  aoRegistrar: (t: TesteLocal) => void
  aoDesfazer: () => void
}) {
  const proximo = interpretacao.proximoTeste
  const opcoes = lotes?.find((l) => l.tipo === proximo)
  const disponiveis = (opcoes?.disponiveis ?? []).filter((l) => l.quantidadeAtual - (usoPorLote.get(l.id) ?? 0) > 0)
  const [loteId, setLoteId] = useState('')
  const [resultado, setResultado] = useState<ResultadoTR>()
  const [erro, setErro] = useState<string>()
  const loteEfetivo = disponiveis.some((l) => l.id === loteId) ? loteId : (disponiveis[0]?.id ?? '')
  const doAgravo = testes.filter((t) => TIPO_TESTE_AGRAVO[t.tipo] === agravo)

  const tomConclusao =
    interpretacao.conclusao === 'reagente' || (interpretacao.conclusao === 'discordante' && !proximo)
      ? 'perigo'
      : interpretacao.conclusao === 'nao_reagente'
        ? 'sucesso'
        : 'atencao'

  return (
    <Card aria-labelledby={`ag-${agravo}`}>
      <CardHeader
        id={`ag-${agravo}`}
        titulo={
          <span className="flex items-center gap-2">
            <AgravoBadge agravo={agravo} /> {AGRAVO_ROTULO[agravo]}
          </span>
        }
        acoes={
          proximo ? (
            <Badge tom="info" icone={ICONE.aguardando}>
              Em andamento
            </Badge>
          ) : (
            <Badge tom={tomConclusao === 'sucesso' ? 'sucesso' : 'perigo'} icone={tomConclusao === 'sucesso' ? ICONE.ok : ICONE.atencao}>
              {CONCLUSAO_ROTULO[interpretacao.conclusao]}
            </Badge>
          )
        }
      />
      <CardBody className="flex flex-col gap-4">
        {doAgravo.length > 0 && (
          <div>
            <h4 className="mb-1 text-sm font-bold text-muted">Testes realizados</h4>
            <ol className="flex flex-col gap-1">
              {doAgravo.map((t, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="tabular text-muted">{i + 1}.</span>
                  <span className="font-bold">{TIPO_TESTE_ROTULO[t.tipo]}</span>
                  <span>→</span>
                  <Badge tom={t.resultado === 'reagente' ? 'perigo' : t.resultado === 'nao_reagente' ? 'sucesso' : 'atencao'}>
                    {RESULTADO_TR_ROTULO[t.resultado]}
                  </Badge>
                  <span className="font-mono text-xs text-muted">
                    lote {lotes?.flatMap((l) => l.disponiveis).find((l) => l.id === t.loteId)?.lote ?? '—'}
                  </span>
                </li>
              ))}
            </ol>
            <button type="button" onClick={aoDesfazer} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              <Undo2 className="size-4" aria-hidden /> Desfazer último teste
            </button>
          </div>
        )}

        {proximo ? (
          <div className="flex flex-col gap-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary-soft/40 p-4">
            <p className="font-bold">
              {doAgravo.length === 0 ? 'Registrar' : 'Próximo passo do fluxograma'}: {TIPO_TESTE_ROTULO[proximo]}
            </p>
            {doAgravo.length > 0 && <p className="-mt-3 text-sm text-muted">{interpretacao.mensagem}</p>}
            {disponiveis.length === 0 ? (
              <Aviso tom="perigo" titulo="Sem kit disponível">
                Não há lote válido de {TIPO_TESTE_ROTULO[proximo]} nesta UBS. Registre a entrada de estoque ou encaminhe
                a pessoa.
              </Aviso>
            ) : (
              <>
                <Field label="Lote utilizado" dica="Sugerido: o que vence primeiro (FEFO).">
                  <Select value={loteEfetivo} onChange={(e) => setLoteId(e.target.value)}>
                    {disponiveis.map((l, i) => (
                      <option key={l.id} value={l.id}>
                        {l.lote} · {l.fabricante} · validade {formatarData(l.validade)} ·{' '}
                        {l.quantidadeAtual - (usoPorLote.get(l.id) ?? 0)} un.{i === 0 ? ' (sugerido)' : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
                <RadioCards
                  legenda="Resultado da leitura"
                  nome={`res-${agravo}-${doAgravo.length}`}
                  valor={resultado}
                  onChange={(v) => {
                    setResultado(v)
                    setErro(undefined)
                  }}
                  erro={erro}
                  opcoes={[
                    { valor: 'nao_reagente', rotulo: 'Não reagente', descricao: 'Só a linha de controle (C)', classeSelecionado: 'border-success bg-success-soft' },
                    { valor: 'reagente', rotulo: 'Reagente', descricao: 'Linhas de controle e teste (C + T)', classeSelecionado: 'border-danger bg-danger-soft' },
                    { valor: 'invalido', rotulo: 'Inválido', descricao: 'Sem linha de controle', classeSelecionado: 'border-warning bg-warning-soft' },
                  ]}
                />
                <div>
                  <Button
                    onClick={() => {
                      if (!resultado) {
                        setErro('Selecione o resultado lido no dispositivo.')
                        return
                      }
                      aoRegistrar({ tipo: proximo, loteId: loteEfetivo, resultado })
                      setResultado(undefined)
                    }}
                    icone={ICONE.ok}
                  >
                    Confirmar resultado
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Aviso tom={tomConclusao} titulo={interpretacao.titulo}>
            <p>{interpretacao.mensagem}</p>
          </Aviso>
        )}
      </CardBody>
    </Card>
  )
}

// ---------- Página ----------

export default function NovaTestagemPage() {
  const [params] = useSearchParams()
  const pessoaInicial = usePessoa(params.get('pessoa') ?? undefined)
  const navegar = useNavigate()
  const toast = useToast()
  const lotes = useLotesTestagem()
  const registrar = useRegistrarTestagem()

  const [passo, setPasso] = useState(0)
  const [pessoa, setPessoa] = useState<Pessoa>()
  const [motivo, setMotivo] = useState<MotivoTestagem | ''>('')
  const [gestante, setGestante] = useState(false)
  const [ig, setIg] = useState('')
  const [exposicao, setExposicao] = useState(false)
  const [agravos, setAgravos] = useState<Agravo[]>([...AGRAVOS])
  const [testes, setTestes] = useState<TesteLocal[]>([])
  const [doseAplicada, setDoseAplicada] = useState<'sim' | 'nao'>()
  const [observacoes, setObservacoes] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [concluida, setConcluida] = useState<{ testagem: Testagem; casos: Caso[] }>()

  useEffect(() => {
    if (pessoaInicial.data && !pessoa) selecionarPessoa(pessoaInicial.data.pessoa)
  }, [pessoaInicial.data]) // eslint-disable-line react-hooks/exhaustive-deps

  function reiniciar() {
    setPasso(0)
    setPessoa(undefined)
    setMotivo('')
    setGestante(false)
    setIg('')
    setExposicao(false)
    setAgravos([...AGRAVOS])
    setTestes([])
    setDoseAplicada(undefined)
    setObservacoes('')
    setErros({})
    setConcluida(undefined)
    navegar('/testagem/nova', { replace: true })
  }

  function selecionarPessoa(p: Pessoa) {
    setPessoa(p)
    setGestante(p.gestante && p.sexo === 'F')
    setIg(p.gestante && p.dum ? String(semanasGestacao(p.dum)) : '')
    if (p.gestante) setMotivo('pre_natal')
  }

  const interpretacoes = useMemo(
    () =>
      interpretarTestagem(
        agravos,
        testes.map((t, i) => ({ ...t, ordem: i + 1 })),
        { gestante, exposicaoRecente: exposicao },
      ),
    [agravos, testes, gestante, exposicao],
  )
  const usoPorLote = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of testes) m.set(t.loteId, (m.get(t.loteId) ?? 0) + 1)
    return m
  }, [testes])
  const fluxoCompleto = testagemConcluida(interpretacoes)
  const sifilisGestanteReagente = gestante && interpretacoes.some((i) => i.agravo === 'sifilis' && i.conclusao === 'reagente')
  const abreCasos = interpretacoes.filter((i) => i.abreCaso)

  // Impede sair sem querer com testes já lidos (prevenção de perda de dados).
  useEffect(() => {
    if (testes.length === 0 || concluida) return
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [testes.length, concluida])

  function avancar() {
    const e: Record<string, string> = {}
    if (passo === 0 && !pessoa) e.pessoa = 'Selecione ou cadastre a pessoa.'
    if (passo === 1) {
      if (!motivo) e.motivo = 'Informe o motivo da testagem.'
      if (agravos.length === 0) e.agravos = 'Selecione ao menos um agravo.'
      if (gestante && ig && (Number(ig) < 1 || Number(ig) > 42)) e.ig = 'Idade gestacional entre 1 e 42 semanas.'
    }
    if (passo === 2 && !fluxoCompleto) e.testes = 'Conclua o fluxograma de todos os agravos antes de avançar.'
    setErros(e)
    if (Object.keys(e).length === 0) {
      setPasso((p) => p + 1)
      window.scrollTo({ top: 0 })
    } else {
      toast.erro(Object.values(e)[0])
    }
  }

  async function finalizar() {
    if (sifilisGestanteReagente && !doseAplicada) {
      setErros({ dose: 'Informe se a 1ª dose foi aplicada.' })
      return
    }
    try {
      const r = await registrar.mutateAsync({
        pessoaId: pessoa!.id,
        motivo: motivo as MotivoTestagem,
        gestante,
        idadeGestacionalSemanas: gestante && ig ? Number(ig) : undefined,
        exposicaoRecente: exposicao,
        agravos,
        testes,
        observacoes: observacoes || undefined,
        primeiraDoseSifilisAplicada: doseAplicada === 'sim',
      })
      setConcluida(r)
      toast.sucesso('Testagem registrada. Estoque atualizado.')
      window.scrollTo({ top: 0 })
    } catch (e) {
      toast.erro(e)
    }
  }

  if (concluida) {
    return (
      <>
        <PageHeader titulo="Testagem registrada" />
        <Card className="mx-auto max-w-2xl">
          <CardBody className="flex flex-col items-center gap-4 pt-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
              <ICONE.ok className="size-9" aria-hidden />
            </span>
            <p className="text-xl font-bold">Testagem de {pessoa?.nome} salva.</p>
            <p className="text-muted">
              {concluida.testagem.testes.length} dispositivo(s) baixado(s) do estoque.{' '}
              {concluida.casos.length > 0
                ? `${concluida.casos.length} caso(s) aberto(s) para seguimento — os prazos já estão no painel.`
                : 'Nenhum caso precisou ser aberto.'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {concluida.casos.map((c) => (
                <LinkButton key={c.id} to={`/seguimento/${c.id}`} icone={ICONE.seguimento}>
                  Abrir caso de {AGRAVO_ROTULO[c.agravo]}
                </LinkButton>
              ))}
              <LinkButton to={`/testagens/${concluida.testagem.id}`} variante="secundario">
                Ver comprovante
              </LinkButton>
              <Button variante="secundario" icone={ICONE.novaTestagem} onClick={reiniciar}>
                Nova testagem
              </Button>
            </div>
          </CardBody>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        titulo="Nova testagem"
        descricao="O sistema segue o fluxograma do Ministério da Saúde e indica o próximo teste e a conduta."
        trilha={[{ rotulo: 'Painel', para: '/' }, { rotulo: 'Nova testagem' }]}
      />
      <div className="mb-6">
        <Stepper passos={PASSOS} atual={passo} />
      </div>

      {pessoa && passo > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
          <ICONE.pessoas className="size-4 text-muted" aria-hidden />
          <span className="font-bold">{pessoa.nome}</span>
          {gestante && <GestanteBadge />}
          {motivo && <span className="text-muted">· {MOTIVO_ROTULO[motivo]}</span>}
          <button type="button" className="ml-auto font-bold text-primary hover:underline" onClick={() => setPasso(0)}>
            Trocar pessoa
          </button>
        </div>
      )}

      {passo === 0 && <PassoPessoa selecionada={pessoa} aoSelecionar={selecionarPessoa} />}

      {passo === 1 && pessoa && (
        <Card>
          <CardHeader titulo="Contexto da testagem" icone={<ICONE.info className="size-5" aria-hidden />} />
          <CardBody className="flex flex-col gap-5">
            <Field label="Motivo" obrigatorio erro={erros.motivo}>
              <Select value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoTestagem)}>
                <option value="">Selecione…</option>
                {Object.entries(MOTIVO_ROTULO).map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            {pessoa.sexo === 'F' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Checkbox
                  label="Gestante"
                  descricao="Altera a conduta: sífilis reagente é tratada hoje."
                  checked={gestante}
                  onChange={(e) => setGestante(e.target.checked)}
                />
                {gestante && (
                  <Field label="Idade gestacional (semanas)" erro={erros.ig} dica={pessoa.dum ? `Calculada pela DUM (${formatarData(pessoa.dum)}).` : undefined}>
                    <Input type="number" inputMode="numeric" min={1} max={42} value={ig} onChange={(e) => setIg(e.target.value)} />
                  </Field>
                )}
              </div>
            )}
            <Checkbox
              label="Exposição de risco nos últimos 30 dias"
              descricao="Ativa o alerta de janela imunológica para resultados não reagentes."
              checked={exposicao}
              onChange={(e) => setExposicao(e.target.checked)}
            />
            <fieldset>
              <legend className="mb-2 text-sm font-bold">
                Agravos a testar <span className="text-danger" aria-hidden>*</span>
              </legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {AGRAVOS.map((a) => (
                  <label
                    key={a}
                    className={cn(
                      'flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-2 p-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus',
                      agravos.includes(a) ? 'border-primary bg-primary-soft' : 'border-border',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-5 accent-[var(--primary)]"
                      checked={agravos.includes(a)}
                      disabled={testes.some((t) => TIPO_TESTE_AGRAVO[t.tipo] === a)}
                      onChange={(e) => setAgravos((xs) => (e.target.checked ? AGRAVOS.filter((x) => xs.includes(x) || x === a) : xs.filter((x) => x !== a)))}
                    />
                    <AgravoBadge agravo={a} />
                    <span className="font-bold">{AGRAVO_ROTULO[a]}</span>
                  </label>
                ))}
              </div>
              {erros.agravos && <p className="mt-1 text-sm font-bold text-danger">{erros.agravos}</p>}
              {(motivo === 'pre_natal' || motivo === 'parceria_gestante') && agravos.length < 4 && (
                <Aviso tom="atencao" className="mt-3">
                  No pré-natal e para parcerias de gestantes, recomenda-se testar os quatro agravos.
                </Aviso>
              )}
            </fieldset>
          </CardBody>
        </Card>
      )}

      {passo === 2 && (
        <div className="flex flex-col gap-4">
          {lotes.isLoading && <Carregando texto="Consultando estoque…" />}
          <div className="grid gap-4 2xl:grid-cols-2">
            {interpretacoes.map((i) => (
              <PainelAgravo
                key={i.agravo}
                agravo={i.agravo}
                interpretacao={i}
                testes={testes}
                lotes={lotes.data}
                usoPorLote={usoPorLote}
                aoRegistrar={(t) => setTestes((xs) => [...xs, t])}
                aoDesfazer={() =>
                  setTestes((xs) => {
                    const idx = xs.map((t) => TIPO_TESTE_AGRAVO[t.tipo]).lastIndexOf(i.agravo)
                    return xs.filter((_, k) => k !== idx)
                  })
                }
              />
            ))}
          </div>
          {erros.testes && !fluxoCompleto && <Aviso tom="perigo">{erros.testes}</Aviso>}
        </div>
      )}

      {passo === 3 && (
        <div className="flex flex-col gap-4">
          {sifilisGestanteReagente && (
            <Card className="border-2 border-danger">
              <CardHeader
                titulo="Gestante com sífilis: tratar hoje"
                descricao="Nota Técnica CAIST/SMS — não aguardar o confirmatório."
                icone={<ICONE.gestante className="size-5 text-danger" aria-hidden />}
              />
              <CardBody>
                <RadioCards
                  legenda="A 1ª dose de benzilpenicilina benzatina 2.400.000 UI foi aplicada agora?"
                  nome="dose"
                  valor={doseAplicada}
                  onChange={(v) => {
                    setDoseAplicada(v)
                    setErros({})
                  }}
                  colunas={2}
                  erro={erros.dose}
                  opcoes={[
                    { valor: 'sim', rotulo: 'Sim, aplicada', descricao: '2ª e 3ª doses serão agendadas automaticamente.', classeSelecionado: 'border-success bg-success-soft' },
                    { valor: 'nao', rotulo: 'Não foi possível', descricao: 'Fica pendência vencida para hoje.', classeSelecionado: 'border-danger bg-danger-soft' },
                  ]}
                />
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader titulo="Resumo e condutas" icone={<ICONE.testagens className="size-5" aria-hidden />} />
            <CardBody className="flex flex-col gap-4">
              {interpretacoes.map((i) => (
                <div key={i.agravo} className="rounded-xl border border-border p-4">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <AgravoBadge agravo={i.agravo} /> {i.titulo}
                    {i.abreCaso && (
                      <Badge tom="info" icone={ICONE.seguimento}>
                        Abrirá caso de seguimento
                      </Badge>
                    )}
                  </p>
                  <ul className="mt-2 list-disc pl-5 text-sm">
                    {i.condutas.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              ))}
              {abreCasos.length > 0 && (
                <Aviso tom="info" titulo="O que acontece ao finalizar">
                  {abreCasos.length} caso(s) serão abertos com prazos de coleta, tratamento e notificação. Se a pessoa não
                  voltar no prazo, o ACS da microárea recebe a busca ativa.
                </Aviso>
              )}
              <Field label="Observações" dica="Não registre informações que não sejam necessárias ao cuidado.">
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} maxLength={500} />
              </Field>
            </CardBody>
          </Card>
        </div>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-between gap-2 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {passo > 0 ? (
          <Button variante="secundario" icone={ArrowLeft} onClick={() => setPasso((p) => p - 1)}>
            Voltar
          </Button>
        ) : (
          <Link to="/" className="font-bold text-primary hover:underline">
            Cancelar
          </Link>
        )}
        {passo < 3 ? (
          <Button iconeDireita={ArrowRight} onClick={avancar} disabled={passo === 2 && !fluxoCompleto}>
            {passo === 2 && !fluxoCompleto ? 'Conclua os testes' : 'Continuar'}
          </Button>
        ) : (
          <Button icone={ICONE.ok} onClick={finalizar} carregando={registrar.isPending} tamanho="lg">
            Finalizar testagem
          </Button>
        )}
      </div>
    </>
  )
}
