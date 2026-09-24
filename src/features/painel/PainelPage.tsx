import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useSessaoAtiva } from '@/app/sessao'
import { ICONE } from '@/components/icones'
import { GraficoBarras } from '@/components/graficos/GraficoBarras'
import { LinkButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Aviso, Carregando, EstadoErro } from '@/components/ui/Feedback'
import { Segmented } from '@/components/ui/Form'
import { PageHeader, Stat } from '@/components/ui/Layout'
import { useAuditoria, useIndicadores, usePainelUbs, useUsuarios } from '@/data/hooks'
import { pode } from '@/domain/permissoes'
import { PERFIL_ROTULO } from '@/domain/rotulos'
import type { Perfil } from '@/domain/types'
import { formatarData, formatarDataHora, hojeISO, somarDias } from '@/lib/datas'
import { ListaPendencias } from '@/features/seguimento/componentes'
import BuscaAtivaLista from '@/features/busca-ativa/BuscaAtivaLista'

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export default function PainelPage() {
  const { usuario } = useSessaoAtiva()
  if (usuario.perfil === 'acs') return <PainelAcs />
  if (usuario.perfil === 'gestor') return <PainelGestor />
  if (usuario.perfil === 'admin') return <PainelAdmin />
  return <PainelUbs />
}

// ---------- Executor e RT ----------

