import type { LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useSessaoAtiva } from '@/app/sessao'
import { ICONE } from '@/components/icones'
import { GraficoBarras } from '@/components/graficos/GraficoBarras'
import { LinkButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Aviso, Carregando, EstadoErro } from '@/components/ui/Feedback'
import { Segmented } from '@/components/ui/Form'
import { PageHeader, Resumo, Stat } from '@/components/ui/Layout'
import { useAuditoria, useIndicadores, usePainelUbs, useUsuarios } from '@/data/hooks'
import { pode } from '@/domain/permissoes'
import { PERFIL_ROTULO } from '@/domain/rotulos'
import type { Perfil } from '@/domain/types'
import { cn } from '@/lib/cn'
import { formatarData, formatarDataHora, formatarDataLonga, hojeISO, somarDias } from '@/lib/datas'
import { plural } from '@/lib/texto'
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
        tituloAba="Painel"
        descricao={`${ubs?.nome}, ${formatarDataLonga(hojeISO())}.`}
        acoes={
          <LinkButton to="/testagem/nova" icone={ICONE.novaTestagem} tamanho="lg">
            Nova testagem
          </LinkButton>
        }
      />
      {isLoading && <Carregando />}
      {error && <EstadoErro erro={error} tentarNovamente={refetch} />}
      {data && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Card aria-labelledby="t-pend">
            <CardHeader
              id="t-pend"
              titulo="Pendências de seguimento"
              descricao="Quem precisa de uma ação, pelo prazo mais próximo. Abra a linha para ir ao caso."
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
                  vazio={janela === 'vencidas' ? 'Nenhuma pendência vencida.' : 'Nenhuma pendência neste período.'}
                />
              </div>
              {listas[janela].length > 12 && (
                <Link to="/seguimento" className="mt-2 inline-block text-sm font-bold text-primary hover:underline">
                  Ver as {listas[janela].length} pendências no seguimento
                </Link>
              )}
            </CardBody>
          </Card>

          <div className="flex flex-col gap-6">
            <Card aria-labelledby="t-hoje">
              <CardHeader id="t-hoje" titulo="Na UBS agora" />
              <CardBody className="pb-3">
                <ul className="flex flex-col divide-y divide-border">
                  <LinhaNumero
                    n={data.resumo.casosAtivos}
                    para="/seguimento"
                    texto={`${data.resumo.casosAtivos === 1 ? 'caso' : 'casos'} em seguimento`}
                    detalhe={data.resumo.gestantesEmSeguimento ? `${plural(data.resumo.gestantesEmSeguimento, 'gestante')} entre eles` : undefined}
                  />
                  <LinhaNumero
                    n={data.resumo.buscaAtivaAbertas}
                    para="/busca-ativa"
                    texto={data.resumo.buscaAtivaAbertas === 1 ? 'pessoa a localizar' : 'pessoas a localizar'}
                    detalhe="na busca ativa"
                    tom={data.resumo.buscaAtivaAbertas ? 'text-warning' : undefined}
                  />
                  <LinhaNumero
                    n={data.resumo.testagensHoje}
                    para="/testagens"
                    texto={data.resumo.testagensHoje === 1 ? 'testagem hoje' : 'testagens hoje'}
                    detalhe={`${plural(data.resumo.testagensSemana, 'testagem', 'testagens')} nos últimos 7 dias`}
                  />
                </ul>
              </CardBody>
            </Card>

            {(data.resumo.notificacoesPendentes > 0 || data.alertasEstoque.length > 0) && (
              <Card aria-labelledby="t-alertas">
                <CardHeader id="t-alertas" titulo="Alertas" />
                <CardBody className="pb-3">
                  <ul className="flex flex-col divide-y divide-border">
                    {data.resumo.notificacoesPendentes > 0 && (
                      <LinhaAlerta
                        grave={data.resumo.notificacoesAtrasadas > 0}
                        icone={ICONE.notificacoes}
                        para="/notificacoes"
                        texto={`${plural(data.resumo.notificacoesPendentes, 'notificação', 'notificações')} a enviar`}
                        detalhe={
                          data.resumo.notificacoesAtrasadas > 0
                            ? `${data.resumo.notificacoesAtrasadas} fora do prazo`
                            : 'todas dentro do prazo'
                        }
                      />
                    )}
                    {data.alertasEstoque.slice(0, ehRt ? 4 : 2).map((a) => (
                      <LinhaAlerta key={a.id} grave={a.severidade === 'alta'} icone={ICONE.estoque} para="/estoque" texto={a.mensagem} />
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardBody className="pt-4">
                <GraficoBarras
                  titulo="Testagens por semana"
                  dados={data.serieSemanal.map((s) => ({
                    rotulo: formatarData(s.semana).slice(0, 5),
                    valor: s.testagens,
                    detalhe: `${plural(s.reagentes, 'reagente')}`,
                  }))}
                  altura={200}
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Número + o que ele conta, lidos como uma frase ("8 pessoas a localizar"). Sem coluna de largura
 * fixa: com 1 ou 3 dígitos, o texto fica sempre colado ao número. A linha inteira leva à tela.
 */
function LinhaNumero({ n, texto, detalhe, para, tom }: { n: number; texto: string; detalhe?: string; para: string; tom?: string }) {
  return (
    <li>
      <Link to={para} className="-mx-2 block rounded-md px-2 py-2.5 hover:bg-surface-2">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn('text-[1.563rem] leading-none font-bold tabular', tom ?? 'text-fg')}>{n}</span>
          <span className="font-bold">{texto}</span>
        </span>
        {detalhe && <span className="mt-1 block text-sm text-muted">{detalhe}</span>}
      </Link>
    </li>
  )
}

/** Alerta em linha: ícone e cor pela gravidade (vermelho só quando vencido ou atrasado). */
function LinhaAlerta({
  grave,
  icone: Icone,
  texto,
  detalhe,
  para,
}: {
  grave: boolean
  icone: LucideIcon
  texto: string
  detalhe?: string
  para: string
}) {
  return (
    <li>
      <Link to={para} className="-mx-2 flex gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-surface-2">
        <Icone className={cn('mt-0.5 size-5 shrink-0', grave ? 'text-danger' : 'text-warning')} aria-hidden />
        <span className="min-w-0">
          <span className={cn(detalhe && 'font-bold')}>{texto}</span>
          {detalhe && <span className={cn('block', grave ? 'text-danger' : 'text-muted')}>{detalhe}</span>}
          <span className="sr-only">{grave ? ' (urgente)' : ' (atenção)'}</span>
        </span>
      </Link>
    </li>
  )
}

// ---------- ACS ----------

function PainelAcs() {
  const { usuario, microarea, ubs } = useSessaoAtiva()
  return (
    <>
      <PageHeader
        titulo={`${saudacao()}, ${usuario.nome.split(' ')[0]}`}
        tituloAba="Painel"
        descricao={`${[microarea?.descricao, ubs?.nome].filter(Boolean).join(', ')}. Estas pessoas precisam voltar à UBS.`}
      />
      <Aviso tom="info" className="mb-4" titulo="Sigilo">
        Por segurança, você vê só que há um retorno pendente, não o motivo clínico. Oriente a pessoa a procurar a
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
        tituloAba="Painel"
        descricao="Rede municipal, últimos 90 dias. Dados agregados, sem identificação de pessoas."
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
          <Resumo>
            <Stat rotulo="Testagens" valor={data.geral.testagens.toLocaleString('pt-BR')} detalhe={`${data.geral.pessoasTestadas} pessoas`} />
            <Stat rotulo="Coleta do confirmatório no prazo" valor={pct(data.geral.coletaNoPrazo.pct)} detalhe={`${data.geral.coletaNoPrazo.num} de ${data.geral.coletaNoPrazo.den}`} tom="primario" />
            <Stat rotulo="Gestantes com sífilis tratadas no dia" valor={pct(data.geral.gestanteSifilisTratadaMesmoDia.pct)} detalhe={`${data.geral.gestanteSifilisTratadaMesmoDia.num} de ${data.geral.gestanteSifilisTratadaMesmoDia.den}`} tom="acento" />
            <Stat rotulo="Notificações no prazo" valor={pct(data.geral.notificacoesNoPrazo.pct)} detalhe={`${data.geral.notificacoesNoPrazo.num} de ${data.geral.notificacoesNoPrazo.den}`} tom="primario" />
          </Resumo>
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
        tituloAba="Painel"
        descricao="Administração do sistema. Você não tem acesso a dados clínicos."
        acoes={
          <LinkButton to="/configuracoes" icone={ICONE.configuracoes}>
            Configurações
          </LinkButton>
        }
      />
      <Resumo>
        {(Object.keys(PERFIL_ROTULO) as Perfil[]).map((p) => (
          <Stat key={p} rotulo={PERFIL_ROTULO[p]} valor={porPerfil[p] ?? 0} detalhe={(porPerfil[p] ?? 0) === 1 ? 'usuário ativo' : 'usuários ativos'} />
        ))}
      </Resumo>
      <Card className="mt-6" aria-labelledby="t-aud">
        <CardHeader
          id="t-aud"
          titulo="Atividade recente"
          icone={<ICONE.auditoria className="size-5" aria-hidden />}
          acoes={
            <LinkButton to="/auditoria" variante="fantasma" tamanho="sm">
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
                    <span className="font-bold">{autor?.nome ?? 'Sistema'}</span> {evento.descricao.charAt(0).toLowerCase() + evento.descricao.slice(1)}
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
