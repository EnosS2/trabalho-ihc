/**
 * API mock. Cada função corresponde a um endpoint do futuro backend
 * (ver TODO.md, Fase 4). Regras de acesso por perfil são aplicadas aqui,
 * como o servidor fará: o front nunca confia apenas no menu escondido.
 */
import { agoraISO, diasEntre, hojeISO, idade, mesDe, somarDias } from '@/lib/datas'
import { pode, type Permissao } from '@/domain/permissoes'
import { alertasEstoque, fechamentoMensal, fechamentoParaCsv, resumoPorTipo, selecionarLoteFEFO } from '@/domain/rules/estoque'
import { calcularIndicadores, type Indicadores } from '@/domain/rules/indicadores'
import { calcularCompletude } from '@/domain/rules/notificacao'
import { avaliarRespostaSorologica, derivarStatus, pendenciasDoCaso, type AcaoCaso, type Pendencia } from '@/domain/rules/seguimento'
import { validarCns, validarCpf } from '@/domain/rules/documentos'
import { formatarMes } from '@/lib/datas'
import { AGRAVO_ROTULO, TIPOS_TESTE } from '@/domain/rotulos'
import type {
  Agravo,
  Caso,
  Completude,
  EventoAuditoria,
  ISODate,
  LoteInsumo,
  Microarea,
  MovimentacaoEstoque,
  Notificacao,
  Parametros,
  Pessoa,
  StatusCaso,
  TarefaBuscaAtiva,
  TentativaContato,
  Territorio,
  Testagem,
  TipoMovimentacao,
  TipoTeste,
  Ubs,
  Usuario,
} from '@/domain/types'
import { novoId, type Banco } from './banco'
import {
  auditar,
  ErroDeNegocio,
  executarAcaoCasoOp,
  registrarTestagemOp,
  sincronizarBuscaAtiva,
  type NovaTestagemInput,
} from './operacoes'
import { obterBanco, persistir, recriarBancoDemo } from './store'

export { ErroDeNegocio }
export type { NovaTestagemInput }

export class ErroDeAcesso extends Error {
  constructor(mensagem = 'Seu perfil não tem acesso a esta informação.') {
    super(mensagem)
  }
}

// ---------- infraestrutura ----------

const CHAVE_SESSAO = 'testagem-ubs:sessao'
let latenciaAtiva = typeof window !== 'undefined' && import.meta.env.MODE !== 'test'

export function configurarLatencia(ativa: boolean) {
  latenciaAtiva = ativa
}

async function responder<T>(fn: (banco: Banco) => T): Promise<T> {
  if (latenciaAtiva) await new Promise((r) => setTimeout(r, 120 + Math.random() * 180))
  const banco = obterBanco()
  const resultado = fn(banco)
  return structuredClone(resultado)
}

async function escrever<T>(fn: (banco: Banco) => T): Promise<T> {
  const r = await responder((banco) => {
    const out = fn(banco)
    sincronizarBuscaAtiva(banco, hojeISO())
    persistir()
    return out
  })
  return r
}

function idSessao(): string | null {
  try {
    return localStorage.getItem(CHAVE_SESSAO)
  } catch {
    return null
  }
}

function usuarioAtual(banco: Banco): Usuario {
  const id = idSessao()
  const u = id ? banco.usuarios.find((x) => x.id === id && x.ativo) : undefined
  if (!u) throw new ErroDeAcesso('Sessão expirada. Entre novamente.')
  return u
}

function exigir(banco: Banco, permissao: Permissao): Usuario {
  const u = usuarioAtual(banco)
  if (!pode(u, permissao)) throw new ErroDeAcesso()
  return u
}

function mapaPessoas(banco: Banco) {
  return new Map(banco.pessoas.map((p) => [p.id, p]))
}

// ---------- sessão ----------

export interface Sessao {
  usuario: Usuario
  ubs?: Ubs
  territorio?: Territorio
  microarea?: Microarea
}

/** Perfis de demonstração, na ordem do seletor; o primeiro ativo é o perfil de entrada. */
const USUARIOS_DEMO = ['usr-ana', 'usr-beatriz', 'usr-joana', 'usr-marcos', 'usr-paula', 'usr-carlos']

export function listarUsuariosDemo() {
  return responder((b) =>
    USUARIOS_DEMO
      .map((id) => b.usuarios.find((u) => u.id === id)!)
      .map((u) => ({ ...u, ubsNome: b.ubs.find((x) => x.id === u.ubsId)?.nome })),
  )
}

export function entrar(usuarioId: string) {
  return escrever((b) => {
    const u = b.usuarios.find((x) => x.id === usuarioId && x.ativo)
    if (!u) throw new ErroDeNegocio('Usuário inativo ou inexistente.')
    localStorage.setItem(CHAVE_SESSAO, u.id)
    auditar(b, { usuarioId: u.id, ubsId: u.ubsId, acao: 'sessao.entrar', entidade: 'sessao', descricao: 'Entrou no sistema' })
    return u
  })
}

