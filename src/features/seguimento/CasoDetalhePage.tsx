import { ClipboardCopy, MessageSquarePlus, Plus, RotateCcw, Undo2, UserPlus, XCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { usePode } from '@/app/sessao'
import { ICONE } from '@/components/icones'
import { AgravoBadge, Badge, GestanteBadge, PrazoBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { Aviso, Carregando, EstadoErro } from '@/components/ui/Feedback'
import { FitaDoCaso } from '@/components/ui/FitaDoCaso'
import { Checkbox, Field, Input, InputData, RadioCards, Select, Textarea } from '@/components/ui/Form'
import { DescricaoLista, LinhaDoTempo, Medidor, PageHeader, type ItemLinhaDoTempo } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import type { CasoDetalhe } from '@/data/api'
import { useAcaoCaso, useCaso, useDesfazerRegistroCaso, useMarcarEnviada } from '@/data/hooks'
import { formatarCns, formatarCpf } from '@/domain/rules/documentos'
import { nomeDeExibicao } from '@/domain/rules/pessoa'
import {
  descreverRegistro,
  etapasDoCaso,
  motivoParaNaoDesfazer,
  registroDaAcao,
  tratamentoPadrao,
  type AcaoCaso,
  type RegistroDesfazivel,
} from '@/domain/rules/seguimento'
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
import { plural } from '@/lib/texto'
import { ICONE_PENDENCIA } from './componentes'

type TipoDialogo = 'coleta' | 'resultado' | 'tratamento' | 'dose' | 'seguimento' | 'parceria' | 'encerrar' | 'anotar' | null

const TITULOS_VDRL = ['Não reagente', '1:1', '1:2', '1:4', '1:8', '1:16', '1:32', '1:64', '1:128', '1:256']
const idLocal = () => Math.random().toString(36).slice(2, 10)

/** Campo que recebe a mensagem de validação, para o erro aparecer junto dele (e não no topo do diálogo). */
type CampoErro = 'data' | 'resultado' | 'titulo' | 'texto' | 'desfecho'
type ErroCampo = { campo: CampoErro; mensagem: string }

function DialogoAcao({ tipo, detalhe, aoFechar }: { tipo: TipoDialogo; detalhe: CasoDetalhe; aoFechar: () => void }) {
  const { caso } = detalhe
  const executar = useAcaoCaso(caso.id)
  const desfazer = useDesfazerRegistroCaso()
  const toast = useToast()
  const hoje = hojeISO()
  const esquemaInicial = caso.tratamento?.esquema ?? tratamentoPadrao(caso.agravo).esquema
  const [data, setData] = useState(hoje)
  const [resultado, setResultado] = useState<'confirmado' | 'descartado'>()
  const [titulo, setTitulo] = useState('')
  const [esquema, setEsquema] = useState(esquemaInicial)
  const [texto, setTexto] = useState('')
  const [desfecho, setDesfecho] = useState<TipoDesfecho | ''>('')
  const [erro, setErro] = useState<ErroCampo>()
  const proximaDose = caso.tratamento?.doses.find((d) => !d.aplicadaEm)
  const alterado = data !== hoje || Boolean(resultado || titulo || texto.trim() || desfecho) || esquema !== esquemaInicial
  const erroDe = (campo: CampoErro) => (erro?.campo === campo ? erro.mensagem : undefined)
  const limparErro = () => setErro(undefined)

  const configuracao: Record<Exclude<TipoDialogo, null>, { titulo: string; rotulo: string; sucesso: string; montar: () => AcaoCaso | ErroCampo }> = {
    coleta: {
      titulo: `Registrar coleta: ${caso.confirmatorio.exame}`,
      rotulo: 'Registrar coleta',
      sucesso: 'Coleta registrada.',
      montar: () => ({ tipo: 'registrar_coleta', data }),
    },
    resultado: {
      titulo: `Registrar resultado: ${caso.confirmatorio.exame}`,
      rotulo: 'Salvar resultado',
      sucesso: 'Resultado registrado.',
      montar: () =>
        !resultado
          ? { campo: 'resultado', mensagem: 'Selecione o resultado.' }
          : caso.agravo === 'sifilis' && resultado === 'confirmado' && !titulo
            ? { campo: 'titulo', mensagem: 'Informe a titulação do VDRL (necessária para o seguimento).' }
            : { tipo: 'registrar_resultado', data, resultado, titulo: titulo || undefined },
    },
    tratamento: {
      titulo: caso.agravo === 'sifilis' ? 'Iniciar tratamento (1ª dose)' : 'Registrar início do tratamento ou vinculação',
      rotulo: 'Registrar início',
      sucesso: caso.agravo === 'sifilis' ? '1ª dose registrada.' : 'Início do tratamento registrado.',
      montar: () =>
        caso.tratamento && caso.tratamento.doses.length > 0 && !caso.tratamento.iniciadoEm
          ? { tipo: 'aplicar_dose', numero: 1, data }
          : { tipo: 'iniciar_tratamento', data, esquema },
    },
    dose: {
      titulo: `Aplicar ${proximaDose?.numero}ª dose`,
      rotulo: 'Registrar aplicação',
      sucesso: `${proximaDose?.numero}ª dose registrada.`,
      montar: () => ({ tipo: 'aplicar_dose', numero: proximaDose!.numero, data }),
    },
    seguimento: {
      titulo: 'Registrar VDRL de seguimento',
      rotulo: 'Salvar exame',
      sucesso: 'Exame de seguimento registrado.',
      montar: () =>
        !titulo ? { campo: 'titulo', mensagem: 'Selecione o resultado.' } : { tipo: 'registrar_seguimento', id: idLocal(), data, exame: 'VDRL', resultado: titulo },
    },
    parceria: {
      titulo: 'Adicionar parceria sexual',
      rotulo: 'Adicionar',
      sucesso: 'Parceria adicionada.',
      montar: () =>
        texto.trim().length < 2 ? { campo: 'texto', mensagem: 'Informe um nome ou identificação.' } : { tipo: 'adicionar_parceria', id: idLocal(), nome: texto.trim() },
    },
    encerrar: {
      titulo: 'Encerrar caso',
      rotulo: 'Encerrar caso',
      sucesso: 'Caso encerrado.',
      montar: () =>
        !desfecho ? { campo: 'desfecho', mensagem: 'Selecione o desfecho.' } : { tipo: 'encerrar', desfecho: { tipo: desfecho, data, observacao: texto || undefined } },
    },
    anotar: {
      titulo: 'Nova anotação',
      rotulo: 'Salvar anotação',
      sucesso: 'Anotação salva.',
      montar: () =>
        texto.trim().length < 3 ? { campo: 'texto', mensagem: 'Escreva a anotação.' } : { tipo: 'anotar', id: idLocal(), data: new Date().toISOString(), autorId: '', texto: texto.trim() },
    },
  }

  if (!tipo) return <Dialog aberto={false} aoFechar={aoFechar} titulo="" />
  const cfg = configuracao[tipo]

  const salvar = async () => {
    if (tipo !== 'parceria' && tipo !== 'anotar' && !data) {
      setErro({ campo: 'data', mensagem: `Informe uma data válida, de ${formatarData(caso.abertoEm)} até hoje (dd/mm/aaaa).` })
      return
    }
    const acao = cfg.montar()
    if ('campo' in acao) {
      setErro(acao)
      return
    }
    try {
      await executar.mutateAsync(acao)
      // Desfazer logo depois de salvar (Nielsen 3): corrige data ou registro errado sem procurar no histórico.
      const registro = registroDaAcao(caso, acao)
      toast.sucesso(
        cfg.sucesso,
        registro
          ? {
              rotulo: 'Desfazer',
              aoClicar: () =>
                desfazer(caso.id, registro).then(
                  () => toast.info(`Desfeito: ${descreverRegistro(registro)}.`),
                  (e) => toast.erro(e),
                ),
            }
          : undefined,
      )
      aoFechar()
    } catch (e) {
      toast.erro(e)
    }
  }

  const campoData = (
    <Field label="Data" obrigatorio dica="Não pode ser futura." erro={erroDe('data')}>
      <InputData
        value={data}
        max={hoje}
        min={caso.abertoEm}
        onChange={(v) => {
          setData(v)
          if (erro?.campo === 'data') limparErro()
        }}
      />
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
          onChange={(v) => {
            setResultado(v)
            limparErro()
          }}
          colunas={2}
          erro={erroDe('resultado')}
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
          <Field label="Titulação do VDRL" obrigatorio erro={erroDe('titulo')}>
            <Select
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value)
                limparErro()
              }}
            >
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
          <Field label="Esquema ou conduta">
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
        <Field label="Resultado (titulação)" obrigatorio erro={erroDe('titulo')}>
          <Select
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value)
              limparErro()
            }}
          >
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
      <Field label="Nome ou identificação" obrigatorio dica="Use apenas o necessário para a convocação." erro={erroDe('texto')}>
        <Input
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            limparErro()
          }}
        />
      </Field>
    )
  if (tipo === 'encerrar')
    conteudo = (
      <>
        <Aviso tom="atencao">Depois de encerrado, o caso só recebe anotações. Se precisar, dá para reabri-lo pelo histórico.</Aviso>
        <Field label="Desfecho" obrigatorio erro={erroDe('desfecho')}>
          <Select
            value={desfecho}
            onChange={(e) => {
              setDesfecho(e.target.value as TipoDesfecho)
              limparErro()
            }}
          >
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
      <Field label="Anotação" obrigatorio dica="Registre fatos relevantes ao cuidado. Fica visível para a equipe da UBS." erro={erroDe('texto')}>
        <Textarea
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            limparErro()
          }}
          maxLength={600}
        />
      </Field>
    )

  return (
    <Dialog
      aberto
      aoFechar={aoFechar}
      titulo={cfg.titulo}
      descricao={`${nomeDeExibicao(detalhe.pessoa)}, ${AGRAVO_ROTULO[caso.agravo]}`}
      alteracoesPendentes={alterado}
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
      <div className="flex flex-col gap-4">{conteudo}</div>
    </Dialog>
  )
}

