import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { usePode } from '@/app/sessao'
import { ICONE } from '@/components/icones'
import { GraficoBarras } from '@/components/graficos/GraficoBarras'
import { AgravoBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Carregando, EstadoErro } from '@/components/ui/Feedback'
import { Field, Segmented, Select } from '@/components/ui/Form'
import { Medidor, PageHeader, Resumo, Stat } from '@/components/ui/Layout'
import { useIndicadores, useReferencias } from '@/data/hooks'
import type { Indicadores, Proporcao } from '@/domain/rules/indicadores'
import { AGRAVO_ROTULO } from '@/domain/rotulos'
import { formatarMesCurto, hojeISO, somarDias } from '@/lib/datas'
import { plural } from '@/lib/texto'

const pct = (p: Proporcao) => (p.pct === null ? '—' : `${p.pct.toLocaleString('pt-BR')}%`)

type Metrica = 'coletaNoPrazo' | 'tratamentoIniciado' | 'gestanteSifilisTratadaMesmoDia' | 'notificacoesNoPrazo' | 'notificacoesCompletas'
const METRICAS: Record<Metrica, string> = {
  coletaNoPrazo: 'Coleta do confirmatório no prazo',
  tratamentoIniciado: 'Tratamento iniciado',
  gestanteSifilisTratadaMesmoDia: 'Gestante com sífilis tratada no mesmo dia',
  notificacoesNoPrazo: 'Notificações enviadas no prazo',
  notificacoesCompletas: 'Notificações 100% completas',
}

function Cascata({ i }: { i: Indicadores }) {
  const linhas: { rotulo: string; p: Proporcao; dica: string }[] = [
    { rotulo: METRICAS.coletaNoPrazo, p: i.coletaNoPrazo, dica: 'Casos que coletaram o exame confirmatório em até 7 dias.' },
    { rotulo: METRICAS.tratamentoIniciado, p: i.tratamentoIniciado, dica: 'Entre casos confirmados e gestantes com sífilis.' },
    { rotulo: METRICAS.gestanteSifilisTratadaMesmoDia, p: i.gestanteSifilisTratadaMesmoDia, dica: 'Nota Técnica CAIST/SMS: tratar no dia do teste.' },
    { rotulo: 'Gestante com sífilis com 3 doses', p: i.gestanteSifilisTratamentoCompleto, dica: 'Tratamento adequado para prevenir sífilis congênita.' },
    { rotulo: METRICAS.notificacoesNoPrazo, p: i.notificacoesNoPrazo, dica: 'Enviadas em até 7 dias do momento em que o caso se tornou notificável.' },
    { rotulo: METRICAS.notificacoesCompletas, p: i.notificacoesCompletas, dica: 'Sem campos ignorados ou em branco.' },
  ]
  return (
    <ul className="flex flex-col gap-4">
      {linhas.map((l) => (
        <li key={l.rotulo}>
          <Medidor
            rotulo={l.rotulo}
            valor={l.p.pct ?? 0}
            texto={l.p.pct === null ? 'sem casos' : `${pct(l.p)} (${l.p.num} de ${l.p.den})`}
            tom={l.p.pct === null ? 'neutro' : l.p.pct >= 80 ? 'sucesso' : l.p.pct >= 60 ? 'atencao' : 'perigo'}
          />
          <p className="mt-0.5 text-xs text-muted">{l.dica}</p>
        </li>
      ))}
      <li className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-sm">
        <span>
          {i.medianaDiasConfirmacao === null ? (
            'Ainda sem resultado confirmatório no período'
          ) : (
            <>
              Mediana até o resultado confirmatório: <strong>{plural(i.medianaDiasConfirmacao, 'dia')}</strong>
            </>
          )}
        </span>
        <span>
          {i.perdaSeguimento.pct === null ? (
            'Nenhum caso encerrado no período'
          ) : (
            <>
              Perda de seguimento: <strong>{pct(i.perdaSeguimento)}</strong> dos casos encerrados
            </>
          )}
        </span>
      </li>
    </ul>
  )
}

