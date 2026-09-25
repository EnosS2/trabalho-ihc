import { useId, useState } from 'react'
import { Link } from 'react-router'
import { ICONE } from '@/components/icones'
import { AgravoBadge, Badge, GestanteBadge, PrazoBadge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Aviso, Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Feedback'
import { Medidor, PageHeader, Resumo, Stat } from '@/components/ui/Layout'
import { TabPanel, Tabs } from '@/components/ui/Tabs'
import { useNotificacoes } from '@/data/hooks'
import { AGRAVO_NOTIFICACAO_ROTULO, DESTINO_ROTULO } from '@/domain/rotulos'
import { diasEntre, formatarData, hojeISO } from '@/lib/datas'

export default function NotificacoesPage() {
  const [aba, setAba] = useState<'pendente' | 'enviada'>('pendente')
  const todas = useNotificacoes()
  const idBase = useId()
  const lista = (todas.data ?? []).filter((n) => n.notificacao.status === aba)
  const pendentes = (todas.data ?? []).filter((n) => n.notificacao.status === 'pendente')
  const media = todas.data?.length ? Math.round(todas.data.reduce((s, n) => s + n.completude.percentual, 0) / todas.data.length) : 0

  return (
    <>
      <PageHeader
        titulo="Notificações"
        descricao="Fila de notificações compulsórias geradas pelos casos. A UBS entrega a notificação completa e no prazo."
      />
      <Aviso tom="info" className="mb-6" titulo="Para onde vai cada notificação (Porto Alegre)">
        Sífilis adquirida, sífilis em gestante, HIV e hepatites: <strong>Sistema Sentinela</strong>. Gestante HIV + criança
        exposta: <strong>ficha editável por e-mail à DVS</strong>.
      </Aviso>
      {todas.isLoading && <Carregando />}
      {todas.error && <EstadoErro erro={todas.error} />}
      {todas.data && (
        <>
          <Resumo className="mb-6">
            <Stat rotulo="Pendentes" valor={pendentes.length} detalhe="aguardando envio" tom={pendentes.length ? 'atencao' : 'sucesso'} />
            <Stat rotulo="Fora do prazo" valor={pendentes.filter((n) => n.atrasada).length} detalhe="passaram do prazo de envio" tom={pendentes.some((n) => n.atrasada) ? 'perigo' : 'sucesso'} />
            <Stat rotulo="Prontas para enviar" valor={pendentes.filter((n) => n.completude.pronta).length} detalhe="campos obrigatórios completos" tom="primario" />
            <Stat rotulo="Completude média" valor={`${media}%`} detalhe="de todas as fichas" />
          </Resumo>
          <Card>
            <CardBody className="pt-2">
              <Tabs
                rotulo="Situação das notificações"
                idBase={idBase}
                ativa={aba}
                onChange={setAba}
                abas={[
                  { id: 'pendente', rotulo: 'A enviar', contagem: pendentes.length },
                  { id: 'enviada', rotulo: 'Enviadas', contagem: todas.data.length - pendentes.length },
                ]}
              />
              <TabPanel idBase={idBase} id={aba} className="pt-4 focus:outline-none">
                <DataTable
                  legenda={aba === 'pendente' ? 'Notificações a enviar' : 'Notificações enviadas'}
                  linhas={lista}
                  chave={(n) => n.notificacao.id}
                  vazio={<EstadoVazio icone={ICONE.ok} titulo={aba === 'pendente' ? 'Nenhuma notificação pendente' : 'Nenhuma notificação enviada'} />}
                  principal={(n) => (
                    <Link to={`/seguimento/${n.caso.id}`} className="font-bold text-primary hover:underline">
                      {n.pessoa.nome}
                    </Link>
                  )}
                  colunas={[
                    {
                      chave: 'pessoa',
                      cabecalho: 'Pessoa',
                      ocultarMobile: true,
                      celula: (n) => (
                        <Link to={`/seguimento/${n.caso.id}`} className="font-bold text-primary hover:underline">
                          {n.pessoa.nome}
                        </Link>
                      ),
                    },
                    {
                      chave: 'agravo',
                      cabecalho: 'Agravo notificado',
                      celula: (n) => (
                        <span className="flex flex-wrap items-center gap-1">
                          <AgravoBadge agravo={n.caso.agravo} />
                          {AGRAVO_NOTIFICACAO_ROTULO[n.notificacao.agravoNotificacao]}
                          {n.caso.gestante && <GestanteBadge />}
                        </span>
                      ),
                    },
                    { chave: 'destino', cabecalho: 'Destino', celula: (n) => DESTINO_ROTULO[n.notificacao.destino] },
                    {
                      chave: 'prazo',
                      cabecalho: aba === 'pendente' ? 'Prazo' : 'Envio',
                      celula: (n) =>
                        aba === 'pendente' ? (
                          <PrazoBadge prazo={n.notificacao.prazo} diasRestantes={diasEntre(hojeISO(), n.notificacao.prazo)} />
                        ) : (
                          <span className="flex flex-wrap items-center gap-1">
                            {formatarData(n.notificacao.enviadaEm?.slice(0, 10))}
                            {n.atrasada ? <Badge tom="atencao" icone={ICONE.atencao}>fora do prazo</Badge> : <Badge tom="sucesso" icone={ICONE.ok}>no prazo</Badge>}
                          </span>
                        ),
                    },
                    {
                      chave: 'completude',
                      cabecalho: 'Completude',
                      celula: (n) => (
                        <div className="flex min-w-36 items-center gap-2">
                          <div className="flex-1">
                            <Medidor compacto rotulo={`Completude da ficha de ${n.pessoa.nome}`} valor={n.completude.percentual} tom={n.completude.percentual === 100 ? 'sucesso' : n.completude.pronta ? 'atencao' : 'perigo'} />
                          </div>
                          <span className="text-sm tabular">{n.completude.percentual}%</span>
                        </div>
                      ),
                    },
                    {
                      chave: 'situacao',
                      cabecalho: 'Situação',
                      celula: (n) =>
                        n.notificacao.status === 'enviada' ? (
                          <span className="text-sm text-muted">{n.notificacao.protocolo ?? '—'}</span>
                        ) : n.completude.pronta ? (
                          <Badge tom="sucesso" icone={ICONE.ok}>Pronta</Badge>
                        ) : (
                          <Badge tom="perigo" icone={ICONE.erro} className="whitespace-normal" titulo={n.completude.faltandoObrigatorios.map((c) => c.rotulo).join(', ')}>
                            Falta: {n.completude.faltandoObrigatorios.map((c) => c.rotulo).join(', ')}
                          </Badge>
                        ),
                    },
                  ]}
                />
              </TabPanel>
            </CardBody>
          </Card>
        </>
      )}
    </>
  )
}