function textoFicha(d: CasoDetalhe): string {
  const p = d.pessoaCompleta
  const linhas = [
    `Agravo: ${d.notificacao ? AGRAVO_NOTIFICACAO_ROTULO[d.notificacao.agravoNotificacao] : AGRAVO_ROTULO[d.caso.agravo]}`,
    `Nome: ${p.nome}`,
    ...(p.nomeSocial ? [`Nome social: ${p.nomeSocial}`] : []),
    `Nascimento: ${formatarData(p.dataNascimento)}`,
    `Sexo: ${SEXO_ROTULO[p.sexo]}`,
    `CNS: ${formatarCns(p.cns)}`,
    `CPF: ${formatarCpf(p.cpf)}`,
    `Nome da mãe: ${p.nomeMae ?? 'não informado'}`,
    `Raça/cor: ${RACA_ROTULO[p.racaCor]}`,
    `Escolaridade: ${ESCOLARIDADE_ROTULO[p.escolaridade]}`,
    `Endereço: ${p.endereco.logradouro}, ${p.endereco.numero}, ${p.endereco.bairro}`,
    `Data do teste rápido: ${formatarData(d.caso.abertoEm)}`,
    `Confirmatório: ${d.caso.confirmatorio.exame} ${d.caso.confirmatorio.resultado ?? 'pendente'} ${d.caso.confirmatorio.titulo ?? ''}`.trim(),
  ]
  if (d.caso.gestante) linhas.push(`Gestante, DUM: ${formatarData(p.dum)}`)
  if (d.caso.tratamento?.iniciadoEm) linhas.push(`Tratamento: ${d.caso.tratamento.esquema}, início em ${formatarData(d.caso.tratamento.iniciadoEm)}`)
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
            <p className="-mt-2 text-sm text-muted">Destino: {DESTINO_ROTULO[n.destino]}{n.protocolo ? `, protocolo ${n.protocolo}` : ''}</p>
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
                toast.sucesso('Dados copiados. Cole na ficha do Sentinela ou no e-mail.')
              } catch {
                toast.erro('Não foi possível copiar. Verifique a permissão do navegador.')
              }
            }}
          >
            Copiar dados da ficha
          </Button>
          {n && n.status === 'pendente' && podeEnviar && (
            <Button tamanho="sm" icone={ICONE.notificacoes} onClick={() => setAberto(true)} disabled={!c.pronta}>
              Registrar envio
            </Button>
          )}
        </div>
        {n && n.status === 'pendente' && podeEnviar && !c.pronta && (
          <p className="text-sm text-muted">
            Para registrar o envio, complete os campos obrigatórios marcados com <XCircle className="inline size-4 align-text-bottom text-danger" aria-label="X" />.
          </p>
        )}
        {n && n.status === 'pendente' && !podeEnviar && <p className="text-xs text-muted">O envio é registrado pela responsável técnica.</p>}
      </CardBody>
      <Dialog
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        alteracoesPendentes={protocolo.trim() !== ''}
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
              : 'Envie a ficha editável por e-mail à DVS e informe abaixo a data e o assunto do e-mail.'}
          </Aviso>
          <Field label={n?.destino === 'sentinela' ? 'Número da notificação no Sentinela' : 'Identificação do e-mail enviado'}>
            <Input value={protocolo} onChange={(e) => setProtocolo(e.target.value)} />
          </Field>
        </div>
      </Dialog>
    </Card>
  )
}

