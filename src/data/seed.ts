/**
 * Gera dados FICTÍCIOS e determinísticos de demonstração, relativos à data de hoje.
 * Usa as mesmas operações da API (registrarTestagemOp / executarAcaoCasoOp), portanto
 * todo dado gerado respeita as regras de negócio.
 */
import { diasEntre, hojeISO, somarDias } from '@/lib/datas'
import { PARAMETROS_PADRAO } from '@/domain/parametros'
import { gerarCnsProvisorio, gerarCpf } from '@/domain/rules/documentos'
import { selecionarLoteFEFO } from '@/domain/rules/estoque'
import { proximoVdrl, tituloParaNumero, tratamentoConcluido, tratamentoIniciado } from '@/domain/rules/seguimento'
import type { AcaoCaso } from '@/domain/rules/seguimento'
import { TESTE_INICIAL, TIPOS_TESTE } from '@/domain/rotulos'
import type {
  Agravo,
  Caso,
  Escolaridade,
  ISODate,
  LoteInsumo,
  MotivoTestagem,
  Pessoa,
  RacaCor,
  ResultadoTR,
  Sexo,
  TipoTeste,
  Ubs,
  Usuario,
} from '@/domain/types'
import { VERSAO_BANCO, type Banco } from './banco'
import {
  auditar,
  executarAcaoCasoOp,
  registrarTestagemOp,
  sincronizarBuscaAtiva,
  type NovaTestagemInput,
} from './operacoes'

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FEM = ['Ana', 'Maria', 'Juliana', 'Fernanda', 'Patrícia', 'Aline', 'Luana', 'Bruna', 'Débora', 'Letícia', 'Tatiane', 'Vanessa', 'Gabriela', 'Jéssica', 'Priscila', 'Raquel', 'Simone', 'Daniela', 'Carolina', 'Natália', 'Adriana', 'Tainá', 'Yasmin', 'Eduarda', 'Laura', 'Isabela', 'Sandra', 'Michele', 'Francielle', 'Graziela']
const MASC = ['João', 'Rafael', 'Lucas', 'Mateus', 'Bruno', 'Diego', 'Rodrigo', 'Marcelo', 'André', 'Felipe', 'Gustavo', 'Leandro', 'Paulo', 'Ricardo', 'Vinícius', 'Alex', 'Jorge', 'Luiz', 'Márcio', 'Sérgio', 'Wagner', 'Cristiano', 'Fábio', 'Gilberto', 'Renan', 'Anderson', 'Juliano', 'Maicon', 'Douglas', 'Jonathan']
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Rocha', 'Almeida', 'Nascimento', 'Araújo', 'Melo', 'Barbosa', 'Cardoso', 'Teixeira', 'Moura', 'Correia', 'Machado', 'Fagundes', 'Becker', 'Schmitt', 'Kuhn', 'Vargas', 'Brum', 'Prestes']
const RUAS = ['Rua das Acácias', 'Rua Santa Rita', 'Travessa Esperança', 'Rua Sete de Setembro', 'Beco dos Pinheiros', 'Rua Nova', 'Rua São Jorge', 'Acesso B', 'Rua da Paz', 'Avenida Principal', 'Rua dos Ipês', 'Rua Beira-Rio', 'Rua Um', 'Rua Três', 'Estrada do Morro']

const FABRICANTES: Record<TipoTeste, string[]> = {
  hiv_tr1: ['Bio-Manguinhos (DPP HIV)'],
  hiv_tr2: ['Abbott (Determine HIV)'],
  sifilis_tr: ['Bio-Manguinhos (DPP Sífilis)', 'Abon'],
  hbsag_tr: ['Wama (Imuno-Rápido HBsAg)'],
  anti_hcv_tr: ['Bioclin (HCV)'],
}

const TERRITORIOS = [
  { id: 'ter-centro', nome: 'CS Centro', qualidade: 0.9 },
  { id: 'ter-norte', nome: 'CS Norte', qualidade: 0.8 },
  { id: 'ter-leste', nome: 'CS Leste', qualidade: 0.72 },
  { id: 'ter-sul', nome: 'CS Sul', qualidade: 0.92 },
  { id: 'ter-oeste', nome: 'CS Oeste', qualidade: 0.6 },
]