function PainelUbs() {
  const { usuario, ubs } = useSessaoAtiva()
  const { data, isLoading, error, refetch } = usePainelUbs()
  const [janela, setJanela] = useState<'vencidas' | 'hoje' | 'semana'>('vencidas')
  const ehRt = pode(usuario, 'estoque.gerir')

  const listas = useMemo(() => {
    const p = data?.pendencias ?? []
    return {
      vencidas: p.filter((x) => x.vencida),
      hoje: p.filter((x) => x.diasRestantes === 0),
      semana: p.filter((x) => x.diasRestantes > 0 && x.diasRestantes <= 7),
    }
  }, [data])

  return (
    <>
      <PageHeader
        titulo={`${saudacao()}, ${usuario.nome.split(' ')[0]}`}
        descricao={`${ubs?.nome} — ${formatarData(hojeISO())}. Veja o que precisa de atenção hoje.`}
        acoes={
          <LinkButton to="/testagem/nova" icone={ICONE.novaTestagem} tamanho="lg">
            Nova testagem
          </LinkButton>
        }
      />
      {isLoading && <Carregando />}
      {error && <EstadoErro erro={error} tentarNovamente={refetch} />}
      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              rotulo="Pendências vencidas"
              valor={data.resumo.pendenciasVencidas}
              detalhe={`${data.resumo.pendenciasHoje} vencem hoje`}
              icone={ICONE.erro}
              tom={data.resumo.pendenciasVencidas ? 'perigo' : 'sucesso'}
              para="/seguimento"
            />
            <Stat
              rotulo="Casos em seguimento"
              valor={data.resumo.casosAtivos}
              detalhe={`${data.resumo.gestantesEmSeguimento} gestante(s)`}
              icone={ICONE.seguimento}
              tom="primario"
              para="/seguimento"
            />
            <Stat
              rotulo="Busca ativa aberta"
              valor={data.resumo.buscaAtivaAbertas}
              detalhe="pessoas a localizar"
              icone={ICONE.buscaAtiva}
              tom={data.resumo.buscaAtivaAbertas ? 'atencao' : 'sucesso'}
              para="/busca-ativa"
            />
            <Stat
              rotulo="Testagens hoje"
              valor={data.resumo.testagensHoje}
              detalhe={`${data.resumo.testagensSemana} nos últimos 7 dias`}
              icone={ICONE.novaTestagem}
              para="/testagens"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card aria-labelledby="t-pend">
              <CardHeader
                id="t-pend"
                titulo="Pendências de seguimento"
                descricao="Ordenadas pelo prazo. Clique para abrir o caso."
                icone={<ICONE.prazo className="size-5" aria-hidden />}
              />
              <CardBody>
                <Segmented
                  rotulo="Período das pendências"
                  valor={janela}
                  onChange={setJanela}
                  opcoes={[
                    { valor: 'vencidas', rotulo: 'Vencidas', contagem: listas.vencidas.length },
                    { valor: 'hoje', rotulo: 'Hoje', contagem: listas.hoje.length },
                    { valor: 'semana', rotulo: 'Próximos 7 dias', contagem: listas.semana.length },
                  ]}
                />
                <div className="mt-2">
                  <ListaPendencias
                    itens={listas[janela].slice(0, 12)}
                    vazio={janela === 'vencidas' ? 'Nenhuma pendência vencida. Ótimo trabalho!' : 'Nada neste período.'}
                  />
                </div>
                {listas[janela].length > 12 && (
                  <Link to="/seguimento" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                    Ver todas ({listas[janela].length}) <ArrowRight className="size-4" aria-hidden />
                  </Link>
                )}
              </CardBody>
            </Card>

            <div className="flex flex-col gap-6">
              {(data.resumo.notificacoesPendentes > 0 || data.alertasEstoque.length > 0) && (
                <Card aria-labelledby="t-alertas">
                  <CardHeader id="t-alertas" titulo="Alertas" icone={<ICONE.atencao className="size-5" aria-hidden />} />
                  <CardBody className="flex flex-col gap-3">
                    {data.resumo.notificacoesPendentes > 0 && (
                      <Aviso
                        tom={data.resumo.notificacoesAtrasadas ? 'perigo' : 'atencao'}
                        icone={ICONE.notificacoes}
                        titulo={`${data.resumo.notificacoesPendentes} notificação(ões) a enviar`}
                        acao={
                          <Link to="/notificacoes" className="font-bold text-primary hover:underline">
                            Abrir
                          </Link>
                        }
                      >
                        {data.resumo.notificacoesAtrasadas > 0
                          ? `${data.resumo.notificacoesAtrasadas} fora do prazo.`
                          : 'Todas dentro do prazo.'}
                      </Aviso>
                    )}
                    {data.alertasEstoque.slice(0, ehRt ? 4 : 2).map((a) => (
                      <Aviso key={a.id} tom={a.severidade === 'alta' ? 'perigo' : 'atencao'} icone={ICONE.estoque}>
                        {a.mensagem}
                      </Aviso>
                    ))}
                    {data.alertasEstoque.length > 0 && (
                      <Link to="/estoque" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                        Ir para o estoque <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    )}
                  </CardBody>
                </Card>
              )}
              <Card>
                <CardBody className="pt-4">
                  <GraficoBarras
                    titulo="Testagens por semana (últimas 8)"
                    dados={data.serieSemanal.map((s) => ({
                      rotulo: formatarData(s.semana).slice(0, 5),
                      valor: s.testagens,
                      detalhe: `${s.reagentes} com resultado reagente`,
                    }))}
                    altura={200}
                  />
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ---------- ACS ----------

function PainelAcs() {
  const { usuario, microarea, ubs } = useSessaoAtiva()
  return (
    <>
      <PageHeader
        titulo={`${saudacao()}, ${usuario.nome.split(' ')[0]}`}
        descricao={`${microarea?.descricao ?? ''} · ${ubs?.nome}. Estas pessoas precisam voltar à UBS.`}
      />
      <Aviso tom="info" className="mb-4" titulo="Sigilo">
        Por segurança, você vê apenas que há um retorno pendente — não o motivo clínico. Oriente a pessoa a procurar a
        equipe de enfermagem.
      </Aviso>
      <BuscaAtivaLista />
    </>
  )
}

// ---------- Gestor ----------

function PainelGestor() {
  const { usuario } = useSessaoAtiva()
  const hoje = hojeISO()
  const { data, isLoading, error } = useIndicadores({ inicio: somarDias(hoje, -90), fim: hoje })
  const pct = (v: number | null) => (v === null ? '—' : `${v.toLocaleString('pt-BR')}%`)
  return (
    <>
      <PageHeader
        titulo={`${saudacao()}, ${usuario.nome.split(' ')[0]}`}
        descricao="Rede municipal — últimos 90 dias. Dados agregados, sem identificação de pessoas."
        acoes={
          <LinkButton to="/indicadores" icone={ICONE.indicadores}>
            Explorar indicadores
          </LinkButton>
        }
      />
      {isLoading && <Carregando />}
      {error && <EstadoErro erro={error} />}
      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat rotulo="Testagens" valor={data.geral.testagens.toLocaleString('pt-BR')} detalhe={`${data.geral.pessoasTestadas} pessoas`} icone={ICONE.novaTestagem} />
            <Stat rotulo="Coleta do confirmatório no prazo" valor={pct(data.geral.coletaNoPrazo.pct)} detalhe={`${data.geral.coletaNoPrazo.num} de ${data.geral.coletaNoPrazo.den}`} icone={ICONE.confirmatorio} tom="primario" />
            <Stat rotulo="Gestantes com sífilis tratadas no dia" valor={pct(data.geral.gestanteSifilisTratadaMesmoDia.pct)} detalhe={`${data.geral.gestanteSifilisTratadaMesmoDia.num} de ${data.geral.gestanteSifilisTratadaMesmoDia.den}`} icone={ICONE.gestante} tom="acento" />
            <Stat rotulo="Notificações no prazo" valor={pct(data.geral.notificacoesNoPrazo.pct)} detalhe={`${data.geral.notificacoesNoPrazo.num} de ${data.geral.notificacoesNoPrazo.den}`} icone={ICONE.notificacoes} tom="primario" />
          </div>
          <Card>
            <CardBody className="pt-4">
              <GraficoBarras
                titulo="Tratamento iniciado entre casos que precisam tratar, por coordenadoria (%)"
                horizontal
                dominioMax={100}
                formatar={(v) => `${v}%`}
                referencia={
                  data.geral.tratamentoIniciado.pct !== null
                    ? { valor: data.geral.tratamentoIniciado.pct, rotulo: `Rede ${data.geral.tratamentoIniciado.pct}%` }
                    : undefined
                }
                dados={[...data.porTerritorio]
                  .sort((a, b) => (b.indicadores.tratamentoIniciado.pct ?? -1) - (a.indicadores.tratamentoIniciado.pct ?? -1))
                  .map((t) => ({
                    rotulo: t.territorio.nome,
                    valor: t.indicadores.tratamentoIniciado.pct,
                    detalhe: `${t.indicadores.tratamentoIniciado.num} de ${t.indicadores.tratamentoIniciado.den}`,
                  }))}
              />
            </CardBody>
          </Card>
        </div>
      )}
    </>
  )
}