/**
 * Itens do histórico. Registros que podem ser desfeitos agora (do mais recente para trás) ganham um
 * "Desfazer" discreto: é assim que se corrige uma data ou um registro feito por engano.
 */
function linhaDoTempo(d: CasoDetalhe, botaoDesfazer?: (r: RegistroDesfazivel) => ReactNode): ItemLinhaDoTempo[] {
  const { caso } = d
  const desfazer = (r: RegistroDesfazivel) => (botaoDesfazer && !motivoParaNaoDesfazer(caso, r) ? botaoDesfazer(r) : undefined)
  const itens: (ItemLinhaDoTempo & { ordem: string })[] = [
    { id: 'abertura', ordem: caso.abertoEm, data: formatarData(caso.abertoEm), icone: ICONE.novaTestagem, tom: 'perigo', titulo: 'Teste rápido reagente, caso aberto', descricao: <Link className="text-primary hover:underline" to={`/testagens/${caso.testagemId}`}>Ver testagem</Link> },
  ]
  const c = caso.confirmatorio
  if (c.coletadoEm) itens.push({ id: 'coleta', ordem: c.coletadoEm, data: formatarData(c.coletadoEm), icone: ICONE.confirmatorio, titulo: `Coleta: ${c.exame}`, acao: desfazer({ tipo: 'coleta' }) })
  if (c.resultadoEm && !c.dispensado)
    itens.push({ id: 'res', ordem: c.resultadoEm, data: formatarData(c.resultadoEm), icone: ICONE.confirmatorio, tom: c.resultado === 'confirmado' ? 'perigo' : 'sucesso', titulo: `Resultado: ${c.resultado === 'confirmado' ? 'confirmado' : 'descartado'}${c.titulo ? ` (${c.titulo})` : ''}`, acao: desfazer({ tipo: 'resultado' }) })
  if (caso.tratamento?.iniciadoEm && caso.tratamento.doses.length === 0)
    itens.push({ id: 'trat', ordem: caso.tratamento.iniciadoEm, data: formatarData(caso.tratamento.iniciadoEm), icone: ICONE.tratamento, tom: 'primario', titulo: 'Tratamento iniciado', descricao: caso.tratamento.esquema, acao: desfazer({ tipo: 'tratamento' }) })
  for (const dose of caso.tratamento?.doses ?? [])
    if (dose.aplicadaEm) itens.push({ id: `dose${dose.numero}`, ordem: dose.aplicadaEm, data: formatarData(dose.aplicadaEm), icone: ICONE.tratamento, tom: 'primario', titulo: `${dose.numero}ª dose aplicada`, acao: desfazer({ tipo: 'dose', numero: dose.numero }) })
  for (const s of caso.seguimento.filter((x) => !x.id.endsWith('-base')))
    itens.push({ id: s.id, ordem: s.data, data: formatarData(s.data), icone: ICONE.seguimento, titulo: `${s.exame}: ${s.resultado}`, acao: desfazer({ tipo: 'seguimento', id: s.id }) })
  if (d.notificacao?.enviadaEm)
    itens.push({ id: 'notif', ordem: d.notificacao.enviadaEm, data: formatarDataHora(d.notificacao.enviadaEm), icone: ICONE.notificacoes, tom: 'sucesso', titulo: 'Notificação enviada', descricao: d.notificacao.protocolo })
  for (const t of d.tarefas)
    for (const tent of t.tentativas)
      itens.push({ id: tent.id, ordem: tent.data, data: formatarData(tent.data), icone: ICONE.buscaAtiva, tom: 'atencao', titulo: `Busca ativa (${tent.meio}): ${RESULTADO_TENTATIVA_ROTULO[tent.resultado].toLowerCase()}`, descricao: tent.observacao })
  for (const a of caso.anotacoes)
    itens.push({ id: a.id, ordem: a.data, data: formatarDataHora(a.data), icone: MessageSquarePlus, titulo: 'Anotação', descricao: <>{a.texto}<span className="block">{d.nomes[a.autorId] ?? ''}</span></> })
  if (caso.desfecho)
    itens.push({ id: 'desfecho', ordem: caso.desfecho.data, data: formatarData(caso.desfecho.data), icone: ICONE.ok, tom: 'sucesso', titulo: `Encerrado: ${DESFECHO_ROTULO[caso.desfecho.tipo]}`, descricao: caso.desfecho.observacao, acao: desfazer({ tipo: 'desfecho' }) })
  return itens.sort((a, b) => b.ordem.localeCompare(a.ordem))
}

