import { Columns3, List, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { ICONE } from '@/components/icones'
import { AgravoBadge, GestanteBadge, PrazoBadge } from '@/components/ui/Badge'
import { FitaCompacta } from '@/components/ui/FitaDoCaso'
import { Card, CardBody } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Feedback'
import { Checkbox, Field, Input, Segmented, Select } from '@/components/ui/Form'
import { PageHeader } from '@/components/ui/Layout'
import type { CasoResumo } from '@/data/api'
import { useCasos } from '@/data/hooks'
import { AGRAVO_ROTULO, AGRAVOS, STATUS_CASO_CURTO, STATUS_CASO_ORDEM, STATUS_CASO_ROTULO } from '@/domain/rotulos'
import { etapasDoCaso } from '@/domain/rules/seguimento'
import type { Agravo, StatusCaso } from '@/domain/types'
import { formatarData } from '@/lib/datas'
import { cn } from '@/lib/cn'
import { plural } from '@/lib/texto'

function CartaoCaso({ r }: { r: CasoResumo }) {
  return (
    <Link
      to={`/seguimento/${r.caso.id}`}
      className={cn(
        'flex flex-col gap-2 rounded-md border bg-surface p-3 transition-colors hover:border-primary',
        r.proxima?.vencida ? 'border-danger/60 border-l-4' : 'border-border',
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1.5">
          <AgravoBadge agravo={r.caso.agravo} />
          {r.caso.gestante && <GestanteBadge />}
        </span>
        <FitaCompacta {...etapasDoCaso(r.caso.agravo, r.status)} vencida={r.proxima?.vencida} semRotulo />
      </span>
      <span className="font-bold leading-tight">{r.pessoa.nomeSocial ?? r.pessoa.nome}</span>
      {r.proxima ? (
        <span className="flex flex-col gap-1 text-sm">
          <span className="text-muted">{r.proxima.descricao}</span>
          <PrazoBadge prazo={r.proxima.prazo} diasRestantes={r.proxima.diasRestantes} />
        </span>
      ) : (
        <span className="text-sm text-muted">Sem pendências</span>
      )}
    </Link>
  )
}

export default function SeguimentoPage() {
  const [visao, setVisao] = useState<'quadro' | 'lista'>('quadro')
  const [agravo, setAgravo] = useState<Agravo | ''>('')
  const [termo, setTermo] = useState('')
  const [encerrados, setEncerrados] = useState(false)
  const [soVencidos, setSoVencidos] = useState(false)
  const { data, isLoading, error, refetch } = useCasos({
    status: encerrados ? undefined : 'ativos',
    agravo: agravo || undefined,
    termo,
  })
  const casos = (data ?? []).filter((c) => !soVencidos || c.pendencias.some((p) => p.vencida))
  const colunas = STATUS_CASO_ORDEM.filter((s) => encerrados || s !== 'encerrado')

  return (
    <>
      <PageHeader
        titulo="Seguimento de casos"
        descricao="Cada caso reagente, do teste rápido ao desfecho. Bordas vermelhas indicam prazo vencido."
      />
      <Card className="mb-4">
        <CardBody className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_auto]">
          <Field label="Buscar pessoa">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
              <Input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} className="pl-10" />
            </div>
          </Field>
          <Field label="Agravo">
            <Select value={agravo} onChange={(e) => setAgravo(e.target.value as Agravo | '')}>
              <option value="">Todos</option>
              {AGRAVOS.map((a) => (
                <option key={a} value={a}>
                  {AGRAVO_ROTULO[a]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Segmented
              rotulo="Forma de visualização"
              valor={visao}
              onChange={setVisao}
              opcoes={[
                { valor: 'quadro', rotulo: <><Columns3 className="size-4" aria-hidden /> Quadro</> },
                { valor: 'lista', rotulo: <><List className="size-4" aria-hidden /> Lista</> },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-2 lg:col-span-3">
            <Checkbox label="Somente com prazo vencido" checked={soVencidos} onChange={(e) => setSoVencidos(e.target.checked)} />
            <Checkbox label="Incluir casos encerrados" checked={encerrados} onChange={(e) => setEncerrados(e.target.checked)} />
          </div>
        </CardBody>
      </Card>

      <p className="mb-3 text-sm text-muted" aria-live="polite">
        {data ? plural(casos.length, 'caso') : ''}
      </p>
      {isLoading && <Carregando />}
      {error && <EstadoErro erro={error} tentarNovamente={refetch} />}
      {data && casos.length === 0 && (
        <EstadoVazio icone={ICONE.seguimento} titulo="Nenhum caso no filtro" descricao="Casos são abertos automaticamente quando uma testagem tem resultado reagente." />
      )}

      {data && casos.length > 0 && visao === 'quadro' && (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <ol className="grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-4" aria-label="Quadro de casos por etapa">
            {colunas.map((s) => {
              const doStatus = casos.filter((c) => c.status === s)
              return (
                <li key={s} className="flex min-w-0 flex-col gap-2 rounded-lg bg-surface-3/60 p-3" aria-labelledby={`col-${s}`}>
                  <h2 id={`col-${s}`} className="flex items-baseline justify-between gap-2 px-1 font-bold" title={STATUS_CASO_ROTULO[s]}>
                    {STATUS_CASO_CURTO[s]}
                    <span className="text-sm tabular text-muted">
                      {doStatus.length}
                      <span className="sr-only"> {doStatus.length === 1 ? 'caso' : 'casos'}</span>
                    </span>
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {doStatus.map((r) => (
                      <li key={r.caso.id}>
                        <CartaoCaso r={r} />
                      </li>
                    ))}
                  </ul>
                  {doStatus.length === 0 && <p className="px-1 text-sm text-muted">Nenhum caso</p>}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {data && casos.length > 0 && visao === 'lista' && (
        <Card>
          <CardBody className="pt-4">
            <DataTable
              legenda="Casos em seguimento"
              linhas={casos}
              chave={(r) => r.caso.id}
              principal={(r) => (
                <Link to={`/seguimento/${r.caso.id}`} className="font-bold text-primary hover:underline">
                  {r.pessoa.nome}
                </Link>
              )}
              colunas={[
                {
                  chave: 'pessoa',
                  cabecalho: 'Pessoa',
                  ocultarMobile: true,
                  celula: (r) => (
                    <Link to={`/seguimento/${r.caso.id}`} className="font-bold text-primary hover:underline">
                      {r.pessoa.nome}
                    </Link>
                  ),
                },
                {
                  chave: 'agravo',
                  cabecalho: 'Agravo',
                  celula: (r) => (
                    <span className="flex gap-1">
                      <AgravoBadge agravo={r.caso.agravo} />
                      {r.caso.gestante && <GestanteBadge />}
                    </span>
                  ),
                },
                { chave: 'status', cabecalho: 'Etapa', celula: (r) => <FitaCompacta {...etapasDoCaso(r.caso.agravo, r.status as StatusCaso)} vencida={r.proxima?.vencida} /> },
                { chave: 'prox', cabecalho: 'Próxima ação', celula: (r) => r.proxima?.descricao ?? '—' },
                { chave: 'prazo', cabecalho: 'Prazo', celula: (r) => (r.proxima ? <PrazoBadge prazo={r.proxima.prazo} diasRestantes={r.proxima.diasRestantes} /> : '—') },
                { chave: 'aberto', cabecalho: 'Aberto em', celula: (r) => formatarData(r.caso.abertoEm), className: 'tabular', ocultarMobile: true },
              ]}
            />
          </CardBody>
        </Card>
      )}
    </>
  )
}