// ---------- Admin ----------

function PainelAdmin() {
  const { usuario } = useSessaoAtiva()
  const usuarios = useUsuarios()
  const auditoria = useAuditoria({})
  const porPerfil = (usuarios.data ?? []).reduce<Record<string, number>>((acc, u) => {
    if (u.ativo) acc[u.perfil] = (acc[u.perfil] ?? 0) + 1
    return acc
  }, {})
  return (
    <>
      <PageHeader
        titulo={`${saudacao()}, ${usuario.nome.split(' ')[0]}`}
        descricao="Administração do sistema. Você não tem acesso a dados clínicos."
        acoes={
          <LinkButton to="/configuracoes" icone={ICONE.configuracoes}>
            Configurações
          </LinkButton>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {(Object.keys(PERFIL_ROTULO) as Perfil[]).map((p) => (
          <Stat key={p} rotulo={PERFIL_ROTULO[p]} valor={porPerfil[p] ?? 0} detalhe="usuários ativos" icone={ICONE.pessoas} />
        ))}
      </div>
      <Card className="mt-6" aria-labelledby="t-aud">
        <CardHeader
          id="t-aud"
          titulo="Atividade recente"
          icone={<ICONE.auditoria className="size-5" aria-hidden />}
          acoes={
            <LinkButton to="/auditoria" variante="fantasma" tamanho="sm" iconeDireita={ArrowRight}>
              Ver auditoria
            </LinkButton>
          }
        />
        <CardBody>
          {auditoria.isLoading ? (
            <Carregando />
          ) : (
            <ul className="divide-y divide-border">
              {auditoria.data?.slice(0, 8).map(({ evento, usuario: autor }) => (
                <li key={evento.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                  <span>
                    <span className="font-bold">{autor?.nome ?? '—'}</span> · {evento.descricao}
                  </span>
                  <span className="text-muted tabular">{formatarDataHora(evento.data)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  )
}
