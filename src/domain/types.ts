/**
 * Modelo de domínio. Estes tipos são o contrato entre o frontend e o futuro backend
 * (repositório trabalho-ihc-backend). Datas são strings ISO (yyyy-mm-dd ou ISO completo).
 */

export type ISODate = string

// ---------- Organização ----------

export type Perfil = 'acs' | 'executor' | 'responsavel_tecnico' | 'gestor' | 'admin'

export interface Territorio {
  id: string
  nome: string
}

export interface Ubs {
  id: string
  nome: string
  cnes: string
  territorioId: string
  endereco: string
}

export interface Microarea {
  id: string
  ubsId: string
  codigo: string
  descricao: string
}

export interface Usuario {
  id: string
  nome: string
  perfil: Perfil
  cargo: string
  email: string
  ubsId?: string
  microareaId?: string
  ativo: boolean
}

// ---------- Pessoa atendida ----------

export type Sexo = 'F' | 'M' | 'I'
export type RacaCor = 'branca' | 'preta' | 'parda' | 'amarela' | 'indigena' | 'ignorado'
export type Escolaridade =
  | 'analfabeto'
  | 'fundamental_incompleto'
  | 'fundamental_completo'
  | 'medio_incompleto'
  | 'medio_completo'
  | 'superior_incompleto'
  | 'superior_completo'
  | 'ignorado'

export interface Endereco {
  logradouro: string
  numero: string
  bairro: string
  complemento?: string
}

export interface Pessoa {
  id: string
  nome: string
  nomeSocial?: string
  cns?: string
  cpf?: string
  dataNascimento: ISODate
  sexo: Sexo
  nomeMae?: string
  racaCor: RacaCor
  escolaridade: Escolaridade
  telefone?: string
  endereco: Endereco
  ubsId: string
  microareaId?: string
  gestante: boolean
  /** Data da última menstruação, quando gestante. */
  dum?: ISODate
  criadoEm: ISODate
  atualizadoEm: ISODate
}

// ---------- Testagem ----------

export type Agravo = 'hiv' | 'sifilis' | 'hepatite_b' | 'hepatite_c'

/** Tipo de kit (insumo). HIV usa dois kits de fabricantes diferentes (TR1 e TR2). */
export type TipoTeste = 'hiv_tr1' | 'hiv_tr2' | 'sifilis_tr' | 'hbsag_tr' | 'anti_hcv_tr'

export type ResultadoTR = 'reagente' | 'nao_reagente' | 'invalido'

export type MotivoTestagem =
  | 'pre_natal'
  | 'parceria_gestante'
  | 'demanda_espontanea'
  | 'exposicao_risco'
  | 'prep_pep'
  | 'sintomas'
  | 'campanha'

export interface Teste {
  id: string
  tipo: TipoTeste
  loteId: string
  resultado: ResultadoTR
  /** Ordem de execução dentro da testagem (repetições por inválido/discordância). */
  ordem: number
}

export type ConclusaoAgravo =
  | 'nao_reagente'
  | 'reagente'
  | 'discordante'
  | 'invalido'
  | 'incompleto'

export interface InterpretacaoAgravo {
  agravo: Agravo
  conclusao: ConclusaoAgravo
  titulo: string
  mensagem: string
  condutas: string[]
  /** Próximo teste exigido pelo fluxograma, quando houver. */
  proximoTeste?: TipoTeste
  /** Abre caso de seguimento. */
  abreCaso: boolean
  /** Urgência clínica (ex.: gestante com sífilis). */
  urgente: boolean
}

export interface Testagem {
  id: string
  pessoaId: string
  ubsId: string
  executorId: string
  data: ISODate
  motivo: MotivoTestagem
  gestante: boolean
  idadeGestacionalSemanas?: number
  /** Exposição de risco nos últimos 30 dias (janela imunológica). */
  exposicaoRecente: boolean
  /** Agravos investigados nesta testagem. */
  agravos: Agravo[]
  testes: Teste[]
  /** Derivado de `testes` pelo fluxograma (recalculado ao carregar; não é persistido). */
  interpretacoes: InterpretacaoAgravo[]
  casoIds: string[]
  observacoes?: string
}

// ---------- Caso em seguimento ----------

export type StatusCaso =
  | 'aguardando_coleta'
  | 'aguardando_resultado'
  | 'aguardando_tratamento'
  | 'em_tratamento'
  | 'em_seguimento'
  | 'encerrado'

export type ResultadoConfirmatorio = 'confirmado' | 'descartado'

export interface Confirmatorio {
  exame: string
  coletadoEm?: ISODate
  resultadoEm?: ISODate
  resultado?: ResultadoConfirmatorio
  /** Titulação do não treponêmico (ex.: "1:16"). */
  titulo?: string
  /** Diagnóstico já estabelecido pelo fluxograma (ex.: HIV com TR1 e TR2 reagentes). */
  dispensado?: boolean
}

