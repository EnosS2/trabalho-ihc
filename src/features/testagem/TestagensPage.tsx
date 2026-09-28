import { Search } from 'lucide-react'
import { Link } from 'react-router'
import { usePode } from '@/app/sessao'
import { ICONE } from '@/components/icones'
import { AgravoBadge, Badge, GestanteBadge, type Tom } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Feedback'
import { Checkbox, Field, Input, Select } from '@/components/ui/Form'
import { PageHeader } from '@/components/ui/Layout'
import type { TestagemResumo } from '@/data/api'
import { useTestagens } from '@/data/hooks'
import { AGRAVO_ROTULO, AGRAVOS, CONCLUSAO_ROTULO, MOTIVO_ROTULO } from '@/domain/rotulos'
import type { Agravo, ConclusaoAgravo } from '@/domain/types'
import { formatarData, hojeISO, somarDias } from '@/lib/datas'
import { plural } from '@/lib/texto'
import { useBooleanoNaUrl, useEstadoNaUrl } from '@/lib/estadoNaUrl'

/** Resultado por agravo, por extenso: sigla do agravo (signo do sistema) + conclusão com cor e texto. */
export function ResultadosResumo({ t }: { t: TestagemResumo['testagem'] }) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {t.interpretacoes.map((i) => (
        <span key={i.agravo} className="inline-flex items-center gap-1">
          <AgravoBadge agravo={i.agravo} />
          <Badge tom={TOM_CONCLUSAO[i.conclusao]}>{CONCLUSAO_ROTULO[i.conclusao]}</Badge>
        </span>
      ))}
    </span>
  )
}

const TOM_CONCLUSAO: Record<ConclusaoAgravo, Tom> = {
  nao_reagente: 'sucesso',
  reagente: 'perigo',
  discordante: 'atencao',
  invalido: 'atencao',
  incompleto: 'neutro',
}

export default function TestagensPage() {
  const podeRegistrar = usePode('testagem.registrar')
  const [inicio, setInicio] = useEstadoNaUrl('de', somarDias(hojeISO(), -30))
  const [fim, setFim] = useEstadoNaUrl('ate', hojeISO())
  const [agravo, setAgravo] = useEstadoNaUrl<Agravo | ''>('agravo', '', ['', ...AGRAVOS])
  const [reagentes, setReagentes] = useBooleanoNaUrl('reagentes')
  const [termo, setTermo] = useEstadoNaUrl('q', '')
  const { data, isLoading, error, refetch, isFetching } = useTestagens({
    inicio,
    fim,
    agravo: agravo || undefined,
    somenteReagentes: reagentes,
    termo,
  })

  return (
    <>
      <PageHeader
        titulo="Testagens"
        descricao="Histórico de testes rápidos realizados na UBS."
        acoes={
          podeRegistrar && (
            <LinkButton to="/testagem/nova" icone={ICONE.novaTestagem}>
              Nova testagem
            </LinkButton>
          )
        }
      />
      <Card>
        <CardBody className="pt-5">
          <form className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" role="search" onSubmit={(e) => e.preventDefault()}>
            <Field label="Nome da pessoa" className="lg:col-span-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
                <Input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} className="pl-10" />
              </div>
            </Field>
            <Field label="De">
              <Input type="date" value={inicio} max={fim} onChange={(e) => setInicio(e.target.value)} />
            </Field>
            <Field label="Até">
              <Input type="date" value={fim} min={inicio} max={hojeISO()} onChange={(e) => setFim(e.target.value)} />
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
            <Checkbox
              className="lg:col-span-5"
              label="Somente com resultado reagente ou discordante"
              checked={reagentes}
              onChange={(e) => setReagentes(e.target.checked)}
            />
          </form>
          <p className="mb-3 text-sm text-muted" aria-live="polite">
            {data ? `${plural(data.length, 'testagem encontrada', 'testagens encontradas')}${isFetching ? ', atualizando…' : ''}` : ''}
          </p>
          {isLoading && <Carregando />}
          {error && <EstadoErro erro={error} tentarNovamente={refetch} />}
          {data && (
            <DataTable
              legenda="Testagens realizadas"
              linhas={data.slice(0, 200)}
              chave={(l) => l.testagem.id}
              principal={(l) => (
                <Link to={`/testagens/${l.testagem.id}`} className="font-bold text-primary hover:underline">
                  {l.pessoaNome}
                </Link>
              )}
              vazio={<EstadoVazio icone={ICONE.testagens} titulo="Nenhuma testagem no filtro" descricao="Amplie o período ou limpe os filtros." />}
              colunas={[
                { chave: 'data', cabecalho: 'Data', celula: (l) => formatarData(l.testagem.data), className: 'tabular whitespace-nowrap' },
                {
                  chave: 'pessoa',
                  cabecalho: 'Pessoa',
                  ocultarMobile: true,
                  celula: (l) => (
                    <Link to={`/testagens/${l.testagem.id}`} className="font-bold text-primary hover:underline">
                      {l.pessoaNome}
                    </Link>
                  ),
                },
                {
                  chave: 'motivo',
                  cabecalho: 'Motivo',
                  celula: (l) => (
                    <span className="flex flex-wrap items-center gap-1">
                      {MOTIVO_ROTULO[l.testagem.motivo]}
                      {l.testagem.gestante && <GestanteBadge />}
                    </span>
                  ),
                },
                { chave: 'resultados', cabecalho: 'Resultados', celula: (l) => <ResultadosResumo t={l.testagem} /> },
                { chave: 'executor', cabecalho: 'Executor(a)', celula: (l) => l.executorNome, ocultarMobile: true },
              ]}
            />
          )}
          {data && data.length > 200 && <p className="mt-3 text-sm text-muted">Mostrando as 200 mais recentes. Refine o filtro para ver outras.</p>}
        </CardBody>
      </Card>
    </>
  )
}
