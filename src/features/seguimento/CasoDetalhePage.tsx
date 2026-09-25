import { ClipboardCopy, MessageSquarePlus, Plus, UserPlus, XCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { usePode } from '@/app/sessao'
import { ICONE } from '@/components/icones'
import { AgravoBadge, Badge, GestanteBadge, PrazoBadge, StatusCasoBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Aviso, Carregando, EstadoErro } from '@/components/ui/Feedback'
import { Checkbox, Field, Input, RadioCards, Select, Textarea } from '@/components/ui/Form'
import { DescricaoLista, LinhaDoTempo, Medidor, PageHeader, Stepper, type ItemLinhaDoTempo } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import type { CasoDetalhe } from '@/data/api'
import { useAcaoCaso, useCaso, useMarcarEnviada } from '@/data/hooks'
import { formatarCns, formatarCpf } from '@/domain/rules/documentos'
import { tratamentoPadrao, type AcaoCaso } from '@/domain/rules/seguimento'
import {
  AGRAVO_NOTIFICACAO_ROTULO,
  AGRAVO_ROTULO,
  DESFECHO_ROTULO,
  DESTINO_ROTULO,
  ESCOLARIDADE_ROTULO,
  RACA_ROTULO,
  RESULTADO_TENTATIVA_ROTULO,
  SEXO_ROTULO,
} from '@/domain/rotulos'
import type { TipoDesfecho } from '@/domain/types'
import { formatarData, formatarDataHora, hojeISO } from '@/lib/datas'
import { ICONE_PENDENCIA } from './componentes'

type TipoDialogo = 'coleta' | 'resultado' | 'tratamento' | 'dose' | 'seguimento' | 'parceria' | 'encerrar' | 'anotar' | null

const TITULOS_VDRL = ['Não reagente', '1:1', '1:2', '1:4', '1:8', '1:16', '1:32', '1:64', '1:128', '1:256']
const idLocal = () => Math.random().toString(36).slice(2, 10)

function DialogoAcao({ tipo, detalhe, aoFechar }: { tipo: TipoDialogo; detalhe: CasoDetalhe; aoFechar: () => void }) {
  const { caso } = detalhe
  const executar = useAcaoCaso(caso.id)
  const toast = useToast()
  const hoje = hojeISO()
  const [data, setData] = useState(hoje)
  const [resultado, setResultado] = useState<'confirmado' | 'descartado'>()
  const [titulo, setTitulo] = useState('')
  const [esquema, setEsquema] = useState(caso.tratamento?.esquema ?? tratamentoPadrao(caso.agravo).esquema)
  const [texto, setTexto] = useState('')
  const [desfecho, setDesfecho] = useState<TipoDesfecho | ''>('')
  const [erro, setErro] = useState<string>()
  const proximaDose = caso.tratamento?.doses.find((d) => !d.aplicadaEm)

  const configuracao: Record<Exclude<TipoDialogo, null>, { titulo: string; rotulo: string; montar: () => AcaoCaso | string }> = {
    coleta: {
      titulo: `Registrar coleta — ${caso.confirmatorio.exame}`,
      rotulo: 'Registrar coleta',
      montar: () => ({ tipo: 'registrar_coleta', data }),
    },
    resultado: {
      titulo: `Resultado — ${caso.confirmatorio.exame}`,
      rotulo: 'Salvar resultado',
      montar: () =>
        !resultado
          ? 'Selecione o resultado.'
          : caso.agravo === 'sifilis' && resultado === 'confirmado' && !titulo
            ? 'Informe a titulação do VDRL (necessária para o seguimento).'
            : { tipo: 'registrar_resultado', data, resultado, titulo: titulo || undefined },
    },
    tratamento: {
      titulo: caso.agravo === 'sifilis' ? 'Iniciar tratamento (1ª dose)' : 'Registrar início do tratamento / vinculação',
      rotulo: 'Registrar início',
      montar: () =>
        caso.tratamento && caso.tratamento.doses.length > 0 && !caso.tratamento.iniciadoEm
          ? { tipo: 'aplicar_dose', numero: 1, data }
          : { tipo: 'iniciar_tratamento', data, esquema },
    },
    dose: {
      titulo: `Aplicar ${proximaDose?.numero}ª dose`,
      rotulo: 'Registrar aplicação',
      montar: () => ({ tipo: 'aplicar_dose', numero: proximaDose!.numero, data }),
    },
    seguimento: {
      titulo: 'Registrar VDRL de seguimento',
      rotulo: 'Salvar exame',
      montar: () => (!titulo ? 'Selecione o resultado.' : { tipo: 'registrar_seguimento', id: idLocal(), data, exame: 'VDRL', resultado: titulo }),
    },
    parceria: {
      titulo: 'Adicionar parceria sexual',
      rotulo: 'Adicionar',
      montar: () => (texto.trim().length < 2 ? 'Informe um nome ou identificação.' : { tipo: 'adicionar_parceria', id: idLocal(), nome: texto.trim() }),
    },
    encerrar: {
      titulo: 'Encerrar caso',
      rotulo: 'Encerrar caso',
      montar: () => (!desfecho ? 'Selecione o desfecho.' : { tipo: 'encerrar', desfecho: { tipo: desfecho, data, observacao: texto || undefined } }),
    },
    anotar: {
      titulo: 'Nova anotação',
      rotulo: 'Salvar anotação',
      montar: () => (texto.trim().length < 3 ? 'Escreva a anotação.' : { tipo: 'anotar', id: idLocal(), data: new Date().toISOString(), autorId: '', texto: texto.trim() }),
    },
  }

  if (!tipo) return <Dialog aberto={false} aoFechar={aoFechar} titulo="" />
  const cfg = configuracao[tipo]

  const salvar = async () => {
    const acao = cfg.montar()
    if (typeof acao === 'string') {
      setErro(acao)
      return
    }
    try {
      await executar.mutateAsync(acao)
      toast.sucesso('Caso atualizado.')
      aoFechar()
    } catch (e) {
      toast.erro(e)
    }
  }

  const campoData = (
    <Field label="Data" obrigatorio dica="Não pode ser futura.">
      <Input type="date" value={data} max={hoje} min={caso.abertoEm} onChange={(e) => setData(e.target.value)} />
    </Field>
  )

  let conteudo: ReactNode = null
  if (tipo === 'coleta') conteudo = campoData
  if (tipo === 'resultado')
    conteudo = (
      <>
        {campoData}
        <RadioCards
          legenda="Resultado"
          nome="resultado-conf"
          valor={resultado}
          onChange={setResultado}
          colunas={2}
          opcoes={[
            { valor: 'confirmado', rotulo: 'Confirmado', descricao: 'Infecção confirmada', classeSelecionado: 'border-danger bg-danger-soft' },
            {
              valor: 'descartado',
              rotulo: 'Descartado',
              descricao: caso.tratamento?.iniciadoEm ? 'O caso segue aberto: há tratamento em curso.' : 'Encerra o caso automaticamente.',
              classeSelecionado: 'border-success bg-success-soft',
            },
          ]}
        />
        {caso.agravo === 'sifilis' && resultado === 'confirmado' && (
          <Field label="Titulação do VDRL" obrigatorio>
            <Select value={titulo} onChange={(e) => setTitulo(e.target.value)}>
              <option value="">Selecione…</option>
              {TITULOS_VDRL.slice(1).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
        )}
      </>
    )
  if (tipo === 'tratamento')
    conteudo = (
      <>
        {campoData}
        {!(caso.tratamento && caso.tratamento.doses.length > 0) && (
          <Field label="Esquema / conduta">
            <Input value={esquema} onChange={(e) => setEsquema(e.target.value)} />
          </Field>
        )}
        {caso.agravo === 'sifilis' && (
          <Aviso tom="info">As próximas doses serão programadas com intervalo de 7 dias. Intervalo acima de 14 dias exige reiniciar o esquema.</Aviso>
        )}
      </>
    )
  if (tipo === 'dose')
    conteudo = (
      <>
        <p className="text-sm text-muted">Prevista para {formatarData(proximaDose?.previstaEm)}.</p>
        {campoData}
      </>
    )
  if (tipo === 'seguimento')
    conteudo = (
      <>
        {campoData}
        <Field label="Resultado (titulação)" obrigatorio>
          <Select value={titulo} onChange={(e) => setTitulo(e.target.value)}>
            <option value="">Selecione…</option>
            {TITULOS_VDRL.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
      </>
    )
  if (tipo === 'parceria')
    conteudo = (
      <Field label="Nome ou identificação" dica="Use apenas o necessário para a convocação.">
        <Input value={texto} onChange={(e) => setTexto(e.target.value)} />
      </Field>
    )
  if (tipo === 'encerrar')
    conteudo = (
      <>
        <Aviso tom="atencao">Um caso encerrado não pode mais ser alterado (apenas anotações).</Aviso>
        <Field label="Desfecho" obrigatorio>
          <Select value={desfecho} onChange={(e) => setDesfecho(e.target.value as TipoDesfecho)}>
            <option value="">Selecione…</option>
            {Object.entries(DESFECHO_ROTULO)
              .filter(([v]) => v !== 'descartado')
              .map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
          </Select>
        </Field>
        {campoData}
        <Field label="Observação">
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} />
        </Field>
      </>
    )
  if (tipo === 'anotar')
    conteudo = (
      <Field label="Anotação" dica="Registre fatos relevantes ao cuidado. Fica visível para a equipe da UBS.">
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={600} />
      </Field>
    )

  return (
    <Dialog
      aberto
      aoFechar={aoFechar}
      titulo={cfg.titulo}
      descricao={`${detalhe.pessoa.nome} · ${AGRAVO_ROTULO[caso.agravo]}`}
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variante={tipo === 'encerrar' ? 'perigo' : 'primario'} onClick={salvar} carregando={executar.isPending}>
            {cfg.rotulo}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {erro && <Aviso tom="perigo">{erro}</Aviso>}
        {conteudo}
      </div>
    </Dialog>
  )
}

function textoFicha(d: CasoDetalhe): string {
  const p = d.pessoaCompleta
  const linhas = [
    `Agravo: ${d.notificacao ? AGRAVO_NOTIFICACAO_ROTULO[d.notificacao.agravoNotificacao] : AGRAVO_ROTULO[d.caso.agravo]}`,
    `Nome: ${p.nome}`,
    `Nascimento: ${formatarData(p.dataNascimento)} · Sexo: ${SEXO_ROTULO[p.sexo]}`,
    `CNS: ${formatarCns(p.cns)} · CPF: ${formatarCpf(p.cpf)}`,
    `Nome da mãe: ${p.nomeMae ?? '—'}`,
    `Raça/cor: ${RACA_ROTULO[p.racaCor]} · Escolaridade: ${ESCOLARIDADE_ROTULO[p.escolaridade]}`,
    `Endereço: ${p.endereco.logradouro}, ${p.endereco.numero} — ${p.endereco.bairro}`,
    `Data do teste rápido: ${formatarData(d.caso.abertoEm)}`,
    `Confirmatório: ${d.caso.confirmatorio.exame} ${d.caso.confirmatorio.resultado ?? 'pendente'} ${d.caso.confirmatorio.titulo ?? ''}`.trim(),
  ]
  if (d.caso.gestante) linhas.push(`Gestante · DUM: ${formatarData(p.dum)}`)
  if (d.caso.tratamento?.iniciadoEm) linhas.push(`Tratamento: ${d.caso.tratamento.esquema} · início ${formatarData(d.caso.tratamento.iniciadoEm)}`)
  return linhas.join('\n')
}

function CartaoNotificacao({ d }: { d: CasoDetalhe }) {
  const podeEnviar = usePode('notificacao.enviar')
  const marcar = useMarcarEnviada()
  const toast = useToast()
  const [aberto, setAberto] = useState(false)
  const [protocolo, setProtocolo] = useState('')
  const n = d.notificacao
  const c = d.completude
  return (
    <Card aria-labelledby="t-notif">
      <CardHeader id="t-notif" titulo="Notificação compulsória" icone={<ICONE.notificacoes className="size-5" aria-hidden />} nivel={2} />
      <CardBody className="flex flex-col gap-4">
        {!n ? (
          <p className="text-sm text-muted">
            Ainda não notificável.{' '}
            {d.caso.agravo === 'sifilis' ? 'Sífilis adquirida é notificada após a confirmação.' : 'Notificar após a confirmação diagnóstica.'}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{AGRAVO_NOTIFICACAO_ROTULO[n.agravoNotificacao]}</span>
              {n.status === 'enviada' ? (
                <Badge tom="sucesso" icone={ICONE.ok}>
                  Enviada {formatarData(n.enviadaEm?.slice(0, 10))}
                </Badge>
              ) : (
                <PrazoBadge prazo={n.prazo} diasRestantes={Math.round((Date.parse(n.prazo) - Date.parse(hojeISO())) / 86400000)} />
              )}
            </div>
            <p className="-mt-2 text-sm text-muted">Destino: {DESTINO_ROTULO[n.destino]}{n.protocolo ? ` · ${n.protocolo}` : ''}</p>
          </>
        )}
        <Medidor
          rotulo="Completude da ficha"
          valor={c.percentual}
          tom={c.percentual === 100 ? 'sucesso' : c.pronta ? 'atencao' : 'perigo'}
        />
        <ul className="flex flex-col gap-1 text-sm">
          {c.campos.map((campo) => (
            <li key={campo.campo} className="flex items-center gap-2">
              {campo.ok ? (
                <ICONE.ok className="size-4 shrink-0 text-success" aria-hidden />
              ) : campo.obrigatorio ? (
                <XCircle className="size-4 shrink-0 text-danger" aria-hidden />
              ) : (
                <ICONE.atencao className="size-4 shrink-0 text-warning" aria-hidden />
              )}
              <span className={campo.ok ? '' : 'font-bold'}>{campo.rotulo}</span>
              <span className="sr-only">
                {campo.ok ? ' preenchido' : campo.obrigatorio ? ' obrigatório, faltando' : campo.ignorado ? ' marcado como ignorado' : ' não preenchido'}
              </span>
              {!campo.ok && campo.ignorado && <span className="text-muted">(ignorado)</span>}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {c.percentual < 100 && (
            <LinkButton to={`/pessoas/${d.pessoa.id}/editar`} variante="secundario" tamanho="sm" icone={UserPlus}>
              Completar cadastro
            </LinkButton>
          )}
          <Button
            variante="secundario"
            tamanho="sm"
            icone={ClipboardCopy}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(textoFicha(d))
                toast.sucesso('Dados copiados. Cole na ficha do Sentinela / e-mail.')
              } catch {
                toast.erro('Não foi possível copiar. Verifique a permissão do navegador.')
              }
            }}
          >
            Copiar dados da ficha
          </Button>
          {n && n.status === 'pendente' && podeEnviar && (
            <Button tamanho="sm" icone={ICONE.notificacoes} onClick={() => setAberto(true)} disabled={!c.pronta} title={!c.pronta ? 'Complete os campos obrigatórios' : undefined}>
              Registrar envio
            </Button>
          )}
        </div>
        {n && n.status === 'pendente' && !podeEnviar && <p className="text-xs text-muted">O envio é registrado pela responsável técnica.</p>}
      </CardBody>
      <Dialog
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Registrar envio da notificação"
        descricao={n ? DESTINO_ROTULO[n.destino] : undefined}
        rodape={
          <>
            <Button variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              carregando={marcar.isPending}
              onClick={async () => {
                try {
                  await marcar.mutateAsync({ id: n!.id, protocolo })
                  toast.sucesso('Envio registrado.')
                  setAberto(false)
                } catch (e) {
                  toast.erro(e)
                }
              }}
            >
              Confirmar envio
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Aviso tom="info">
            {n?.destino === 'sentinela'
              ? 'Faça a notificação no Sentinela e informe abaixo o número gerado.'
              : 'Envie a ficha editável por e-mail à DVS e informe abaixo a data/assunto do e-mail.'}
          </Aviso>
          <Field label={n?.destino === 'sentinela' ? 'Número da notificação no Sentinela' : 'Identificação do e-mail enviado'}>
            <Input value={protocolo} onChange={(e) => setProtocolo(e.target.value)} />
          </Field>
        </div>
      </Dialog>
    </Card>
  )
}

function linhaDoTempo(d: CasoDetalhe): ItemLinhaDoTempo[] {
  const { caso } = d
  const itens: (ItemLinhaDoTempo & { ordem: string })[] = [
    { id: 'abertura', ordem: caso.abertoEm, data: formatarData(caso.abertoEm), icone: ICONE.novaTestagem, tom: 'perigo', titulo: 'Teste rápido reagente — caso aberto', descricao: <Link className="text-primary hover:underline" to={`/testagens/${caso.testagemId}`}>Ver testagem</Link> },
  ]
  const c = caso.confirmatorio
  if (c.coletadoEm) itens.push({ id: 'coleta', ordem: c.coletadoEm, data: formatarData(c.coletadoEm), icone: ICONE.confirmatorio, titulo: `Coleta: ${c.exame}` })
  if (c.resultadoEm && !c.dispensado)
    itens.push({ id: 'res', ordem: c.resultadoEm, data: formatarData(c.resultadoEm), icone: ICONE.confirmatorio, tom: c.resultado === 'confirmado' ? 'perigo' : 'sucesso', titulo: `Resultado: ${c.resultado === 'confirmado' ? 'confirmado' : 'descartado'}${c.titulo ? ` (${c.titulo})` : ''}` })
  if (caso.tratamento?.iniciadoEm && caso.tratamento.doses.length === 0)
    itens.push({ id: 'trat', ordem: caso.tratamento.iniciadoEm, data: formatarData(caso.tratamento.iniciadoEm), icone: ICONE.tratamento, tom: 'primario', titulo: `Tratamento iniciado`, descricao: caso.tratamento.esquema })
  for (const dose of caso.tratamento?.doses ?? [])
    if (dose.aplicadaEm) itens.push({ id: `dose${dose.numero}`, ordem: dose.aplicadaEm, data: formatarData(dose.aplicadaEm), icone: ICONE.tratamento, tom: 'primario', titulo: `${dose.numero}ª dose aplicada` })
  for (const s of caso.seguimento.filter((x) => !x.id.endsWith('-base')))
    itens.push({ id: s.id, ordem: s.data, data: formatarData(s.data), icone: ICONE.seguimento, titulo: `${s.exame}: ${s.resultado}` })
  if (d.notificacao?.enviadaEm)
    itens.push({ id: 'notif', ordem: d.notificacao.enviadaEm, data: formatarDataHora(d.notificacao.enviadaEm), icone: ICONE.notificacoes, tom: 'sucesso', titulo: 'Notificação enviada', descricao: d.notificacao.protocolo })
  for (const t of d.tarefas)
    for (const tent of t.tentativas)
      itens.push({ id: tent.id, ordem: tent.data, data: formatarData(tent.data), icone: ICONE.buscaAtiva, tom: 'atencao', titulo: `Busca ativa (${tent.meio}): ${RESULTADO_TENTATIVA_ROTULO[tent.resultado].toLowerCase()}`, descricao: tent.observacao })
  for (const a of caso.anotacoes)
    itens.push({ id: a.id, ordem: a.data, data: formatarDataHora(a.data), icone: MessageSquarePlus, titulo: 'Anotação', descricao: `${a.texto} — ${d.nomes[a.autorId] ?? ''}` })
  if (caso.desfecho)
    itens.push({ id: 'desfecho', ordem: caso.desfecho.data, data: formatarData(caso.desfecho.data), icone: ICONE.ok, tom: 'sucesso', titulo: `Encerrado: ${DESFECHO_ROTULO[caso.desfecho.tipo]}`, descricao: caso.desfecho.observacao })
  return itens.sort((a, b) => b.ordem.localeCompare(a.ordem))
}

export default function CasoDetalhePage() {
  const { id } = useParams()
  const { data, isLoading, error } = useCaso(id)
  const podeEditar = usePode('caso.editar')
  const [dialogo, setDialogo] = useState<TipoDialogo>(null)
  const executar = useAcaoCaso(id ?? '')
  const toast = useToast()

  if (isLoading) return <Carregando />
  if (error || !data) return <EstadoErro erro={error} />
  const { caso, status, pessoa } = data
  const encerrado = status === 'encerrado'
  const c = caso.confirmatorio
  const t = caso.tratamento
  const sifilis = caso.agravo === 'sifilis'

  const etapas = ['Teste rápido', 'Confirmação', 'Tratamento', ...(sifilis ? ['Seguimento sorológico'] : []), 'Desfecho']
  const indice = encerrado
    ? etapas.length
    : status === 'aguardando_coleta' || status === 'aguardando_resultado'
      ? 1
      : status === 'aguardando_tratamento' || status === 'em_tratamento'
        ? 2
        : 3

  // Ações contextuais: só aparecem quando fazem sentido (reconhecer em vez de lembrar).
  const acoes: { tipo: Exclude<TipoDialogo, null>; rotulo: string; icone: typeof Plus; primaria?: boolean }[] = []
  if (!encerrado) {
    if (!c.dispensado && !c.coletadoEm) acoes.push({ tipo: 'coleta', rotulo: 'Registrar coleta do confirmatório', icone: ICONE.confirmatorio, primaria: true })
    if (c.coletadoEm && !c.resultado) acoes.push({ tipo: 'resultado', rotulo: 'Registrar resultado', icone: ICONE.confirmatorio, primaria: true })
    const precisaTratar = c.resultado === 'confirmado' || (sifilis && caso.gestante)
    if (precisaTratar && !t?.iniciadoEm) acoes.push({ tipo: 'tratamento', rotulo: sifilis ? 'Aplicar 1ª dose' : 'Registrar início do tratamento', icone: ICONE.tratamento, primaria: true })
    if (t?.iniciadoEm && t.doses.some((d) => !d.aplicadaEm)) acoes.push({ tipo: 'dose', rotulo: `Aplicar ${t.doses.find((d) => !d.aplicadaEm)!.numero}ª dose`, icone: ICONE.tratamento, primaria: true })
    if (sifilis && t?.iniciadoEm) acoes.push({ tipo: 'seguimento', rotulo: 'Registrar VDRL de seguimento', icone: ICONE.seguimento })
    if (sifilis) acoes.push({ tipo: 'parceria', rotulo: 'Adicionar parceria', icone: UserPlus })
  }
  acoes.push({ tipo: 'anotar', rotulo: 'Anotar', icone: MessageSquarePlus })
  if (!encerrado) acoes.push({ tipo: 'encerrar', rotulo: 'Encerrar caso', icone: ICONE.ok })

  return (
    <>
      <PageHeader
        titulo={pessoa.nomeSocial ?? pessoa.nome}
        tituloAba={`Caso de ${AGRAVO_ROTULO[caso.agravo]}`}
        trilha={[{ rotulo: 'Seguimento', para: '/seguimento' }, { rotulo: `${AGRAVO_ROTULO[caso.agravo]} — ${pessoa.nome}` }]}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <AgravoBadge agravo={caso.agravo} completo />
            {caso.gestante && <GestanteBadge />}
            <StatusCasoBadge status={status} />
            <span>aberto em {formatarData(caso.abertoEm)}</span>
          </span>
        }
        acoes={
          <LinkButton to={`/pessoas/${pessoa.id}`} variante="secundario" icone={ICONE.pessoas}>
            Ver pessoa
          </LinkButton>
        }
      />

      <Card className="mb-6">
        <CardBody className="pt-5">
          <Stepper passos={etapas} atual={indice} />
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-6">
          <Card aria-labelledby="t-prox">
            <CardHeader id="t-prox" titulo="Próximas ações" icone={<ICONE.prazo className="size-5" aria-hidden />} />
            <CardBody className="flex flex-col gap-4">
              {data.pendencias.length === 0 ? (
                <Aviso tom="sucesso">{encerrado ? 'Caso encerrado.' : 'Nenhuma pendência no momento.'}</Aviso>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.pendencias.map((p) => {
                    const Icone = ICONE_PENDENCIA[p.tipo]
                    return (
                      <li key={p.chave} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                        <Icone className={p.vencida ? 'size-5 text-danger' : 'size-5 text-primary'} aria-hidden />
                        <span className="flex-1 font-bold">{p.descricao}</span>
                        <PrazoBadge prazo={p.prazo} diasRestantes={p.diasRestantes} />
                      </li>
                    )
                  })}
                </ul>
              )}
              {podeEditar && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {acoes.map((a) => (
                    <Button
                      key={a.tipo}
                      variante={a.primaria ? 'primario' : a.tipo === 'encerrar' ? 'fantasma' : 'secundario'}
                      icone={a.icone}
                      onClick={() => setDialogo(a.tipo)}
                    >
                      {a.rotulo}
                    </Button>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card aria-labelledby="t-conf">
              <CardHeader id="t-conf" titulo="Confirmação diagnóstica" icone={<ICONE.confirmatorio className="size-5" aria-hidden />} nivel={2} />
              <CardBody>
                <DescricaoLista
                  colunas={1}
                  itens={[
                    { rotulo: 'Exame', valor: c.exame },
                    { rotulo: 'Coleta', valor: c.dispensado ? 'Dispensada (fluxograma com dois TR)' : formatarData(c.coletadoEm) },
                    {
                      rotulo: 'Resultado',
                      valor: c.resultado ? (
                        <Badge tom={c.resultado === 'confirmado' ? 'perigo' : 'sucesso'}>
                          {c.resultado === 'confirmado' ? 'Confirmado' : 'Descartado'}
                          {c.titulo ? ` · ${c.titulo}` : ''}
                        </Badge>
                      ) : (
                        'Aguardando'
                      ),
                    },
                  ]}
                />
              </CardBody>
            </Card>

            <Card aria-labelledby="t-trat">
              <CardHeader id="t-trat" titulo="Tratamento" icone={<ICONE.tratamento className="size-5" aria-hidden />} nivel={2} />
              <CardBody className="flex flex-col gap-3">
                {!t ? (
                  <p className="text-sm text-muted">Ainda não iniciado.</p>
                ) : (
                  <>
                    <p className="text-sm">{t.esquema}</p>
                    <p className="text-sm text-muted">
                      {t.local === 'ubs' ? 'Na UBS' : 'Serviço especializado'} · início {formatarData(t.iniciadoEm)}
                    </p>
                    {t.doses.length > 0 && (
                      <ol className="flex flex-col gap-1.5">
                        {t.doses.map((d) => (
                          <li key={d.numero} className="flex items-center gap-2 text-sm">
                            {d.aplicadaEm ? (
                              <ICONE.ok className="size-4 text-success" aria-hidden />
                            ) : (
                              <ICONE.aguardando className="size-4 text-muted" aria-hidden />
                            )}
                            <span className="font-bold">{d.numero}ª dose</span>
                            <span className="text-muted">
                              {d.aplicadaEm ? `aplicada em ${formatarData(d.aplicadaEm)}` : `prevista para ${formatarData(d.previstaEm)}`}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {data.respostaSorologica && (
                      <Badge
                        tom={data.respostaSorologica === 'adequada' ? 'sucesso' : data.respostaSorologica === 'atencao' ? 'perigo' : 'info'}
                        className="self-start"
                      >
                        Resposta sorológica:{' '}
                        {data.respostaSorologica === 'adequada' ? 'adequada' : data.respostaSorologica === 'atencao' ? 'investigar falha/reinfecção' : 'aguardando exames'}
                      </Badge>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
          </div>

          {sifilis && (
            <Card aria-labelledby="t-parc">
              <CardHeader id="t-parc" titulo="Parcerias sexuais" icone={<ICONE.pessoas className="size-5" aria-hidden />} descricao="Tratar parcerias evita reinfecção — obrigatório no pré-natal." />
              <CardBody>
                {caso.parcerias.length === 0 ? (
                  <p className="text-sm text-muted">Nenhuma parceria registrada.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {caso.parcerias.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
                        <span className="min-w-40 flex-1 font-bold">{p.nome}</span>
                        <Checkbox
                          label="Testada"
                          checked={p.testada}
                          disabled={!podeEditar || encerrado || executar.isPending}
                          onChange={(e) =>
                            executar.mutate({ tipo: 'atualizar_parceria', id: p.id, testada: e.target.checked, tratada: p.tratada }, { onError: (er) => toast.erro(er) })
                          }
                        />
                        <Checkbox
                          label="Tratada"
                          checked={p.tratada}
                          disabled={!podeEditar || encerrado || executar.isPending}
                          onChange={(e) =>
                            executar.mutate({ tipo: 'atualizar_parceria', id: p.id, testada: p.testada || e.target.checked, tratada: e.target.checked }, { onError: (er) => toast.erro(er) })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          )}

          <Card aria-labelledby="t-hist">
            <CardHeader id="t-hist" titulo="Histórico do caso" icone={<ICONE.atividade className="size-5" aria-hidden />} />
            <CardBody>
              <LinhaDoTempo itens={linhaDoTempo(data)} />
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <CartaoNotificacao d={data} />
          {data.tarefas.length > 0 && (
            <Card aria-labelledby="t-busca">
              <CardHeader id="t-busca" titulo="Busca ativa" icone={<ICONE.buscaAtiva className="size-5" aria-hidden />} nivel={2} />
              <CardBody className="flex flex-col gap-2">
                {data.tarefas.map((tf) => (
                  <div key={tf.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="font-bold">{tf.motivo}</p>
                    <p className="text-muted">
                      {tf.status === 'aberta' ? 'Aberta' : `Resolvida em ${formatarData(tf.concluidaEm)}`} · {tf.tentativas.length} tentativa(s)
                    </p>
                  </div>
                ))}
                <Link to="/busca-ativa" className="text-sm font-bold text-primary hover:underline">
                  Ir para busca ativa
                </Link>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
      {dialogo && <DialogoAcao key={dialogo} tipo={dialogo} detalhe={data} aoFechar={() => setDialogo(null)} />}
    </>
  )
}