/** Só no protótipo (não há tela de login): entra com o primeiro perfil de demonstração ativo. */
export async function entrarComPerfilPadrao() {
  const id = await responder((b) => USUARIOS_DEMO.find((x) => b.usuarios.some((u) => u.id === x && u.ativo)))
  if (!id) throw new ErroDeNegocio('Nenhum perfil de demonstração ativo.')
  return entrar(id)
}

export function sair() {
  return escrever((b) => {
    const id = idSessao()
    if (id) auditar(b, { usuarioId: id, acao: 'sessao.sair', entidade: 'sessao', descricao: 'Saiu do sistema' })
    localStorage.removeItem(CHAVE_SESSAO)
    return true
  })
}

export function obterSessao(): Promise<Sessao | null> {
  return responder((b) => {
    const id = idSessao()
    const usuario = id ? b.usuarios.find((u) => u.id === id && u.ativo) : undefined
    if (!usuario) return null
    const ubs = b.ubs.find((u) => u.id === usuario.ubsId)
    return {
      usuario,
      ubs,
      territorio: b.territorios.find((t) => t.id === ubs?.territorioId),
      microarea: b.microareas.find((m) => m.id === usuario.microareaId),
    }
  })
}

// ---------- referência ----------

export function listarReferencias() {
  return responder((b) => ({
    territorios: b.territorios,
    ubs: b.ubs,
    microareas: b.microareas,
    usuarios: b.usuarios.map(({ id, nome, perfil, cargo, ubsId }) => ({ id, nome, perfil, cargo, ubsId })),
  }))
}

export function obterParametros() {
  return responder((b) => b.parametros)
}

// ---------- pessoas ----------

