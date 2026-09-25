import { Download, PackageMinus, PackagePlus } from 'lucide-react'
import { useId, useState } from 'react'
import { usePode } from '@/app/sessao'
import { ICONE } from '@/components/icones'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Dialog } from '@/components/ui/Dialog'
import { Aviso, Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Feedback'
import { Field, Input, RadioCards, Select, Textarea } from '@/components/ui/Form'
import { Medidor, PageHeader } from '@/components/ui/Layout'
import { TabPanel, Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useBaixaLote, useEntradaLote, useEstoque, useFechamento, useMovimentacoes } from '@/data/hooks'
import { MOVIMENTACAO_ROTULO, TIPO_TESTE_ROTULO, TIPOS_TESTE } from '@/domain/rotulos'
import type { LoteInsumo, TipoMovimentacao, TipoTeste } from '@/domain/types'
import { diasEntre, formatarData, formatarMes, hojeISO, mesDe, somarDias } from '@/lib/datas'
import { cn } from '@/lib/cn'
import { plural } from '@/lib/texto'

type Aba = 'geral' | 'lotes' | 'movimentacoes' | 'fechamento'

function ValidadeBadge({ validade }: { validade: string }) {
  const d = diasEntre(hojeISO(), validade)
  if (d < 0) return <Badge tom="perigo" icone={ICONE.erro}>Vencido</Badge>
  if (d <= 30) return <Badge tom="atencao" icone={ICONE.atencao}>{d === 0 ? 'vence hoje' : `vence em ${plural(d, 'dia')}`}</Badge>
  return <span className="tabular">{formatarData(validade)}</span>
}

function DialogoEntrada({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const entrada = useEntradaLote()
  const toast = useToast()
  const [f, setF] = useState({ tipo: '' as TipoTeste | '', fabricante: '', lote: '', validade: '', quantidade: '' })
  const [erros, setErros] = useState<Record<string, string>>({})
  const salvar = async () => {
    const e: Record<string, string> = {}
    if (!f.tipo) e.tipo = 'Selecione o tipo de teste.'
    if (!f.fabricante.trim()) e.fabricante = 'Informe o fabricante.'
    if (!f.lote.trim()) e.lote = 'Informe o número do lote.'
    if (!f.validade) e.validade = 'Informe a validade.'
    else if (f.validade <= hojeISO()) e.validade = 'Lote vencido não pode entrar no estoque.'
    if (!(Number(f.quantidade) > 0)) e.quantidade = 'Informe a quantidade recebida.'
    setErros(e)
    if (Object.keys(e).length) return
    try {
      await entrada.mutateAsync({ tipo: f.tipo as TipoTeste, fabricante: f.fabricante, lote: f.lote, validade: f.validade, quantidade: Number(f.quantidade) })
      toast.sucesso(`Lote ${f.lote.toUpperCase()} registrado.`)
      setF({ tipo: '', fabricante: '', lote: '', validade: '', quantidade: '' })
      aoFechar()
    } catch (err) {
      toast.erro(err)
    }
  }
  return (
    <Dialog
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Registrar entrada de lote"
      descricao="Confira os dados na caixa do kit."
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar}>Cancelar</Button>
          <Button onClick={salvar} carregando={entrada.isPending}>Registrar entrada</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de teste" obrigatorio erro={erros.tipo} className="sm:col-span-2">
          <Select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as TipoTeste })}>
            <option value="">Selecione…</option>
            {TIPOS_TESTE.map((t) => <option key={t} value={t}>{TIPO_TESTE_ROTULO[t]}</option>)}
          </Select>
        </Field>
        <Field label="Fabricante" obrigatorio erro={erros.fabricante}>
          <Input value={f.fabricante} onChange={(e) => setF({ ...f, fabricante: e.target.value })} />
        </Field>
        <Field label="Número do lote" obrigatorio erro={erros.lote}>
          <Input className="tabular uppercase" value={f.lote} onChange={(e) => setF({ ...f, lote: e.target.value })} />
        </Field>
        <Field label="Validade" obrigatorio erro={erros.validade}>
          <Input type="date" min={somarDias(hojeISO(), 1)} value={f.validade} onChange={(e) => setF({ ...f, validade: e.target.value })} />
        </Field>
        <Field label="Quantidade (testes)" obrigatorio erro={erros.quantidade}>
          <Input type="number" inputMode="numeric" min={1} value={f.quantidade} onChange={(e) => setF({ ...f, quantidade: e.target.value })} />
        </Field>
      </div>
    </Dialog>
  )
}