export default function IndicadoresPage() {
  const rede = usePode('indicadores.rede')
  const refs = useReferencias()
  const [dias, setDias] = useState<'30' | '90' | '180'>('90')
  const [territorioId, setTerritorioId] = useState('')
  const [ubsId, setUbsId] = useState('')
  const [metrica, setMetrica] = useState<Metrica>('coletaNoPrazo')
  const hoje = hojeISO()
  const { data, isLoading, error, isFetching } = useIndicadores({
    inicio: somarDias(hoje, -Number(dias)),
    fim: hoje,
    territorioId: territorioId || undefined,
    ubsId: ubsId || undefined,
  })
  const ubsDoTerritorio = refs.data?.ubs.filter((u) => !territorioId || u.territorioId === territorioId) ?? []

  const comparacao = useMemo(() => {
    if (!data) return []
    return [...data.porUbs]
      .map((u) => ({ rotulo: u.ubs.nome.replace('UBS ', ''), p: u.indicadores[metrica] }))
      .sort((a, b) => (b.p.pct ?? -1) - (a.p.pct ?? -1))
      .map((x) => ({ rotulo: x.rotulo, valor: x.p.pct, detalhe: `${x.p.num} de ${x.p.den}` }))
  }, [data, metrica])

  const exportar = () => {
    if (!data) return
    const cab = ['Coordenadoria', 'UBS', 'Testagens', ...Object.values(METRICAS), 'Positividade sífilis (%)']
    const linhas = data.porUbs.map((u) => [
      u.territorio.nome,
      u.ubs.nome,
      u.indicadores.testagens,
      ...(Object.keys(METRICAS) as Metrica[]).map((m) => u.indicadores[m].pct ?? ''),
      u.indicadores.porAgravo.find((a) => a.agravo === 'sifilis')?.positividade.pct ?? '',
    ])
    const csv = [cab, ...linhas].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `indicadores-${dias}dias-${hoje}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        titulo="Indicadores"
        descricao={rede ? 'Rede municipal por coordenadoria e UBS. Dados agregados, sem identificação.' : 'Indicadores da sua UBS.'}
        acoes={rede && <Button variante="secundario" icone={Download} onClick={exportar} disabled={!data}>Exportar CSV</Button>}
      />
      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-end gap-4 pt-5">
          <div>
            <p className="mb-1 text-sm font-bold" aria-hidden>Período</p>
            <Segmented
              rotulo="Período"
              valor={dias}
              onChange={setDias}
              opcoes={[
                { valor: '30', rotulo: '30 dias' },
                { valor: '90', rotulo: '90 dias' },
                { valor: '180', rotulo: '6 meses' },
              ]}
            />
          </div>
          {rede && (
            <>
              <Field label="Coordenadoria" className="w-56">
                <Select value={territorioId} onChange={(e) => { setTerritorioId(e.target.value); setUbsId('') }}>
                  <option value="">Todas</option>
                  {refs.data?.territorios.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </Select>
              </Field>
              <Field label="UBS" className="w-64">
                <Select value={ubsId} onChange={(e) => setUbsId(e.target.value)}>
                  <option value="">Todas</option>
                  {ubsDoTerritorio.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </Select>
              </Field>
            </>
          )}
          <p className="text-sm text-muted" aria-live="polite">{isFetching ? 'Atualizando…' : ''}</p>
        </CardBody>
      </Card>

      {isLoading && <Carregando />}
      {error && <EstadoErro erro={error} />}
      {data && (
        <div className="flex flex-col gap-6">
          <Resumo>
            <Stat rotulo="Testagens" valor={data.geral.testagens.toLocaleString('pt-BR')} />
            <Stat rotulo="Pessoas testadas" valor={data.geral.pessoasTestadas.toLocaleString('pt-BR')} />
            <Stat rotulo="Gestantes testadas" valor={data.geral.gestantesTestadas.toLocaleString('pt-BR')} tom="acento" />
            <Stat rotulo="Casos abertos" valor={data.geral.casosAbertos} tom="primario" />
          </Resumo>

          <section aria-labelledby="t-posit">
            <h2 id="t-posit" className="mb-3 text-lg font-bold">Positividade por agravo</h2>
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {data.geral.porAgravo.map((a) => (
                <li key={a.agravo} className="rounded-xl border border-border bg-surface p-4 shadow-card">
                  <p className="flex items-center gap-2 font-bold"><AgravoBadge agravo={a.agravo} /> {AGRAVO_ROTULO[a.agravo]}</p>
                  <p className="mt-1 text-3xl font-bold">{pct(a.positividade)}</p>
                  <p className="text-sm text-muted">{plural(a.reagentes, 'reagente')} em {plural(a.testados, 'testado')}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card aria-labelledby="t-cascata">
              <CardHeader id="t-cascata" titulo="Cascata do cuidado" descricao="Do teste rápido ao tratamento e à notificação. Meta de referência: 80%." icone={<ICONE.seguimento className="size-5" aria-hidden />} />
              <CardBody><Cascata i={data.geral} /></CardBody>
            </Card>
            <Card>
              <CardBody className="flex flex-col gap-8 pt-5">
                <GraficoBarras
                  titulo="Testagens por mês"
                  dados={data.geral.serieMensal.map((m) => ({ rotulo: formatarMesCurto(m.mes), valor: m.testagens }))}
                  altura={200}
                />
                <GraficoBarras
                  titulo="Testagens com algum resultado reagente, por mês"
                  dados={data.geral.serieMensal.map((m) => ({ rotulo: formatarMesCurto(m.mes), valor: m.reagentes }))}
                  altura={160}
                  cor="var(--danger)"
                />
              </CardBody>
            </Card>
          </div>

          {data.porUbs.length > 1 && (
            <Card aria-labelledby="t-comp">
              <CardHeader
                id="t-comp"
                titulo="Comparação entre UBS"
                descricao="A linha vertical marca o valor da seleção inteira. Diferenças entre territórios apontam onde agir."
                icone={<ICONE.indicadores className="size-5" aria-hidden />}
                acoes={
                  <Field label="Indicador" className="w-72">
                    <Select value={metrica} onChange={(e) => setMetrica(e.target.value as Metrica)}>
                      {Object.entries(METRICAS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                    </Select>
                  </Field>
                }
              />
              <CardBody>
                <GraficoBarras
                  titulo={`${METRICAS[metrica]} (%), por UBS`}
                  horizontal
                  dominioMax={100}
                  formatar={(v) => `${v}%`}
                  dados={comparacao}
                  referencia={data.geral[metrica].pct !== null ? { valor: data.geral[metrica].pct!, rotulo: `Geral ${data.geral[metrica].pct}%` } : undefined}
                />
              </CardBody>
            </Card>
          )}

          {rede && data.porTerritorio.length > 1 && (
            <Card aria-labelledby="t-terr">
              <CardHeader id="t-terr" titulo="Por coordenadoria de saúde" icone={<ICONE.painel className="size-5" aria-hidden />} />
              <CardBody>
                <div className="relative overflow-x-auto">
                  <table className="w-full min-w-[44rem] text-sm">
                    <caption className="sr-only">Indicadores por coordenadoria</caption>
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th scope="col" className="py-2 pr-2 font-bold">Coordenadoria</th>
                        <th scope="col" className="px-2 py-2 text-right font-bold">Testagens</th>
                        <th scope="col" className="px-2 py-2 text-right font-bold">Positividade sífilis</th>
                        <th scope="col" className="px-2 py-2 text-right font-bold">Coleta no prazo</th>
                        <th scope="col" className="px-2 py-2 text-right font-bold">Tratamento iniciado</th>
                        <th scope="col" className="px-2 py-2 text-right font-bold">Notificação no prazo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.porTerritorio.map(({ territorio, indicadores: i }) => (
                        <tr key={territorio.id} className="border-b border-border last:border-0">
                          <th scope="row" className="py-2 pr-2 text-left font-bold">{territorio.nome}</th>
                          <td className="px-2 py-2 text-right tabular">{i.testagens}</td>
                          <td className="px-2 py-2 text-right tabular">{pct(i.porAgravo.find((a) => a.agravo === 'sifilis')!.positividade)}</td>
                          <td className="px-2 py-2 text-right tabular">{pct(i.coletaNoPrazo)}</td>
                          <td className="px-2 py-2 text-right tabular">{pct(i.tratamentoIniciado)}</td>
                          <td className="px-2 py-2 text-right tabular">{pct(i.notificacoesNoPrazo)}</td>
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
    </>
  )
}