export interface PessoaResumo {
  pessoa: Pessoa
  idade: number
  casosAtivos: number
  ultimaTestagem?: ISODate
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function buscarPessoas(filtro: { termo?: string; limite?: number }) {
  return responder((b) => {
    const u = exigir(b, 'pessoa.ver')
    const termo = normalizar(filtro.termo?.trim() ?? '')
    const digitos = termo.replace(/\D/g, '')
    const hoje = hojeISO()
    const ultima = new Map<string, ISODate>()
    for (const t of b.testagens) if ((ultima.get(t.pessoaId) ?? '') < t.data) ultima.set(t.pessoaId, t.data)
    const ativos = new Map<string, number>()
    for (const c of b.casos) if (!c.desfecho) ativos.set(c.pessoaId, (ativos.get(c.pessoaId) ?? 0) + 1)

    return b.pessoas
      .filter((p) => p.ubsId === u.ubsId)
      .filter((p) => {
        if (!termo) return true
        if (digitos.length >= 4 && (p.cns?.includes(digitos) || p.cpf?.includes(digitos))) return true
        return normalizar(`${p.nome} ${p.nomeSocial ?? ''}`).includes(termo)
      })
      .sort((a, c) => (ultima.get(c.id) ?? '').localeCompare(ultima.get(a.id) ?? ''))
      .slice(0, filtro.limite ?? 50)
      .map<PessoaResumo>((p) => ({
        pessoa: p,
        idade: idade(p.dataNascimento, hoje),
        casosAtivos: ativos.get(p.id) ?? 0,
        ultimaTestagem: ultima.get(p.id),
      }))
  })
}

export function obterPessoa(id: string) {
  return escrever((b) => {
    const u = exigir(b, 'pessoa.ver')
    const pessoa = b.pessoas.find((p) => p.id === id && p.ubsId === u.ubsId)
    if (!pessoa) throw new ErroDeNegocio('Pessoa não encontrada nesta UBS.')
    auditar(b, { usuarioId: u.id, ubsId: u.ubsId, acao: 'pessoa.visualizar', entidade: 'pessoa', entidadeId: id, descricao: `Visualizou o cadastro de ${pessoa.nome}` })
    return {
      pessoa,
      idade: idade(pessoa.dataNascimento),
      microarea: b.microareas.find((m) => m.id === pessoa.microareaId),
      testagens: b.testagens.filter((t) => t.pessoaId === id).sort((x, y) => y.data.localeCompare(x.data)),
      casos: b.casos.filter((c) => c.pessoaId === id).map((c) => resumoCaso(b, c, pessoa)),
    }
  })
}

export type PessoaInput = Omit<Pessoa, 'id' | 'criadoEm' | 'atualizadoEm' | 'ubsId'>

export function salvarPessoa(dados: PessoaInput, id?: string) {
  return escrever((b) => {
    const u = exigir(b, 'pessoa.editar')
    const cns = dados.cns?.replace(/\D/g, '') || undefined
    const cpf = dados.cpf?.replace(/\D/g, '') || undefined
    if (cns && !validarCns(cns)) throw new ErroDeNegocio('CNS inválido. Confira os 15 dígitos.')
    if (cpf && !validarCpf(cpf)) throw new ErroDeNegocio('CPF inválido. Confira os dígitos.')
    const duplicada = b.pessoas.find((p) => p.id !== id && ((cns && p.cns === cns) || (cpf && p.cpf === cpf)))
    if (duplicada) {
      throw new ErroDeNegocio(`Já existe cadastro com este documento: ${duplicada.nome}. Use o cadastro existente.`)
    }
    const agora = hojeISO()
    if (id) {
      const p = b.pessoas.find((x) => x.id === id && x.ubsId === u.ubsId)
      if (!p) throw new ErroDeNegocio('Pessoa não encontrada.')
      Object.assign(p, dados, { cns, cpf, atualizadoEm: agora })
      auditar(b, { usuarioId: u.id, ubsId: u.ubsId, acao: 'pessoa.editar', entidade: 'pessoa', entidadeId: id, descricao: `Atualizou o cadastro de ${p.nome}` })
      return p
    }
    const nova: Pessoa = { ...dados, cns, cpf, id: novoId('pes'), ubsId: u.ubsId!, criadoEm: agora, atualizadoEm: agora }
    b.pessoas.push(nova)
    auditar(b, { usuarioId: u.id, ubsId: u.ubsId, acao: 'pessoa.criar', entidade: 'pessoa', entidadeId: nova.id, descricao: `Cadastrou ${nova.nome}` })
    return nova
  })
}

// ---------- testagens ----------

export interface TestagemResumo {
  testagem: Testagem
  pessoaNome: string
  executorNome: string
}

export function listarTestagens(filtro: { inicio?: ISODate; fim?: ISODate; agravo?: Agravo; somenteReagentes?: boolean; termo?: string }) {
  return responder((b) => {
    const u = exigir(b, 'testagem.ver')
    const pessoas = mapaPessoas(b)
    const usuarios = new Map(b.usuarios.map((x) => [x.id, x.nome]))
    const termo = normalizar(filtro.termo ?? '')
    return b.testagens
      .filter((t) => t.ubsId === u.ubsId)
      .filter((t) => !filtro.inicio || t.data >= filtro.inicio)
      .filter((t) => !filtro.fim || t.data <= filtro.fim)
      .filter((t) => !filtro.agravo || t.agravos.includes(filtro.agravo))
      .filter((t) => !filtro.somenteReagentes || t.interpretacoes.some((i) => i.conclusao === 'reagente' || i.conclusao === 'discordante'))
      .filter((t) => !termo || normalizar(pessoas.get(t.pessoaId)?.nome ?? '').includes(termo))
      .sort((x, y) => y.data.localeCompare(x.data) || y.id.localeCompare(x.id))
      .map<TestagemResumo>((t) => ({
        testagem: t,
        pessoaNome: pessoas.get(t.pessoaId)?.nome ?? '—',
        executorNome: usuarios.get(t.executorId) ?? '—',
      }))
  })
}

export function obterTestagem(id: string) {
  return responder((b) => {
    const u = exigir(b, 'testagem.ver')
    const t = b.testagens.find((x) => x.id === id && x.ubsId === u.ubsId)
    if (!t) throw new ErroDeNegocio('Testagem não encontrada.')
    return {
      testagem: t,
      pessoa: b.pessoas.find((p) => p.id === t.pessoaId)!,
      executor: b.usuarios.find((x) => x.id === t.executorId),
      lotes: b.lotes.filter((l) => t.testes.some((x) => x.loteId === l.id)),
    }
  })
}

/** Lote sugerido (FEFO) e saldo de cada tipo para o assistente de testagem. */
export function obterLotesParaTestagem() {
  return responder((b) => {
    const u = exigir(b, 'testagem.registrar')
    const hoje = hojeISO()
    const lotes = b.lotes.filter((l) => l.ubsId === u.ubsId)
    return TIPOS_TESTE.map((tipo) => ({
      tipo,
      sugerido: selecionarLoteFEFO(lotes, tipo, hoje),
      disponiveis: lotes
        .filter((l) => l.tipo === tipo && l.quantidadeAtual > 0 && l.validade >= hoje)
        .sort((x, y) => x.validade.localeCompare(y.validade)),
    }))
  })
}

export function registrarTestagem(input: Omit<NovaTestagemInput, 'ubsId' | 'executorId' | 'data'>) {
  return escrever((b) => {
    const u = exigir(b, 'testagem.registrar')
    const r = registrarTestagemOp(b, { ...input, ubsId: u.ubsId!, executorId: u.id, data: hojeISO() })
    const pessoa = b.pessoas.find((p) => p.id === input.pessoaId)!
    auditar(b, {
      usuarioId: u.id,
      ubsId: u.ubsId,
      acao: 'testagem.registrar',
      entidade: 'testagem',
      entidadeId: r.testagem.id,
      descricao: `Registrou testagem de ${pessoa.nome} (${r.testagem.testes.length} teste(s), ${r.casos.length} caso(s) aberto(s))`,
    })
    return r
  })
}

// ---------- casos ----------

export interface CasoResumo {
  caso: Caso
  status: StatusCaso
  pessoa: Pick<Pessoa, 'id' | 'nome' | 'nomeSocial' | 'telefone' | 'microareaId' | 'dataNascimento'>
  pendencias: Pendencia[]
  proxima?: Pendencia
  notificacao?: Notificacao
}

function resumoCaso(b: Banco, caso: Caso, pessoa?: Pessoa): CasoResumo {
  const p = pessoa ?? b.pessoas.find((x) => x.id === caso.pessoaId)!
  const notificacao = b.notificacoes.find((n) => n.casoId === caso.id)
  const pendencias = pendenciasDoCaso(caso, b.parametros, hojeISO(), notificacao)
  return {
    caso,
    status: derivarStatus(caso),
    pessoa: { id: p.id, nome: p.nome, nomeSocial: p.nomeSocial, telefone: p.telefone, microareaId: p.microareaId, dataNascimento: p.dataNascimento },
    pendencias,
    proxima: pendencias[0],
    notificacao,
  }
}

export function listarCasos(filtro: { status?: StatusCaso | 'ativos'; agravo?: Agravo; termo?: string } = {}) {
  return responder((b) => {
    const u = exigir(b, 'caso.ver')
    const pessoas = mapaPessoas(b)
    const termo = normalizar(filtro.termo ?? '')
    return b.casos
      .filter((c) => c.ubsId === u.ubsId)
      .filter((c) => !filtro.agravo || c.agravo === filtro.agravo)
      .map((c) => resumoCaso(b, c, pessoas.get(c.pessoaId)))
      .filter((r) => !filtro.status || (filtro.status === 'ativos' ? r.status !== 'encerrado' : r.status === filtro.status))
      .filter((r) => !termo || normalizar(r.pessoa.nome).includes(termo))
      .sort((x, y) => (x.proxima?.prazo ?? '9999').localeCompare(y.proxima?.prazo ?? '9999') || y.caso.abertoEm.localeCompare(x.caso.abertoEm))
  })
}

export interface CasoDetalhe extends CasoResumo {
  pessoaCompleta: Pessoa
  testagem: Testagem
  completude: Completude
  tarefas: TarefaBuscaAtiva[]
  respostaSorologica?: ReturnType<typeof avaliarRespostaSorologica>
  nomes: Record<string, string>
}

export function obterCaso(id: string): Promise<CasoDetalhe> {
  return responder((b) => {
    const u = exigir(b, 'caso.ver')
    const caso = b.casos.find((c) => c.id === id && c.ubsId === u.ubsId)
    if (!caso) throw new ErroDeNegocio('Caso não encontrado nesta UBS.')
    const pessoa = b.pessoas.find((p) => p.id === caso.pessoaId)!
    return {
      ...resumoCaso(b, caso, pessoa),
      pessoaCompleta: pessoa,
      testagem: b.testagens.find((t) => t.id === caso.testagemId)!,
      completude: calcularCompletude(pessoa, caso),
      tarefas: b.tarefas.filter((t) => t.casoId === id),
      respostaSorologica: avaliarRespostaSorologica(caso),
      nomes: Object.fromEntries(b.usuarios.map((x) => [x.id, x.nome])),
    }
  })
}

const DESCRICAO_ACAO: Record<AcaoCaso['tipo'], string> = {
  registrar_coleta: 'Registrou coleta do confirmatório',
  registrar_resultado: 'Registrou resultado do confirmatório',
  iniciar_tratamento: 'Iniciou tratamento',
  aplicar_dose: 'Registrou aplicação de dose',
  registrar_seguimento: 'Registrou exame de seguimento',
  adicionar_parceria: 'Adicionou parceria',
  atualizar_parceria: 'Atualizou situação da parceria',
  encerrar: 'Encerrou o caso',
  anotar: 'Adicionou anotação',
}

export function executarAcaoCaso(casoId: string, acao: AcaoCaso) {
  return escrever((b) => {
    const u = exigir(b, 'caso.editar')
    const caso = b.casos.find((c) => c.id === casoId && c.ubsId === u.ubsId)
    if (!caso) throw new ErroDeNegocio('Caso não encontrado nesta UBS.')
    if (acao.tipo === 'anotar') acao = { ...acao, autorId: u.id, data: agoraISO() }
    else if ('data' in acao && acao.data > hojeISO()) throw new ErroDeNegocio('A data não pode estar no futuro.')
    if (acao.tipo === 'encerrar' && acao.desfecho.data > hojeISO()) throw new ErroDeNegocio('A data não pode estar no futuro.')
    const novo = executarAcaoCasoOp(b, casoId, acao)
    auditar(b, {
      usuarioId: u.id,
      ubsId: u.ubsId,
      acao: `caso.${acao.tipo}`,
      entidade: 'caso',
      entidadeId: casoId,
      descricao: `${DESCRICAO_ACAO[acao.tipo]} — ${AGRAVO_ROTULO[caso.agravo]}`,
    })
    return resumoCaso(b, novo)
  })
}

// ---------- busca ativa ----------

export interface TarefaResumo {
  tarefa: TarefaBuscaAtiva
  pessoa: Pick<Pessoa, 'id' | 'nome' | 'telefone' | 'endereco'> & { idade: number }
  microarea?: Microarea
  /** Para o ACS, o motivo é genérico: o diagnóstico não é exposto (sigilo/LGPD). */
  motivoExibido: string
  agravo?: Agravo
  diasEmAberto: number
  acsNome?: string
}

export function listarBuscaAtiva(filtro: { status?: 'aberta' | 'concluida'; microareaId?: string } = {}) {
  return responder((b) => {
    const u = exigir(b, 'busca.ver')
    const hoje = hojeISO()
    const pessoas = mapaPessoas(b)
    const ehAcs = u.perfil === 'acs'
    return b.tarefas
      .filter((t) => t.ubsId === u.ubsId)
      .filter((t) => (ehAcs ? t.microareaId === u.microareaId : !filtro.microareaId || t.microareaId === filtro.microareaId))
      .filter((t) => !filtro.status || t.status === filtro.status)
      .map<TarefaResumo>((t) => {
        const p = pessoas.get(t.pessoaId)!
        const caso = b.casos.find((c) => c.id === t.casoId)
        return {
          tarefa: t,
          pessoa: { id: p.id, nome: p.nome, telefone: p.telefone, endereco: p.endereco, idade: idade(p.dataNascimento, hoje) },
          microarea: b.microareas.find((m) => m.id === t.microareaId),
          motivoExibido: ehAcs ? 'Retorno pendente na UBS — orientar a procurar a equipe de enfermagem' : t.motivo,
          agravo: ehAcs ? undefined : caso?.agravo,
          diasEmAberto: Math.max(0, diasEntre(t.criadaEm, t.concluidaEm ?? hoje)),
          acsNome: b.usuarios.find((x) => x.perfil === 'acs' && x.microareaId === t.microareaId)?.nome,
        }
      })
      .sort((x, y) => y.diasEmAberto - x.diasEmAberto)
  })
}

export function registrarTentativa(tarefaId: string, dados: Omit<TentativaContato, 'id' | 'usuarioId' | 'data'>) {
  return escrever((b) => {
    const u = exigir(b, 'busca.registrar')
    const t = b.tarefas.find((x) => x.id === tarefaId && x.ubsId === u.ubsId)
    if (!t) throw new ErroDeNegocio('Tarefa não encontrada.')
    if (u.perfil === 'acs' && t.microareaId !== u.microareaId) throw new ErroDeAcesso()
    t.tentativas.push({ ...dados, id: novoId('tent'), usuarioId: u.id, data: hojeISO() })
    auditar(b, { usuarioId: u.id, ubsId: u.ubsId, acao: 'busca.tentativa', entidade: 'busca_ativa', entidadeId: t.id, descricao: `Registrou tentativa de contato (${dados.meio})` })
    return t
  })
}

// ---------- estoque ----------

export function obterEstoque() {
  return responder((b) => {
    const u = exigir(b, 'estoque.ver')
    const hoje = hojeISO()
    const lotes = b.lotes.filter((l) => l.ubsId === u.ubsId)
    const movs = b.movimentacoes.filter((m) => m.ubsId === u.ubsId)
    return {
      lotes: [...lotes].sort((x, y) => x.tipo.localeCompare(y.tipo) || x.validade.localeCompare(y.validade)),
      resumo: resumoPorTipo(lotes, movs, b.parametros, hoje),
      alertas: alertasEstoque(lotes, b.parametros, hoje),
    }
  })
}

export interface MovimentacaoResumo {
  mov: MovimentacaoEstoque
  lote?: LoteInsumo
  usuarioNome: string
}

export function listarMovimentacoes(filtro: { tipo?: TipoMovimentacao; mes?: string } = {}) {
  return responder((b) => {
    const u = exigir(b, 'estoque.ver')
    const lotes = new Map(b.lotes.map((l) => [l.id, l]))
    const usuarios = new Map(b.usuarios.map((x) => [x.id, x.nome]))
    return b.movimentacoes
      .filter((m) => m.ubsId === u.ubsId)
      .filter((m) => !filtro.tipo || m.tipo === filtro.tipo)
      .filter((m) => !filtro.mes || mesDe(m.data) === filtro.mes)
      .sort((x, y) => y.data.localeCompare(x.data))
      .slice(0, 400)
      .map<MovimentacaoResumo>((m) => ({ mov: m, lote: lotes.get(m.loteId), usuarioNome: usuarios.get(m.usuarioId) ?? '—' }))
  })
}

export interface EntradaLoteInput {
  tipo: TipoTeste
  fabricante: string
  lote: string
  validade: ISODate
  quantidade: number
}

export function registrarEntradaLote(dados: EntradaLoteInput) {
  return escrever((b) => {
    const u = exigir(b, 'estoque.gerir')
    const hoje = hojeISO()
    if (dados.validade <= hoje) throw new ErroDeNegocio('Não é possível dar entrada em lote vencido.')
    if (dados.quantidade <= 0) throw new ErroDeNegocio('Informe a quantidade recebida.')
    if (b.lotes.some((l) => l.ubsId === u.ubsId && l.tipo === dados.tipo && l.lote.toUpperCase() === dados.lote.toUpperCase())) {
      throw new ErroDeNegocio('Este lote já foi cadastrado. Use "Ajuste" para corrigir a quantidade.')
    }
    const lote: LoteInsumo = {
      id: novoId('lot'),
      ubsId: u.ubsId!,
      tipo: dados.tipo,
      fabricante: dados.fabricante,
      lote: dados.lote.toUpperCase(),
      validade: dados.validade,
      recebidoEm: hoje,
      quantidadeInicial: dados.quantidade,
      quantidadeAtual: dados.quantidade,
    }
    b.lotes.push(lote)
    b.movimentacoes.push({ id: novoId('mov'), loteId: lote.id, ubsId: u.ubsId!, tipo: 'entrada', quantidade: dados.quantidade, data: hoje, usuarioId: u.id, motivo: 'Recebimento' })
    auditar(b, { usuarioId: u.id, ubsId: u.ubsId, acao: 'lote.entrada', entidade: 'lote', entidadeId: lote.id, descricao: `Entrada do lote ${lote.lote} (${dados.quantidade} un.)` })
    return lote
  })
}

export function registrarBaixa(loteId: string, dados: { tipo: 'perda' | 'vencimento' | 'ajuste'; quantidade: number; motivo: string }) {
  return escrever((b) => {
    const u = exigir(b, 'estoque.gerir')
    const lote = b.lotes.find((l) => l.id === loteId && l.ubsId === u.ubsId)
    if (!lote) throw new ErroDeNegocio('Lote não encontrado.')
    const delta = dados.tipo === 'ajuste' ? dados.quantidade : -Math.abs(dados.quantidade)
    if (delta === 0) throw new ErroDeNegocio('Informe uma quantidade diferente de zero.')
    if (lote.quantidadeAtual + delta < 0) throw new ErroDeNegocio(`O lote tem apenas ${lote.quantidadeAtual} unidade(s).`)
    if (!dados.motivo.trim()) throw new ErroDeNegocio('Descreva o motivo.')
    lote.quantidadeAtual += delta
    b.movimentacoes.push({ id: novoId('mov'), loteId, ubsId: u.ubsId!, tipo: dados.tipo, quantidade: delta, data: hojeISO(), usuarioId: u.id, motivo: dados.motivo })
    auditar(b, { usuarioId: u.id, ubsId: u.ubsId, acao: `lote.${dados.tipo}`, entidade: 'lote', entidadeId: loteId, descricao: `${dados.tipo === 'ajuste' ? 'Ajuste' : 'Baixa'} de ${Math.abs(delta)} un. do lote ${lote.lote}` })
    return lote
  })
}

export function obterFechamento(mes: string) {
  return responder((b) => {
    const u = exigir(b, 'estoque.ver')
    const ubs = b.ubs.find((x) => x.id === u.ubsId)!
    const linhas = fechamentoMensal(
      b.lotes.filter((l) => l.ubsId === u.ubsId),
      b.movimentacoes.filter((m) => m.ubsId === u.ubsId),
      b.testagens.filter((t) => t.ubsId === u.ubsId),
      mes,
    )
    return { linhas, csv: fechamentoParaCsv(linhas, { ubs: ubs.nome, cnes: ubs.cnes, mes: formatarMes(mes) }), ubs }
  })
}

// ---------- notificações ----------

export interface NotificacaoResumo {
  notificacao: Notificacao
  caso: Caso
  pessoa: Pessoa
  completude: Completude
  atrasada: boolean
}

export function listarNotificacoes(filtro: { status?: 'pendente' | 'enviada' } = {}) {
  return responder((b) => {
    const u = exigir(b, 'notificacao.ver')
    const hoje = hojeISO()
    const pessoas = mapaPessoas(b)
    return b.notificacoes
      .filter((n) => n.ubsId === u.ubsId)
      .filter((n) => !filtro.status || n.status === filtro.status)
      .map<NotificacaoResumo>((n) => {
        const caso = b.casos.find((c) => c.id === n.casoId)!
        const pessoa = pessoas.get(caso.pessoaId)!
        return {
          notificacao: n,
          caso,
          pessoa,
          completude: calcularCompletude(pessoa, caso),
          atrasada: n.status === 'pendente' ? n.prazo < hoje : (n.enviadaEm ?? '').slice(0, 10) > n.prazo,
        }
      })
      .sort((x, y) =>
        x.notificacao.status === y.notificacao.status
          ? x.notificacao.status === 'pendente'
            ? x.notificacao.prazo.localeCompare(y.notificacao.prazo)
            : (y.notificacao.enviadaEm ?? '').localeCompare(x.notificacao.enviadaEm ?? '')
          : x.notificacao.status === 'pendente'
            ? -1
            : 1,
      )
  })
}

export function marcarNotificacaoEnviada(id: string, dados: { protocolo: string }) {
  return escrever((b) => {
    const u = exigir(b, 'notificacao.enviar')
    const n = b.notificacoes.find((x) => x.id === id && x.ubsId === u.ubsId)
    if (!n) throw new ErroDeNegocio('Notificação não encontrada.')
    if (n.status === 'enviada') throw new ErroDeNegocio('Esta notificação já foi enviada.')
    const caso = b.casos.find((c) => c.id === n.casoId)!
    const pessoa = b.pessoas.find((p) => p.id === caso.pessoaId)!
    const comp = calcularCompletude(pessoa, caso)
    if (!comp.pronta) {
      throw new ErroDeNegocio(`Complete antes: ${comp.faltandoObrigatorios.map((c) => c.rotulo).join(', ')}.`)
    }
    n.status = 'enviada'
    n.enviadaEm = agoraISO()
    n.enviadaPorId = u.id
    n.protocolo = dados.protocolo.trim() || undefined
    auditar(b, { usuarioId: u.id, ubsId: u.ubsId, acao: 'notificacao.enviar', entidade: 'notificacao', entidadeId: id, descricao: `Registrou envio da notificação (${n.destino === 'sentinela' ? 'Sentinela' : 'e-mail DVS'})` })
    return n
  })
}

// ---------- indicadores ----------

export interface IndicadoresResposta {
  geral: Indicadores
  porUbs: { ubs: Ubs; territorio: Territorio; indicadores: Indicadores }[]
  porTerritorio: { territorio: Territorio; indicadores: Indicadores }[]
}

export function obterIndicadores(filtro: { inicio: ISODate; fim: ISODate; territorioId?: string; ubsId?: string }): Promise<IndicadoresResposta> {
  return responder((b) => {
    const u = usuarioAtual(b)
    if (!pode(u, 'indicadores.ubs')) throw new ErroDeAcesso()
    const rede = pode(u, 'indicadores.rede')
    const hoje = hojeISO()
    const pessoas = mapaPessoas(b)
    let ubsVisiveis = rede ? b.ubs : b.ubs.filter((x) => x.id === u.ubsId)
    if (rede && filtro.territorioId) ubsVisiveis = ubsVisiveis.filter((x) => x.territorioId === filtro.territorioId)
    if (rede && filtro.ubsId) ubsVisiveis = ubsVisiveis.filter((x) => x.id === filtro.ubsId)
    const calc = (ids: Set<string>) =>
      calcularIndicadores({
        testagens: b.testagens.filter((t) => ids.has(t.ubsId)),
        casos: b.casos.filter((c) => ids.has(c.ubsId)),
        notificacoes: b.notificacoes.filter((n) => ids.has(n.ubsId)),
        pessoas,
        inicio: filtro.inicio,
        fim: filtro.fim,
        hoje,
        prazoColetaDias: b.parametros.prazoColetaConfirmatorioDias,
      })
    const territoriosVisiveis = b.territorios.filter((t) => ubsVisiveis.some((x) => x.territorioId === t.id))
    return {
      geral: calc(new Set(ubsVisiveis.map((x) => x.id))),
      porUbs: ubsVisiveis.map((x) => ({
        ubs: x,
        territorio: b.territorios.find((t) => t.id === x.territorioId)!,
        indicadores: calc(new Set([x.id])),
      })),
      porTerritorio: territoriosVisiveis.map((t) => ({
        territorio: t,
        indicadores: calc(new Set(ubsVisiveis.filter((x) => x.territorioId === t.id).map((x) => x.id))),
      })),
    }
  })
}

// ---------- painel ----------

export interface PendenciaPainel extends Pendencia {
  pessoaId: string
  pessoaNome: string
  agravo: Agravo
  gestante: boolean
}

export function obterPainelUbs() {
  return responder((b) => {
    const u = exigir(b, 'caso.ver')
    const hoje = hojeISO()
    const pessoas = mapaPessoas(b)
    const casos = b.casos.filter((c) => c.ubsId === u.ubsId && !c.desfecho)
    const pendencias: PendenciaPainel[] = casos
      .flatMap((c) =>
        pendenciasDoCaso(c, b.parametros, hoje, b.notificacoes.find((n) => n.casoId === c.id)).map((p) => ({
          ...p,
          pessoaId: c.pessoaId,
          pessoaNome: pessoas.get(c.pessoaId)?.nome ?? '—',
          agravo: c.agravo,
          gestante: c.gestante,
        })),
      )
      .sort((x, y) => x.prazo.localeCompare(y.prazo))
    const testagens = b.testagens.filter((t) => t.ubsId === u.ubsId)
    const lotes = b.lotes.filter((l) => l.ubsId === u.ubsId)
    const notifs = b.notificacoes.filter((n) => n.ubsId === u.ubsId && n.status === 'pendente')
    const semana = somarDias(hoje, -6)
    return {
      pendencias,
      resumo: {
        testagensHoje: testagens.filter((t) => t.data === hoje).length,
        testagensSemana: testagens.filter((t) => t.data >= semana).length,
        casosAtivos: casos.length,
        gestantesEmSeguimento: casos.filter((c) => c.gestante).length,
        pendenciasVencidas: pendencias.filter((p) => p.vencida).length,
        pendenciasHoje: pendencias.filter((p) => p.diasRestantes === 0).length,
        buscaAtivaAbertas: b.tarefas.filter((t) => t.ubsId === u.ubsId && t.status === 'aberta').length,
        notificacoesPendentes: notifs.length,
        notificacoesAtrasadas: notifs.filter((n) => n.prazo < hoje).length,
      },
      alertasEstoque: alertasEstoque(lotes, b.parametros, hoje),
      serieSemanal: Array.from({ length: 8 }, (_, i) => {
        const fim = somarDias(hoje, -7 * (7 - i))
        const ini = somarDias(fim, -6)
        const doPeriodo = testagens.filter((t) => t.data >= ini && t.data <= fim)
        return {
          semana: fim,
          testagens: doPeriodo.length,
          reagentes: doPeriodo.filter((t) => t.interpretacoes.some((x) => x.conclusao === 'reagente')).length,
        }
      }),
    }
  })
}

// ---------- auditoria e administração ----------

export function listarAuditoria(filtro: { entidade?: EventoAuditoria['entidade']; usuarioId?: string; limite?: number } = {}) {
  return responder((b) => {
    const u = exigir(b, 'auditoria.ver')
    const usuarios = new Map(b.usuarios.map((x) => [x.id, x]))
    return b.auditoria
      .filter((e) => u.perfil === 'admin' || e.ubsId === u.ubsId)
      .filter((e) => !filtro.entidade || e.entidade === filtro.entidade)
      .filter((e) => !filtro.usuarioId || e.usuarioId === filtro.usuarioId)
      .slice()
      .reverse()
      .slice(0, filtro.limite ?? 300)
      .map((e) => ({ evento: e, usuario: usuarios.get(e.usuarioId) }))
  })
}

export function listarUsuarios() {
  return responder((b) => {
    exigir(b, 'config.gerir')
    return b.usuarios
  })
}

export function salvarUsuario(dados: Omit<Usuario, 'id'>, id?: string) {
  return escrever((b) => {
    const u = exigir(b, 'config.gerir')
    if (!dados.nome.trim()) throw new ErroDeNegocio('Informe o nome.')
    if (dados.perfil !== 'gestor' && dados.perfil !== 'admin' && !dados.ubsId) throw new ErroDeNegocio('Selecione a UBS.')
    if (dados.perfil === 'acs' && !dados.microareaId) throw new ErroDeNegocio('Selecione a microárea do ACS.')
    if (id === u.id && !dados.ativo) throw new ErroDeNegocio('Você não pode desativar o próprio usuário.')
    const limpo = {
      ...dados,
      ubsId: dados.perfil === 'gestor' || dados.perfil === 'admin' ? undefined : dados.ubsId,
      microareaId: dados.perfil === 'acs' ? dados.microareaId : undefined,
    }
    if (id) {
      const alvo = b.usuarios.find((x) => x.id === id)
      if (!alvo) throw new ErroDeNegocio('Usuário não encontrado.')
      Object.assign(alvo, limpo)
      auditar(b, { usuarioId: u.id, acao: 'usuario.editar', entidade: 'usuario', entidadeId: id, descricao: `Atualizou o usuário ${alvo.nome}` })
      return alvo
    }
    const novo: Usuario = { ...limpo, id: novoId('usr') }
    b.usuarios.push(novo)
    auditar(b, { usuarioId: u.id, acao: 'usuario.criar', entidade: 'usuario', entidadeId: novo.id, descricao: `Criou o usuário ${novo.nome}` })
    return novo
  })
}

export function atualizarParametros(dados: Parametros) {
  return escrever((b) => {
    const u = exigir(b, 'config.gerir')
    b.parametros = dados
    auditar(b, { usuarioId: u.id, acao: 'parametros.atualizar', entidade: 'sistema', descricao: 'Atualizou prazos e parâmetros' })
    return b.parametros
  })
}

export async function restaurarDemonstracao() {
  const usuarioId = idSessao()
  const b = recriarBancoDemo()
  if (usuarioId) {
    auditar(b, { usuarioId, acao: 'sistema.restaurar', entidade: 'sistema', descricao: 'Restaurou os dados de demonstração' })
    persistir()
  }
  return true
}
