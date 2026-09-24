import { Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ICONE } from '@/components/icones'
import { AgravoBadge, Badge, GestanteBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Aviso, Carregando, EstadoErro } from '@/components/ui/Feedback'
import { DescricaoLista, PageHeader } from '@/components/ui/Layout'
import { useTestagem } from '@/data/hooks'
import { AGRAVO_ROTULO, MOTIVO_ROTULO, RESULTADO_TR_ROTULO, TIPO_TESTE_AGRAVO, TIPO_TESTE_ROTULO } from '@/domain/rotulos'
import { formatarData } from '@/lib/datas'

export default function TestagemDetalhePage() {
  const { id } = useParams()
  const { data, isLoading, error } = useTestagem(id)
  if (isLoading) return <Carregando />
  if (error || !data) return <EstadoErro erro={error} />
  const { testagem: t, pessoa, executor, lotes } = data
  const loteDe = (id: string) => lotes.find((l) => l.id === id)

  return (
    <>
      <PageHeader
        titulo={`Testagem de ${formatarData(t.data)}`}
        trilha={[{ rotulo: 'Testagens', para: '/testagens' }, { rotulo: pessoa.nome }]}
        acoes={
          <>
            <Button variante="secundario" icone={Printer} onClick={() => window.print()}>
              Imprimir laudo
            </Button>
            {t.casoIds.length > 0 && (
              <LinkButton to={`/seguimento/${t.casoIds[0]}`} icone={ICONE.seguimento}>
                Ver caso aberto
              </LinkButton>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader titulo="Resultados por agravo" icone={<ICONE.novaTestagem className="size-5" aria-hidden />} />
            <CardBody className="flex flex-col gap-4">
              {t.interpretacoes.map((i) => (
                <div key={i.agravo} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <AgravoBadge agravo={i.agravo} />
                    <h3 className="font-bold">{AGRAVO_ROTULO[i.agravo]}</h3>
                    <Badge tom={i.conclusao === 'nao_reagente' ? 'sucesso' : 'perigo'} icone={i.conclusao === 'nao_reagente' ? ICONE.ok : ICONE.atencao}>
                      {i.titulo}
                    </Badge>
                  </div>
                  <table className="mt-3 w-full text-sm">
                    <caption className="sr-only">Testes de {AGRAVO_ROTULO[i.agravo]}</caption>
                    <thead>
                      <tr className="text-left text-muted">
                        <th scope="col" className="py-1 font-bold">Teste</th>
                        <th scope="col" className="py-1 font-bold">Resultado</th>
                        <th scope="col" className="py-1 font-bold">Lote / validade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.testes
                        .filter((x) => TIPO_TESTE_AGRAVO[x.tipo] === i.agravo)
                        .map((x) => (
                          <tr key={x.id} className="border-t border-border">
                            <td className="py-1.5">{TIPO_TESTE_ROTULO[x.tipo]}</td>
                            <td className="py-1.5 font-bold">{RESULTADO_TR_ROTULO[x.resultado]}</td>
                            <td className="py-1.5 font-mono text-xs">
                              {loteDe(x.loteId)?.lote} · {formatarData(loteDe(x.loteId)?.validade)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {i.condutas.length > 0 && (
                    <ul className="mt-3 list-disc pl-5 text-sm text-muted">
                      {i.condutas.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader titulo="Atendimento" nivel={2} />
            <CardBody>
              <DescricaoLista
                colunas={1}
                itens={[
                  {
                    rotulo: 'Pessoa',
                    valor: (
                      <Link to={`/pessoas/${pessoa.id}`} className="text-primary hover:underline">
                        {pessoa.nome}
                      </Link>
                    ),
                  },
                  { rotulo: 'Motivo', valor: MOTIVO_ROTULO[t.motivo] },
                  {
                    rotulo: 'Gestação',
                    valor: t.gestante ? (
                      <span className="flex items-center gap-2">
                        <GestanteBadge /> {t.idadeGestacionalSemanas ? `${t.idadeGestacionalSemanas} semanas` : ''}
                      </span>
                    ) : (
                      'Não'
                    ),
                  },
                  { rotulo: 'Exposição recente', valor: t.exposicaoRecente ? 'Sim (janela imunológica)' : 'Não' },
                  { rotulo: 'Executor(a)', valor: executor?.nome ?? '—' },
                  { rotulo: 'Dispositivos usados', valor: t.testes.length },
                ]}
              />
            </CardBody>
          </Card>
          {t.observacoes && (
            <Aviso tom="info" titulo="Observações">
              {t.observacoes}
            </Aviso>
          )}
        </div>
      </div>
    </>
  )
}