export interface Dose {
  numero: number
  previstaEm: ISODate
  aplicadaEm?: ISODate
}

export interface Tratamento {
  esquema: string
  iniciadoEm?: ISODate
  /** Doses programadas (sífilis). HIV/hepatites usam apenas iniciadoEm (vinculação). */
  doses: Dose[]
  local: 'ubs' | 'servico_especializado'
}

export interface ExameSeguimento {
  id: string
  data: ISODate
  exame: string
  resultado: string
}

export interface Parceria {
  id: string
  nome: string
  pessoaId?: string
  testada: boolean
  tratada: boolean
}

export type TipoDesfecho =
  | 'tratamento_concluido'
  | 'vinculado_servico'
  | 'descartado'
  | 'perda_seguimento'
  | 'transferido'
  | 'obito'

export interface Desfecho {
  tipo: TipoDesfecho
  data: ISODate
  observacao?: string
}

export interface Caso {
  id: string
  pessoaId: string
  agravo: Agravo
  ubsId: string
  testagemId: string
  abertoEm: ISODate
  gestante: boolean
  confirmatorio: Confirmatorio
  tratamento?: Tratamento
  seguimento: ExameSeguimento[]
  parcerias: Parceria[]
  desfecho?: Desfecho
  responsavelId: string
  anotacoes: { id: string; data: ISODate; autorId: string; texto: string }[]
}

// ---------- Notificação ----------

export type AgravoNotificacao =
  | 'sifilis_adquirida'
  | 'sifilis_gestante'
  | 'hiv'
  | 'hiv_gestante'
  | 'hepatite_b'
  | 'hepatite_c'

export type DestinoNotificacao = 'sentinela' | 'email_dvs'

export interface Notificacao {
  id: string
  casoId: string
  ubsId: string
  agravoNotificacao: AgravoNotificacao
  destino: DestinoNotificacao
  criadaEm: ISODate
  prazo: ISODate
  status: 'pendente' | 'enviada'
  enviadaEm?: ISODate
  enviadaPorId?: string
  protocolo?: string
}

export interface CampoCompletude {
  campo: string
  rotulo: string
  ok: boolean
  obrigatorio: boolean
  /** Preenchido com "ignorado": conta como pendência de qualidade. */
  ignorado?: boolean
}

export interface Completude {
  percentual: number
  campos: CampoCompletude[]
  faltandoObrigatorios: CampoCompletude[]
  pronta: boolean
}

// ---------- Busca ativa ----------

export type ResultadoTentativa =
  | 'contato_realizado'
  | 'agendado'
  | 'nao_encontrado'
  | 'endereco_incorreto'
  | 'recusou'

export interface TentativaContato {
  id: string
  data: ISODate
  usuarioId: string
  meio: 'visita' | 'telefone' | 'mensagem'
  resultado: ResultadoTentativa
  observacao?: string
}

export interface TarefaBuscaAtiva {
  id: string
  casoId: string
  pessoaId: string
  ubsId: string
  microareaId?: string
  motivo: string
  /** Chave da pendência que gerou a tarefa (evita duplicidade). */
  chavePendencia: string
  criadaEm: ISODate
  status: 'aberta' | 'concluida'
  tentativas: TentativaContato[]
  concluidaEm?: ISODate
}

// ---------- Estoque ----------

export interface LoteInsumo {
  id: string
  ubsId: string
  tipo: TipoTeste
  fabricante: string
  lote: string
  validade: ISODate
  recebidoEm: ISODate
  quantidadeInicial: number
  quantidadeAtual: number
}

export type TipoMovimentacao = 'entrada' | 'consumo' | 'perda' | 'vencimento' | 'ajuste'

export interface MovimentacaoEstoque {
  id: string
  loteId: string
  ubsId: string
  tipo: TipoMovimentacao
  /** Positivo para entrada, negativo para saída. */
  quantidade: number
  data: ISODate
  usuarioId: string
  motivo?: string
  testagemId?: string
}

// ---------- Parâmetros e auditoria ----------

export interface Parametros {
  prazoColetaConfirmatorioDias: number
  prazoResultadoConfirmatorioDias: number
  prazoInicioTratamentoDias: number
  prazoNotificacaoDias: number
  toleranciaBuscaAtivaDias: number
  alertaValidadeDias: number
  intervaloDoseSifilisDias: number
  seguimentoVdrlGestanteDias: number
  seguimentoVdrlDias: number
  estoqueMinimo: Record<TipoTeste, number>
}

export interface EventoAuditoria {
  id: string
  data: ISODate
  usuarioId: string
  ubsId?: string
  acao: string
  entidade: 'pessoa' | 'testagem' | 'caso' | 'notificacao' | 'lote' | 'busca_ativa' | 'usuario' | 'sistema' | 'sessao'
  entidadeId?: string
  descricao: string
}