function DialogoBaixa({ lote, aoFechar }: { lote: LoteInsumo | null; aoFechar: () => void }) {
  const baixa = useBaixaLote()
  const toast = useToast()
  const vencido = lote ? lote.validade < hojeISO() : false
  const [tipo, setTipo] = useState<'perda' | 'vencimento' | 'ajuste'>(vencido ? 'vencimento' : 'perda')
  const [qtd, setQtd] = useState(vencido ? String(lote?.quantidadeAtual ?? '') : '')
  const [motivo, setMotivo] = useState(vencido ? 'Lote vencido' : '')
  const [erro, setErro] = useState<string>()
  const salvar = async () => {
    const n = Number(qtd)
    if (!n) return setErro('Informe a quantidade.')
    if (!motivo.trim()) return setErro('Descreva o motivo.')
    try {
      await baixa.mutateAsync({ loteId: lote!.id, dados: { tipo, quantidade: n, motivo } })
      toast.sucesso('Estoque atualizado.')
      aoFechar()
    } catch (e) {
      toast.erro(e)
    }
  }
  return (
    <Dialog
      aberto={Boolean(lote)}
      aoFechar={aoFechar}
      titulo="Baixa ou ajuste de estoque"
      descricao={lote ? `${TIPO_TESTE_ROTULO[lote.tipo]}, lote ${lote.lote}, saldo de ${plural(lote.quantidadeAtual, 'unidade')}` : undefined}
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar}>Cancelar</Button>
          <Button variante={tipo === 'ajuste' ? 'primario' : 'perigo'} onClick={salvar} carregando={baixa.isPending}>Confirmar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {erro && <Aviso tom="perigo">{erro}</Aviso>}
        <RadioCards
          legenda="Tipo de movimentação"
          nome="tipo-baixa"
          valor={tipo}
          onChange={setTipo}
          opcoes={[
            { valor: 'perda', rotulo: 'Perda', descricao: 'Danificado, extraviado' },
            { valor: 'vencimento', rotulo: 'Vencimento', descricao: 'Baixa de vencidos' },
            { valor: 'ajuste', rotulo: 'Ajuste', descricao: 'Correção de inventário (+/−)' },
          ]}
        />
        <Field label="Quantidade" dica={tipo === 'ajuste' ? 'Use número negativo para reduzir o saldo.' : 'Unidades a retirar do saldo.'}>
          <Input type="number" inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} />
        </Field>
        <Field label="Motivo" obrigatorio>
          <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  )
}

function mesesRecentes(n = 7) {
  const atual = mesDe(hojeISO())
  const lista: string[] = []
  let d = `${atual}-01`
  for (let i = 0; i < n; i++) {
    lista.push(mesDe(d))
    d = somarDias(d, -1).slice(0, 7) + '-01'
  }
  return lista
}