const UBS_DEF: [string, string, string][] = [
  ['ubs-santa-cecilia', 'UBS Santa Cecília', 'ter-centro'],
  ['ubs-bom-fim', 'UBS Bom Fim', 'ter-centro'],
  ['ubs-sarandi', 'UBS Sarandi', 'ter-norte'],
  ['ubs-rubem-berta', 'UBS Rubem Berta', 'ter-norte'],
  ['ubs-bom-jesus', 'UBS Bom Jesus', 'ter-leste'],
  ['ubs-lomba', 'UBS Lomba do Pinheiro', 'ter-leste'],
  ['ubs-restinga', 'UBS Restinga', 'ter-sul'],
  ['ubs-belem-novo', 'UBS Belém Novo', 'ter-sul'],
  ['ubs-gloria', 'UBS Glória', 'ter-oeste'],
  ['ubs-cristal', 'UBS Cristal', 'ter-oeste'],
]

export const UBS_DEMO = 'ubs-gloria'

export function gerarBancoDemo(hoje: ISODate = hojeISO()): Banco {
  const rand = mulberry32(20260924)
  const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1))
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]
  const chance = (p: number) => rand() < p
  const dia = (offset: number) => somarDias(hoje, offset)

  const banco: Banco = {
    versao: VERSAO_BANCO,
    geradoEm: hoje,
    parametros: structuredClone(PARAMETROS_PADRAO),
    territorios: TERRITORIOS.map(({ id, nome }) => ({ id, nome })),
    ubs: [],
    microareas: [],
    usuarios: [],
    pessoas: [],
    testagens: [],
    casos: [],
    notificacoes: [],
    tarefas: [],
    lotes: [],
    movimentacoes: [],
    auditoria: [],
  }
  const qualidade = (ubsId: string) => {
    const u = UBS_DEF.find((x) => x[0] === ubsId)!
    return TERRITORIOS.find((t) => t.id === u[2])!.qualidade
  }

  // ---------- Unidades, microáreas, usuários ----------
  for (const [id, nome, territorioId] of UBS_DEF) {
    banco.ubs.push({
      id,
      nome,
      territorioId,
      cnes: String(int(2200000, 2299999)),
      endereco: `${pick(RUAS)}, ${int(10, 2000)} — ${nome.replace('UBS ', '')}`,
    })
    for (let n = 1; n <= 4; n++) {
      banco.microareas.push({ id: `${id}-ma0${n}`, ubsId: id, codigo: `0${n}`, descricao: `Microárea 0${n}` })
    }
  }

  const demo: Usuario[] = [
    { id: 'usr-ana', nome: 'Ana Paula Ribeiro', perfil: 'executor', cargo: 'Enfermeira', email: 'ana.ribeiro@demo.poa', ubsId: UBS_DEMO, ativo: true },
    { id: 'usr-carlos', nome: 'Carlos Eduardo Lima', perfil: 'executor', cargo: 'Técnico de enfermagem', email: 'carlos.lima@demo.poa', ubsId: UBS_DEMO, ativo: true },
    { id: 'usr-beatriz', nome: 'Beatriz Rocha', perfil: 'responsavel_tecnico', cargo: 'Enfermeira — responsável técnica', email: 'beatriz.rocha@demo.poa', ubsId: UBS_DEMO, ativo: true },
    { id: 'usr-joana', nome: 'Joana Martins', perfil: 'acs', cargo: 'Agente comunitária de saúde', email: 'joana.martins@demo.poa', ubsId: UBS_DEMO, microareaId: `${UBS_DEMO}-ma01`, ativo: true },
    { id: 'usr-marcos', nome: 'Marcos Pereira', perfil: 'gestor', cargo: 'Gestão APS / DVS', email: 'marcos.pereira@demo.poa', ativo: true },
    { id: 'usr-paula', nome: 'Paula Schmitt', perfil: 'admin', cargo: 'Suporte de TI', email: 'paula.schmitt@demo.poa', ativo: true },
  ]
  banco.usuarios.push(...demo)
  const nomeProfissional = (fem: boolean) => `${pick(fem ? FEM : MASC)} ${pick(SOBRENOMES)}`
  for (const u of banco.ubs) {
    const extras: Omit<Usuario, 'id'>[] =
      u.id === UBS_DEMO
        ? [
            { nome: 'Rosane Prestes', perfil: 'acs', cargo: 'Agente comunitária de saúde', email: '', ubsId: u.id, microareaId: `${u.id}-ma02`, ativo: true },
            { nome: 'Everton Schmitt', perfil: 'acs', cargo: 'Agente comunitário de saúde', email: '', ubsId: u.id, microareaId: `${u.id}-ma03`, ativo: true },
          ]
        : [
            { nome: nomeProfissional(true), perfil: 'executor', cargo: 'Enfermeira', email: '', ubsId: u.id, ativo: true },
            { nome: nomeProfissional(false), perfil: 'executor', cargo: 'Técnico de enfermagem', email: '', ubsId: u.id, ativo: true },
            { nome: nomeProfissional(true), perfil: 'responsavel_tecnico', cargo: 'Enfermeira — responsável técnica', email: '', ubsId: u.id, ativo: true },
            { nome: nomeProfissional(true), perfil: 'acs', cargo: 'Agente comunitária de saúde', email: '', ubsId: u.id, microareaId: `${u.id}-ma01`, ativo: true },
            { nome: nomeProfissional(false), perfil: 'acs', cargo: 'Agente comunitário de saúde', email: '', ubsId: u.id, microareaId: `${u.id}-ma02`, ativo: true },
          ]
    extras.forEach((e, i) => {
      const email = e.email || `${e.nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${u.id.slice(4)}${i}@demo.poa`
      banco.usuarios.push({ ...e, email, id: `usr-${u.id.slice(4)}-${i}` })
    })
  }
  const executores = (ubsId: string) =>
    banco.usuarios.filter((u) => u.ubsId === ubsId && (u.perfil === 'executor' || u.perfil === 'responsavel_tecnico'))

  // ---------- Estoque ----------
  let seqLote = 0
  function criarLote(ubsId: string, tipo: TipoTeste, recebidoEm: ISODate, validade: ISODate, qtd: number): LoteInsumo {
    const lote: LoteInsumo = {
      id: `lot-${++seqLote}`,
      ubsId,
      tipo,
      fabricante: pick(FABRICANTES[tipo]),
      lote: `${tipo.slice(0, 3).toUpperCase()}${int(10000, 99999)}`,
      validade,
      recebidoEm,
      quantidadeInicial: qtd,
      quantidadeAtual: qtd,
    }
    banco.lotes.push(lote)
    banco.movimentacoes.push({
      id: `mov-e${seqLote}`,
      loteId: lote.id,
      ubsId,
      tipo: 'entrada',
      quantidade: qtd,
      data: recebidoEm,
      usuarioId: executores(ubsId).find((u) => u.perfil === 'responsavel_tecnico')?.id ?? 'usr-beatriz',
      motivo: 'Recebimento do almoxarifado central',
    })
    return lote
  }
  for (const u of banco.ubs) {
    for (const tipo of TIPOS_TESTE) {
      const recebimentos = tipo === 'hiv_tr2' ? [-200, -90] : [-200, -140, -80, -30]
      recebimentos.forEach((offset, k) => {
        if (u.id === UBS_DEMO && tipo === 'hbsag_tr' && k === 3) return // gera alerta de estoque baixo
        const qtd = tipo === 'hiv_tr2' ? 10 : u.id === UBS_DEMO && tipo === 'hbsag_tr' ? 22 : 25
        criarLote(u.id, tipo, dia(offset), dia(offset + int(150, 300)), qtd)
      })
    }
  }
  /** `reservados`: unidades já escolhidas na mesma testagem (repetições por inválido). */
  function loteParaUso(ubsId: string, tipo: TipoTeste, data: ISODate, reservados: Map<string, number>): string {
    const disponiveis = banco.lotes
      .filter((l) => l.ubsId === ubsId && l.recebidoEm <= data)
      .map((l) => ({ ...l, quantidadeAtual: l.quantidadeAtual - (reservados.get(l.id) ?? 0) }))
    const lote = selecionarLoteFEFO(disponiveis, tipo, data)
    if (lote) return lote.id
    return criarLote(ubsId, tipo, data, somarDias(data, 240), tipo === 'hiv_tr2' ? 10 : 25).id
  }

  // ---------- Pessoas ----------
  let seqPessoa = 0
  function novaPessoa(ubs: Ubs, sexo: Sexo, idadeMin: number, idadeMax: number, criadoEm: ISODate, extra: Partial<Pessoa> = {}): Pessoa {
    const q = qualidade(ubs.id)
    const primeiro = pick(sexo === 'F' ? FEM : MASC)
    const nome = `${primeiro} ${pick(SOBRENOMES)} ${pick(SOBRENOMES)}`
    const nascimento = somarDias(criadoEm, -int(idadeMin * 365, idadeMax * 365))
    const semCns = chance(0.1)
    const pessoa: Pessoa = {
      id: `pes-${++seqPessoa}`,
      nome,
      cns: semCns ? undefined : gerarCnsProvisorio(rand),
      cpf: semCns || chance(0.6) ? gerarCpf(rand) : undefined,
      dataNascimento: nascimento,
      sexo,
      nomeMae: chance(0.12 + (1 - q) * 0.2) ? undefined : `${pick(FEM)} ${pick(SOBRENOMES)}`,
      racaCor: chance(0.05 + (1 - q) * 0.25) ? 'ignorado' : pick<RacaCor>(['branca', 'branca', 'preta', 'parda', 'parda', 'indigena', 'amarela']),
      escolaridade: chance(0.15 + (1 - q) * 0.6)
        ? 'ignorado'
        : pick<Escolaridade>(['fundamental_incompleto', 'fundamental_completo', 'medio_incompleto', 'medio_completo', 'medio_completo', 'superior_incompleto', 'superior_completo']),
      telefone: chance(0.15) ? undefined : `519${int(80000000, 99999999)}`,
      endereco: { logradouro: pick(RUAS), numero: String(int(1, 1500)), bairro: ubs.nome.replace('UBS ', '') },
      ubsId: ubs.id,
      microareaId: `${ubs.id}-ma0${int(1, 4)}`,
      gestante: false,
      criadoEm: criadoEm,
      atualizadoEm: criadoEm,
      ...extra,
    }
    banco.pessoas.push(pessoa)
    return pessoa
  }

  // ---------- Testagens ----------
  function executarTestes(agravo: Agravo, pReagente: number): { tipo: TipoTeste; resultado: ResultadoTR }[] {
    const seq: { tipo: TipoTeste; resultado: ResultadoTR }[] = []
    const resultado = (p: number): ResultadoTR => (chance(0.01) ? 'invalido' : chance(p) ? 'reagente' : 'nao_reagente')
    const tipo = TESTE_INICIAL[agravo]
    let r = resultado(pReagente)
    while (r === 'invalido') {
      seq.push({ tipo, resultado: r })
      r = resultado(pReagente)
    }
    seq.push({ tipo, resultado: r })
    if (agravo === 'hiv' && r === 'reagente') {
      if (chance(0.85)) {
        seq.push({ tipo: 'hiv_tr2', resultado: 'reagente' })
      } else {
        seq.push({ tipo: 'hiv_tr2', resultado: 'nao_reagente' })
        seq.push({ tipo: 'hiv_tr1', resultado: 'reagente' })
        seq.push({ tipo: 'hiv_tr2', resultado: chance(0.5) ? 'reagente' : 'nao_reagente' })
      }
    }
    return seq
  }

  function registrar(
    pessoa: Pessoa,
    data: ISODate,
    motivo: MotivoTestagem,
    testesPorAgravo: Partial<Record<Agravo, { tipo: TipoTeste; resultado: ResultadoTR }[]>>,
    opts: { gestante?: boolean; ig?: number; exposicao?: boolean; dose?: boolean; executorId?: string } = {},
  ) {
    const agravos = Object.keys(testesPorAgravo) as Agravo[]
    const reservados = new Map<string, number>()
    const input: NovaTestagemInput = {
      pessoaId: pessoa.id,
      ubsId: pessoa.ubsId,
      executorId: opts.executorId ?? pick(executores(pessoa.ubsId)).id,
      data,
      motivo,
      gestante: Boolean(opts.gestante),
      idadeGestacionalSemanas: opts.ig,
      exposicaoRecente: Boolean(opts.exposicao),
      agravos,
      testes: agravos.flatMap((a) =>
        testesPorAgravo[a]!.map((t) => {
          const loteId = loteParaUso(pessoa.ubsId, t.tipo, data, reservados)
          reservados.set(loteId, (reservados.get(loteId) ?? 0) + 1)
          return { ...t, loteId }
        }),
      ),
      primeiraDoseSifilisAplicada: opts.dose,
    }
    return registrarTestagemOp(banco, input)
  }

  const MOTIVOS: [MotivoTestagem, number][] = [
    ['pre_natal', 0.28],
    ['parceria_gestante', 0.08],
    ['demanda_espontanea', 0.3],
    ['exposicao_risco', 0.1],
    ['prep_pep', 0.06],
    ['sintomas', 0.06],
    ['campanha', 0.12],
  ]
  const sorteiaMotivo = () => {
    let x = rand()
    for (const [m, p] of MOTIVOS) {
      if ((x -= p) < 0) return m
    }
    return 'demanda_espontanea'
  }

  const casosGerados: Caso[] = []
  for (let offset = -180; offset <= -1; offset++) {
    const data = dia(offset)
    const diaSemana = new Date(`${data}T12:00:00`).getDay()
    if (diaSemana === 0 || diaSemana === 6) continue
    for (const ubs of banco.ubs) {
      const n = (chance(0.45) ? 1 : 0) + (chance(0.15) ? 1 : 0)
      for (let k = 0; k < n; k++) {
        const motivo = sorteiaMotivo()
        let pessoa: Pessoa
        let gestante = false
        let ig: number | undefined
        if (motivo === 'pre_natal') {
          ig = int(6, 34)
          const dum = somarDias(data, -ig * 7)
          pessoa = novaPessoa(ubs, 'F', 16, 42, data, { dum: chance(0.1) ? undefined : dum, gestante: somarDias(dum, 280) > hoje })
          gestante = true
        } else if (motivo === 'parceria_gestante') {
          pessoa = novaPessoa(ubs, 'M', 18, 50, data)
        } else {
          const existentes = banco.pessoas.filter((p) => p.ubsId === ubs.id && p.criadoEm < data)
          pessoa = existentes.length > 5 && chance(0.25) ? pick(existentes) : novaPessoa(ubs, chance(0.5) ? 'F' : 'M', 16, 70, data)
        }
        const exposicao = (motivo === 'exposicao_risco' || motivo === 'prep_pep') && chance(0.4)
        const fator = motivo === 'sintomas' ? 4 : motivo === 'exposicao_risco' ? 1.8 : motivo === 'pre_natal' ? 0.7 : 1
        const completo = motivo === 'pre_natal' || motivo === 'parceria_gestante' || chance(0.6)
        const testes: Partial<Record<Agravo, { tipo: TipoTeste; resultado: ResultadoTR }[]>> = {
          hiv: executarTestes('hiv', 0.012 * fator),
          sifilis: executarTestes('sifilis', 0.07 * fator),
        }
        if (completo) {
          testes.hepatite_b = executarTestes('hepatite_b', 0.006 * fator)
          testes.hepatite_c = executarTestes('hepatite_c', 0.012 * fator)
        }
        const q = qualidade(ubs.id)
        const { casos } = registrar(pessoa, data, motivo, testes, {
          gestante,
          ig,
          exposicao,
          dose: gestante && chance(0.45 + 0.5 * q),
        })
        casosGerados.push(...casos)
      }
    }
  }

  // ---------- Evolução dos casos ----------
  const titulos = ['1:2', '1:4', '1:8', '1:16', '1:32', '1:64']
  function evoluir(casoId: string) {
    const atual = () => banco.casos.find((c) => c.id === casoId)!
    const agir = (a: AcaoCaso) => {
      try {
        executarAcaoCasoOp(banco, casoId, a)
        return true
      } catch {
        return false
      }
    }
    const ok = (d: ISODate) => d <= hoje
    const c0 = atual()
    const q = qualidade(c0.ubsId)
    const lento = q < 0.8

    if (c0.agravo === 'sifilis' && c0.gestante && !tratamentoIniciado(c0) && chance(q)) {
      const d = somarDias(c0.abertoEm, int(1, 5))
      if (ok(d)) agir({ tipo: 'aplicar_dose', numero: 1, data: d })
    }
    if (!c0.confirmatorio.dispensado && chance(0.55 + 0.4 * q)) {
      const coleta = somarDias(c0.abertoEm, int(0, lento ? 12 : 4))
      if (ok(coleta) && agir({ tipo: 'registrar_coleta', data: coleta }) && chance(0.95)) {
        const res = somarDias(coleta, int(3, 18))
        if (ok(res)) {
          const confirmado = c0.agravo === 'sifilis' ? chance(0.85) || c0.gestante : chance(0.75)
          agir({
            tipo: 'registrar_resultado',
            data: res,
            resultado: confirmado ? 'confirmado' : 'descartado',
            titulo: c0.agravo === 'sifilis' && confirmado ? pick(titulos) : undefined,
          })
        }
      }
    }
    let c = atual()
    if (!c.desfecho && !tratamentoIniciado(c) && c.confirmatorio.resultado === 'confirmado' && chance(0.5 + 0.45 * q)) {
      const inicio = somarDias(c.confirmatorio.resultadoEm ?? c.abertoEm, int(0, lento ? 14 : 5))
      if (ok(inicio)) agir({ tipo: 'iniciar_tratamento', data: inicio })
    }
    c = atual()
    for (const dose of c.tratamento?.doses ?? []) {
      if (dose.aplicadaEm) continue
      const cur = atual().tratamento!.doses.find((d) => d.numero === dose.numero)!
      const d = somarDias(cur.previstaEm, int(0, 3))
      if (!ok(d) || !chance(0.8 + 0.18 * q)) break
      agir({ tipo: 'aplicar_dose', numero: dose.numero, data: d })
    }
    if (c.agravo === 'sifilis' && c.gestante && !c.desfecho) {
      const id = `par-${casoId}`
      agir({ tipo: 'adicionar_parceria', id, nome: `${pick(MASC)} (parceria)` })
      if (chance(q)) agir({ tipo: 'atualizar_parceria', id, testada: true, tratada: chance(q) })
    }
    c = atual()
    if (c.agravo === 'sifilis' && tratamentoConcluido(c)) {
      let titulo = tituloParaNumero(c.confirmatorio.titulo ?? '1:16') ?? 16
      for (let i = 0; i < 6; i++) {
        const prox = proximoVdrl(atual(), banco.parametros)
        if (!prox) break
        const d = somarDias(prox, int(0, 5))
        if (!ok(d) || !chance(0.6 + 0.35 * q)) break
        titulo = Math.max(1, Math.floor(titulo / (chance(0.8) ? 2 : 1)))
        agir({ tipo: 'registrar_seguimento', id: `vd-${casoId}-${i}`, data: d, exame: 'VDRL', resultado: titulo <= 1 ? 'Não reagente' : `1:${titulo}` })
      }
      c = atual()
      if (c.seguimento.length >= 2 && diasEntre(c.tratamento!.iniciadoEm!, hoje) > 120 && chance(0.6)) {
        agir({ tipo: 'encerrar', desfecho: { tipo: 'tratamento_concluido', data: c.seguimento.at(-1)!.data } })
      }
    }
    c = atual()
    if (c.agravo !== 'sifilis' && tratamentoIniciado(c) && !c.desfecho) {
      const d = somarDias(c.tratamento!.iniciadoEm!, int(10, 40))
      if (ok(d) && chance(0.8)) agir({ tipo: 'encerrar', desfecho: { tipo: 'vinculado_servico', data: d } })
    }
    c = atual()
    if (!c.desfecho && diasEntre(c.abertoEm, hoje) > 75 && !tratamentoIniciado(c) && chance(0.55)) {
      agir({
        tipo: 'encerrar',
        desfecho: { tipo: 'perda_seguimento', data: somarDias(c.abertoEm, 60), observacao: 'Três tentativas de busca ativa sem sucesso.' },
      })
    }
  }
  casosGerados.forEach((c) => evoluir(c.id))

  // ---------- Notificações enviadas ----------
  for (const n of banco.notificacoes) {
    const q = qualidade(n.ubsId)
    if (!chance(0.45 + 0.5 * q)) continue
    const envio = somarDias(n.criadaEm, int(0, q < 0.8 ? 14 : 6))
    if (envio > hoje) continue
    n.status = 'enviada'
    n.enviadaEm = `${envio}T${String(int(8, 17)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00`
    n.enviadaPorId = executores(n.ubsId).find((u) => u.perfil === 'responsavel_tecnico')?.id
    n.protocolo = n.destino === 'sentinela' ? `SEN-${envio.slice(0, 4)}-${int(100000, 999999)}` : `E-mail DVS ${envio}`
  }

  // ---------- Cenários-vitrine na UBS de demonstração ----------
  const gloria = banco.ubs.find((u) => u.id === UBS_DEMO)!
  const NR = (tipo: TipoTeste) => [{ tipo, resultado: 'nao_reagente' as ResultadoTR }]
  const R = (tipo: TipoTeste) => [{ tipo, resultado: 'reagente' as ResultadoTR }]
  const todosNR = { hiv: NR('hiv_tr1'), sifilis: NR('sifilis_tr'), hepatite_b: NR('hbsag_tr'), hepatite_c: NR('anti_hcv_tr') }
  const pessoaVitrine = (nome: string, sexo: Sexo, idadeAnos: number, ma: number, extra: Partial<Pessoa> = {}) =>
    novaPessoa(gloria, sexo, idadeAnos, idadeAnos, dia(-60), { nome, microareaId: `${UBS_DEMO}-ma0${ma}`, ...extra })
  const ana = 'usr-ana'

  // A) Gestante tratada no ato, VDRL coletado, parceria sem tratamento
  const larissa = pessoaVitrine('Larissa Fagundes Moura', 'F', 24, 1, { gestante: true, dum: dia(-3 - 14 * 7), escolaridade: 'ignorado' })
  const a = registrar(larissa, dia(-3), 'pre_natal', { ...todosNR, sifilis: R('sifilis_tr') }, { gestante: true, ig: 14, dose: true, executorId: ana })
  executarAcaoCasoOp(banco, a.casos[0].id, { tipo: 'registrar_coleta', data: dia(-3) })
  executarAcaoCasoOp(banco, a.casos[0].id, { tipo: 'adicionar_parceria', id: 'par-larissa', nome: 'Diego (parceiro)' })

  // B) Gestante com 2ª dose atrasada → busca ativa
  const camila = pessoaVitrine('Camila Brum Vargas', 'F', 29, 1, { gestante: true, dum: dia(-16 - 22 * 7) })
  const b = registrar(camila, dia(-16), 'pre_natal', { ...todosNR, sifilis: R('sifilis_tr') }, { gestante: true, ig: 22, dose: true, executorId: ana })
  executarAcaoCasoOp(banco, b.casos[0].id, { tipo: 'registrar_coleta', data: dia(-16) })
  executarAcaoCasoOp(banco, b.casos[0].id, { tipo: 'registrar_resultado', data: dia(-9), resultado: 'confirmado', titulo: '1:16' })
  executarAcaoCasoOp(banco, b.casos[0].id, { tipo: 'adicionar_parceria', id: 'par-camila', nome: 'Maicon (parceiro)' })
  executarAcaoCasoOp(banco, b.casos[0].id, { tipo: 'atualizar_parceria', id: 'par-camila', testada: true, tratada: true })

  // C) Sífilis adquirida sem coleta do confirmatório → busca ativa
  const joao = pessoaVitrine('João Pedro Kuhn', 'M', 34, 1)
  registrar(joao, dia(-12), 'demanda_espontanea', { hiv: NR('hiv_tr1'), sifilis: R('sifilis_tr') }, { executorId: 'usr-carlos' })

  // D) HIV reagente aguardando vinculação ao SAE
  const rafael = pessoaVitrine('Rafael Teixeira Lima', 'M', 27, 3)
  registrar(rafael, dia(-2), 'exposicao_risco', { ...todosNR, hiv: [...R('hiv_tr1'), ...R('hiv_tr2')] }, { exposicao: false, executorId: ana })

  // E) Hepatite C aguardando resultado da carga viral
  const sonia = pessoaVitrine('Sônia Machado', 'F', 52, 2)
  const e = registrar(sonia, dia(-20), 'campanha', { ...todosNR, hepatite_c: R('anti_hcv_tr') }, { executorId: 'usr-carlos' })
  executarAcaoCasoOp(banco, e.casos[0].id, { tipo: 'registrar_coleta', data: dia(-18) })

  // F) HIV com discordância persistente → coleta venosa
  const tiago = pessoaVitrine('Tiago Becker', 'M', 41, 4)
  registrar(
    tiago,
    dia(-1),
    'demanda_espontanea',
    {
      hiv: [
        { tipo: 'hiv_tr1', resultado: 'reagente' },
        { tipo: 'hiv_tr2', resultado: 'nao_reagente' },
        { tipo: 'hiv_tr1', resultado: 'reagente' },
        { tipo: 'hiv_tr2', resultado: 'nao_reagente' },
      ],
      sifilis: NR('sifilis_tr'),
    },
    { executorId: ana },
  )

  // G) Sífilis adquirida em seguimento sorológico
  const marta = pessoaVitrine('Marta Correia', 'F', 38, 2, { escolaridade: 'medio_completo', racaCor: 'preta' })
  const g = registrar(marta, dia(-100), 'sintomas', { hiv: NR('hiv_tr1'), sifilis: R('sifilis_tr') }, { executorId: ana })
  const gid = g.casos[0].id
  executarAcaoCasoOp(banco, gid, { tipo: 'registrar_coleta', data: dia(-100) })
  executarAcaoCasoOp(banco, gid, { tipo: 'registrar_resultado', data: dia(-94), resultado: 'confirmado', titulo: '1:32' })
  executarAcaoCasoOp(banco, gid, { tipo: 'iniciar_tratamento', data: dia(-93) })
  executarAcaoCasoOp(banco, gid, { tipo: 'aplicar_dose', numero: 2, data: dia(-86) })
  executarAcaoCasoOp(banco, gid, { tipo: 'aplicar_dose', numero: 3, data: dia(-79) })

  // H) Gestante sem a 1ª dose aplicada → tratamento vencido
  const kelly = pessoaVitrine('Kelly Nascimento', 'F', 19, 1, { gestante: true, dum: dia(-5 - 10 * 7), telefone: undefined })
  registrar(kelly, dia(-5), 'pre_natal', { ...todosNR, sifilis: R('sifilis_tr') }, { gestante: true, ig: 10, dose: false, executorId: 'usr-carlos' })

  // I) Testagens de hoje
  registrar(pessoaVitrine('Paulo Rocha Alves', 'M', 45, 2), hoje, 'campanha', todosNR, { executorId: ana })
  registrar(pessoaVitrine('Yasmin Cardoso', 'F', 22, 3), hoje, 'prep_pep', { hiv: NR('hiv_tr1'), sifilis: NR('sifilis_tr') }, { executorId: 'usr-carlos' })

  // Lotes-problema: vencido com saldo e vencendo em breve
  criarLote(UBS_DEMO, 'sifilis_tr', dia(-45), dia(-4), 12).fabricante = 'Abon'
  criarLote(UBS_DEMO, 'anti_hcv_tr', dia(-120), dia(18), 15)
  const lotePerda = banco.lotes.find((l) => l.ubsId === UBS_DEMO && l.tipo === 'hiv_tr1' && l.quantidadeAtual >= 2 && l.validade > hoje)!
  banco.movimentacoes.push({
    id: 'mov-perda-demo',
    loteId: lotePerda.id,
    ubsId: UBS_DEMO,
    tipo: 'perda',
    quantidade: -2,
    data: dia(-20),
    usuarioId: 'usr-beatriz',
    motivo: 'Dispositivos danificados no transporte',
  })
  lotePerda.quantidadeAtual -= 2

  // ---------- Busca ativa + tentativas ----------
  sincronizarBuscaAtiva(banco, hoje)
  for (const t of banco.tarefas.filter((t) => t.status === 'aberta')) {
    if (chance(0.5)) {
      const acs = banco.usuarios.find((u) => u.perfil === 'acs' && u.microareaId === t.microareaId)
      t.tentativas.push({
        id: `tent-${t.id}`,
        data: somarDias(t.criadaEm, int(0, 3)) > hoje ? hoje : somarDias(t.criadaEm, int(0, 3)),
        usuarioId: acs?.id ?? 'usr-beatriz',
        meio: pick(['visita', 'telefone', 'mensagem'] as const),
        resultado: pick(['nao_encontrado', 'endereco_incorreto', 'contato_realizado'] as const),
      })
    }
  }

  // ---------- Auditoria (últimos 14 dias) ----------
  for (const t of banco.testagens.filter((x) => diasEntre(x.data, hoje) <= 14)) {
    auditar(banco, {
      data: `${t.data}T${String(int(8, 16)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00`,
      usuarioId: t.executorId,
      ubsId: t.ubsId,
      acao: 'testagem.registrar',
      entidade: 'testagem',
      entidadeId: t.id,
      descricao: `Registrou testagem (${t.agravos.length} agravo(s))`,
    })
  }
  banco.auditoria.sort((x, y) => x.data.localeCompare(y.data))
  return banco
}