export default function CasoDetalhePage() {
  const { id } = useParams()
  const { data, isLoading, error } = useCaso(id)
  const podeEditar = usePode('caso.editar')
  const [dialogo, setDialogo] = useState<TipoDialogo>(null)
  const [aDesfazer, setADesfazer] = useState<RegistroDesfazivel | null>(null)
  const [desfazendo, setDesfazendo] = useState(false)
  const executar = useAcaoCaso(id ?? '')
  const desfazer = useDesfazerRegistroCaso()
  const toast = useToast()

  if (isLoading) return <Carregando />
  if (error || !data) return <EstadoErro erro={error} />
  const { caso, status, pessoa } = data
  const encerrado = status === 'encerrado'
  const c = caso.confirmatorio
  const t = caso.tratamento
  const sifilis = caso.agravo === 'sifilis'

  const { etapas, atual } = etapasDoCaso(caso.agravo, status)

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
  // Uma única ação primária por vez (pregnância): a primeira na ordem do cuidado; as outras viram secundárias.
  const primaria = acoes.find((a) => a.primaria)?.tipo
  const podeReabrir = encerrado && !motivoParaNaoDesfazer(caso, { tipo: 'desfecho' })

  const botaoDesfazer = (r: RegistroDesfazivel) => (
    <button
      type="button"
      onClick={() => setADesfazer(r)}
      className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-sm font-bold text-primary hover:bg-primary-soft"
    >
      <Undo2 className="size-4" aria-hidden />
      {r.tipo === 'desfecho' ? 'Reabrir caso' : 'Desfazer'}
      <span className="sr-only"> {descreverRegistro(r)}</span>
    </button>
  )

  return (
    <>
      <PageHeader
        titulo={nomeDeExibicao(pessoa)}
        tituloAba={`Caso de ${AGRAVO_ROTULO[caso.agravo]}`}
        trilha={[{ rotulo: 'Seguimento', para: '/seguimento' }, { rotulo: `Caso de ${AGRAVO_ROTULO[caso.agravo]}` }]}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <AgravoBadge agravo={caso.agravo} completo />
            {caso.gestante && <GestanteBadge />}
            <span>aberto em {formatarData(caso.abertoEm)}</span>
          </span>
        }
        acoes={
          <LinkButton to={`/pessoas/${pessoa.id}`} variante="secundario" icone={ICONE.pessoas}>
            Ver pessoa
          </LinkButton>
        }
      />

      <div className="mb-6">
        <FitaDoCaso etapas={etapas} atual={atual} vencida={data.pendencias.some((p) => p.vencida)} />
      </div>

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
                  {podeReabrir && (
                    <Button variante="secundario" icone={RotateCcw} onClick={() => setADesfazer({ tipo: 'desfecho' })}>
                      Reabrir caso
                    </Button>
                  )}
                  {acoes.map((a) => (
                    <Button
                      key={a.tipo}
                      variante={a.tipo === primaria ? 'primario' : a.tipo === 'encerrar' ? 'fantasma' : 'secundario'}
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
                          {c.titulo ? `, título ${c.titulo}` : ''}
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
                      {t.local === 'ubs' ? 'Na UBS' : 'No serviço especializado'}, início em {formatarData(t.iniciadoEm)}
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
              <CardHeader id="t-parc" titulo="Parcerias sexuais" icone={<ICONE.pessoas className="size-5" aria-hidden />} descricao="Tratar parcerias evita reinfecção. No pré-natal, é obrigatório." />
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
                            executar.mutate(
                              { tipo: 'atualizar_parceria', id: p.id, testada: e.target.checked, tratada: p.tratada },
                              { onSuccess: () => toast.sucesso(`${p.nome}: ${e.target.checked ? 'marcada como testada' : 'desmarcada como testada'}.`), onError: (er) => toast.erro(er) },
                            )
                          }
                        />
                        <Checkbox
                          label="Tratada"
                          checked={p.tratada}
                          disabled={!podeEditar || encerrado || executar.isPending}
                          onChange={(e) =>
                            executar.mutate(
                              { tipo: 'atualizar_parceria', id: p.id, testada: p.testada || e.target.checked, tratada: e.target.checked },
                              { onSuccess: () => toast.sucesso(`${p.nome}: ${e.target.checked ? 'marcada como tratada' : 'desmarcada como tratada'}.`), onError: (er) => toast.erro(er) },
                            )
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
              <LinhaDoTempo itens={linhaDoTempo(data, podeEditar ? botaoDesfazer : undefined)} />
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
                      {tf.status === 'aberta' ? 'Aberta' : `Resolvida em ${formatarData(tf.concluidaEm)}`}, {plural(tf.tentativas.length, 'tentativa')}
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
      <ConfirmDialog
        aberto={aDesfazer !== null}
        aoFechar={() => setADesfazer(null)}
        carregando={desfazendo}
        titulo={aDesfazer?.tipo === 'desfecho' ? 'Reabrir o caso?' : `Desfazer ${aDesfazer ? descreverRegistro(aDesfazer) : ''}?`}
        rotuloConfirmar={aDesfazer?.tipo === 'desfecho' ? 'Reabrir caso' : 'Desfazer'}
        mensagem={
          aDesfazer?.tipo === 'desfecho'
            ? 'O caso volta para o seguimento, com os prazos e pendências da etapa em que estava.'
            : 'O caso volta para a etapa anterior. Se o registro estava errado, registre de novo com os dados certos. A correção fica na auditoria.'
        }
        aoConfirmar={async () => {
          if (!aDesfazer) return
          setDesfazendo(true)
          try {
            await desfazer(caso.id, aDesfazer)
            toast.sucesso(aDesfazer.tipo === 'desfecho' ? 'Caso reaberto.' : `Desfeito: ${descreverRegistro(aDesfazer)}.`)
            setADesfazer(null)
          } catch (e) {
            toast.erro(e)
          } finally {
            setDesfazendo(false)
          }
        }}
      />
    </>
  )
}