export default function EstoquePage() {
  const podeGerir = usePode('estoque.gerir')
  const [aba, setAba] = useState<Aba>('geral')
  const idBase = useId()
  const { data, isLoading, error } = useEstoque()
  const [entradaAberta, setEntradaAberta] = useState(false)
  const [loteBaixa, setLoteBaixa] = useState<LoteInsumo | null>(null)
  const [tipoMov, setTipoMov] = useState<TipoMovimentacao | ''>('')
  const meses = mesesRecentes()
  const [mesMov, setMesMov] = useState(meses[0])
  const [mesFech, setMesFech] = useState(meses[1])
  const movs = useMovimentacoes({ tipo: tipoMov || undefined, mes: mesMov })
  const fech = useFechamento(mesFech)
  const [mostrarVazios, setMostrarVazios] = useState(false)

  const baixarCsv = () => {
    if (!fech.data) return
    const blob = new Blob(['﻿' + fech.data.csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sisloglab-${fech.data.ubs.cnes}-${mesFech}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        titulo="Estoque de testes rápidos"
        descricao="Saldo por lote em tempo real. Cada teste registrado baixa automaticamente o kit usado (FEFO)."
        acoes={podeGerir && <Button icone={PackagePlus} onClick={() => setEntradaAberta(true)}>Registrar entrada</Button>}
      />
      {isLoading && <Carregando />}
      {error && <EstadoErro erro={error} />}
      {data && (
        <Card>
          <CardBody className="pt-2">
            <Tabs
              rotulo="Seções do estoque"
              idBase={idBase}
              ativa={aba}
              onChange={setAba}
              abas={[
                { id: 'geral', rotulo: 'Visão geral', contagem: data.alertas.length || undefined },
                { id: 'lotes', rotulo: 'Lotes' },
                { id: 'movimentacoes', rotulo: 'Movimentações' },
                { id: 'fechamento', rotulo: 'Fechamento SISLOGLAB' },
              ]}
            />
            <TabPanel idBase={idBase} id={aba} className="pt-5 focus:outline-none">
              {aba === 'geral' && (
                <div className="flex flex-col gap-6">
                  {data.alertas.length > 0 && (
                    <section aria-labelledby="t-alertas">
                      <h2 id="t-alertas" className="mb-2 text-xl font-bold">
                        {plural(data.alertas.length, 'alerta')}
                      </h2>
                      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                        {data.alertas.map((a) => {
                          const grave = a.severidade === 'alta'
                          const Icone = grave ? ICONE.erro : ICONE.atencao
                          return (
                            <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                              <Icone className={cn('size-5 shrink-0', grave ? 'text-danger' : 'text-warning')} aria-hidden />
                              <p className="min-w-0 flex-1 basis-60">
                                <span className="sr-only">{grave ? 'Urgente: ' : 'Atenção: '}</span>
                                {a.mensagem}
                              </p>
                              {podeGerir && a.loteId && a.tipo === 'vencido' && (
                                <Button tamanho="sm" variante="secundario" icone={PackageMinus} onClick={() => setLoteBaixa(data.lotes.find((l) => l.id === a.loteId) ?? null)}>
                                  Dar baixa
                                </Button>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  )}
                  <section aria-labelledby="t-saldo">
                    <h2 id="t-saldo" className="mb-2 text-xl font-bold">
                      Saldo por teste
                    </h2>
                    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                      {data.resumo.map((r) => {
                        const tom = r.saldo === 0 ? 'perigo' : r.saldo < r.minimo ? 'atencao' : 'sucesso'
                        return (
                          <li key={r.tipo} className="grid gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1.2fr)_minmax(10rem,1.5fr)_minmax(7rem,0.8fr)_minmax(7rem,0.8fr)] lg:items-center">
                            <div className="flex items-baseline justify-between gap-3 sm:col-span-2 lg:col-span-1 lg:flex-col lg:items-start lg:gap-0.5">
                              <p className="font-bold">{TIPO_TESTE_ROTULO[r.tipo]}</p>
                              <p className="text-[1.563rem] leading-none font-bold tabular">
                                {r.saldo}
                                <span className="ml-1.5 text-sm font-normal text-muted">{r.saldo === 1 ? 'teste' : 'testes'}</span>
                              </p>
                            </div>
                            <div className="sm:col-span-2 lg:col-span-1">
                              <Medidor compacto rotulo={`Saldo de ${TIPO_TESTE_ROTULO[r.tipo]} em relação ao mínimo`} valor={Math.min(r.saldo, r.minimo * 2)} max={r.minimo * 2} tom={tom} texto={`${r.saldo} de mínimo ${r.minimo}`} />
                              <p className={cn('mt-1 text-sm', tom === 'sucesso' ? 'text-muted' : tom === 'perigo' ? 'text-danger' : 'text-warning')}>
                                {r.saldo === 0 ? 'Sem estoque' : r.saldo < r.minimo ? `Abaixo do mínimo de ${r.minimo}` : `Mínimo de ${r.minimo}`}
                              </p>
                            </div>
                            <div className="text-sm">
                              <p className="text-muted">Cobertura</p>
                              <p className="font-bold tabular">{r.coberturaDias === null ? 'Sem consumo' : plural(r.coberturaDias, 'dia')}</p>
                            </div>
                            <div className="text-sm">
                              <p className="text-muted">Próxima validade</p>
                              <p className="font-bold tabular">{r.proximaValidade ? formatarData(r.proximaValidade) : '—'}</p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                </div>
              )}

              {aba === 'lotes' && (
                <>
                  <label className="mb-3 flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={mostrarVazios} onChange={(e) => setMostrarVazios(e.target.checked)} />
                    Mostrar lotes esgotados
                  </label>
                  <DataTable
                    legenda="Lotes da UBS"
                    linhas={data.lotes.filter((l) => mostrarVazios || l.quantidadeAtual > 0)}
                    chave={(l) => l.id}
                    principal={(l) => <span className="font-bold">{TIPO_TESTE_ROTULO[l.tipo]}, lote {l.lote}</span>}
                    colunas={[
                      { chave: 'tipo', cabecalho: 'Teste', celula: (l) => TIPO_TESTE_ROTULO[l.tipo], ocultarMobile: true },
                      { chave: 'lote', cabecalho: 'Lote', celula: (l) => <span className="tabular">{l.lote}</span>, ocultarMobile: true },
                      { chave: 'fab', cabecalho: 'Fabricante', celula: (l) => l.fabricante },
                      { chave: 'val', cabecalho: 'Validade', celula: (l) => <ValidadeBadge validade={l.validade} /> },
                      { chave: 'saldo', cabecalho: 'Saldo', numerica: true, celula: (l) => `${l.quantidadeAtual} / ${l.quantidadeInicial}` },
                      ...(podeGerir
                        ? [{
                            chave: 'acoes',
                            cabecalho: <span className="sr-only">Ações</span>,
                            celula: (l: LoteInsumo) =>
                              l.quantidadeAtual > 0 ? (
                                <Button tamanho="sm" variante="fantasma" icone={PackageMinus} onClick={() => setLoteBaixa(l)} aria-label={`Baixa ou ajuste do lote ${l.lote}`}>
                                  Baixa/ajuste
                                </Button>
                              ) : null,
                          }]
                        : []),
                    ]}
                  />
                </>
              )}

              {aba === 'movimentacoes' && (
                <div className="flex flex-col gap-4">
                  <div className="grid max-w-xl gap-3 sm:grid-cols-2">
                    <Field label="Mês">
                      <Select value={mesMov} onChange={(e) => setMesMov(e.target.value)}>
                        {meses.map((m) => <option key={m} value={m}>{formatarMes(m)}</option>)}
                      </Select>
                    </Field>
                    <Field label="Tipo">
                      <Select value={tipoMov} onChange={(e) => setTipoMov(e.target.value as TipoMovimentacao | '')}>
                        <option value="">Todos</option>
                        {Object.entries(MOVIMENTACAO_ROTULO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                      </Select>
                    </Field>
                  </div>
                  {movs.isLoading ? (
                    <Carregando />
                  ) : (
                    <DataTable
                      legenda="Movimentações de estoque"
                      linhas={movs.data ?? []}
                      chave={(m) => m.mov.id}
                      vazio={<EstadoVazio icone={ICONE.estoque} titulo="Sem movimentações no filtro" />}
                      principal={(m) => <span className="font-bold">{MOVIMENTACAO_ROTULO[m.mov.tipo]} em {formatarData(m.mov.data.slice(0, 10))}</span>}
                      colunas={[
                        { chave: 'data', cabecalho: 'Data', celula: (m) => formatarData(m.mov.data.slice(0, 10)), className: 'tabular', ocultarMobile: true },
                        { chave: 'tipo', cabecalho: 'Tipo', celula: (m) => MOVIMENTACAO_ROTULO[m.mov.tipo], ocultarMobile: true },
                        { chave: 'item', cabecalho: 'Lote', celula: (m) => m.lote ? <>{TIPO_TESTE_ROTULO[m.lote.tipo]}, lote <span className="tabular">{m.lote.lote}</span></> : '—' },
                        { chave: 'qtd', cabecalho: 'Qtd.', numerica: true, celula: (m) => <span className={m.mov.quantidade > 0 ? 'text-success' : ''}>{m.mov.quantidade > 0 ? `+${m.mov.quantidade}` : `−${Math.abs(m.mov.quantidade)}`}</span> },
                        { chave: 'quem', cabecalho: 'Responsável', celula: (m) => m.usuarioNome },
                        { chave: 'motivo', cabecalho: 'Motivo', celula: (m) => m.mov.motivo ?? (m.mov.testagemId ? 'Testagem' : '—') },
                      ]}
                    />
                  )}
                </div>
              )}

              {aba === 'fechamento' && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <Field label="Mês de referência" className="w-64">
                      <Select value={mesFech} onChange={(e) => setMesFech(e.target.value)}>
                        {meses.map((m) => <option key={m} value={m}>{formatarMes(m)}</option>)}
                      </Select>
                    </Field>
                    <Button variante="secundario" icone={Download} onClick={baixarCsv} disabled={!fech.data}>
                      Baixar CSV para o SISLOGLAB
                    </Button>
                  </div>
                  <Aviso tom="info">
                    Quantitativos agregados por kit no formato do boletim mensal. Os números são calculados das testagens e
                    movimentações — sem contagem manual.
                  </Aviso>
                  {fech.data && (
                    <Card>
                      <CardHeader titulo={`${fech.data.ubs.nome}, ${formatarMes(mesFech).toLowerCase()}`} descricao={`CNES ${fech.data.ubs.cnes}`} />
                      <CardBody>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[44rem] text-sm">
                            <caption className="sr-only">Fechamento mensal do estoque</caption>
                            <thead>
                              <tr className="border-b border-border text-left text-muted">
                                {['Insumo', 'Estoque inicial', 'Entradas', 'Testes realizados', 'Perdas', 'Vencidos', 'Ajustes', 'Estoque final', 'Reagentes'].map((h, i) => (
                                  <th key={h} scope="col" className={i ? 'px-2 py-2 text-right font-bold' : 'py-2 pr-2 font-bold'}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {fech.data.linhas.map((l) => (
                                <tr key={l.tipo} className="border-b border-border last:border-0">
                                  <th scope="row" className="py-2 pr-2 text-left font-bold">{TIPO_TESTE_ROTULO[l.tipo]}</th>
                                  {[l.estoqueInicial, l.entradas, l.consumo, l.perdas, l.vencidos, l.ajustes, l.estoqueFinal, l.reagentes].map((v, i) => (
                                    <td key={i} className="px-2 py-2 text-right tabular">{v}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardBody>
                    </Card>
                  )}
                </div>
              )}
            </TabPanel>
          </CardBody>
        </Card>
      )}
      <DialogoEntrada aberto={entradaAberta} aoFechar={() => setEntradaAberta(false)} />
      {loteBaixa && <DialogoBaixa key={loteBaixa.id} lote={loteBaixa} aoFechar={() => setLoteBaixa(null)} />}
    </>
  )
}
