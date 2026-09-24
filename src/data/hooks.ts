import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AcaoCaso } from '@/domain/rules/seguimento'
import type { Agravo, EventoAuditoria, ISODate, Parametros, StatusCaso, TentativaContato, TipoMovimentacao, Usuario } from '@/domain/types'
import * as api from './api'

/** Após qualquer escrita, invalida o cache (o mock é barato; no backend, refinar por chave). */
function useEscrita<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'referencias' }),
  })
}

// sessão
export const useSessao = () => useQuery({ queryKey: ['sessao'], queryFn: api.obterSessao, staleTime: Infinity })
export const useUsuariosDemo = () => useQuery({ queryKey: ['usuarios-demo'], queryFn: api.listarUsuariosDemo })
export function useEntrar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.entrar,
    onSuccess: async () => {
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'sessao' })
      await qc.invalidateQueries({ queryKey: ['sessao'] })
    },
  })
}
export function useSair() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.sair,
    onSuccess: () => {
      qc.setQueryData(['sessao'], null)
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'sessao' })
    },
  })
}

// referência
export const useReferencias = () => useQuery({ queryKey: ['referencias'], queryFn: api.listarReferencias, staleTime: 60_000 })
export const useParametros = () => useQuery({ queryKey: ['parametros'], queryFn: api.obterParametros })

// pessoas
export const usePessoas = (termo: string) =>
  useQuery({ queryKey: ['pessoas', termo], queryFn: () => api.buscarPessoas({ termo }), placeholderData: keepPreviousData })
export const usePessoa = (id?: string) =>
  useQuery({ queryKey: ['pessoa', id], queryFn: () => api.obterPessoa(id!), enabled: Boolean(id) })
export const useSalvarPessoa = () =>
  useEscrita(({ dados, id }: { dados: api.PessoaInput; id?: string }) => api.salvarPessoa(dados, id))

// testagens
export const useTestagens = (filtro: Parameters<typeof api.listarTestagens>[0]) =>
  useQuery({ queryKey: ['testagens', filtro], queryFn: () => api.listarTestagens(filtro), placeholderData: keepPreviousData })
export const useTestagem = (id?: string) =>
  useQuery({ queryKey: ['testagem', id], queryFn: () => api.obterTestagem(id!), enabled: Boolean(id) })
export const useLotesTestagem = () => useQuery({ queryKey: ['lotes-testagem'], queryFn: api.obterLotesParaTestagem })
export const useRegistrarTestagem = () => useEscrita(api.registrarTestagem)

// casos
export const useCasos = (filtro: { status?: StatusCaso | 'ativos'; agravo?: Agravo; termo?: string }) =>
  useQuery({ queryKey: ['casos', filtro], queryFn: () => api.listarCasos(filtro), placeholderData: keepPreviousData })
export const useCaso = (id?: string) =>
  useQuery({ queryKey: ['caso', id], queryFn: () => api.obterCaso(id!), enabled: Boolean(id) })
export const useAcaoCaso = (casoId: string) => useEscrita((acao: AcaoCaso) => api.executarAcaoCaso(casoId, acao))

// busca ativa
export const useBuscaAtiva = (filtro: { status?: 'aberta' | 'concluida'; microareaId?: string }, habilitado = true) =>
  useQuery({ queryKey: ['busca-ativa', filtro], queryFn: () => api.listarBuscaAtiva(filtro), enabled: habilitado })
export const useRegistrarTentativa = () =>
  useEscrita(({ tarefaId, dados }: { tarefaId: string; dados: Omit<TentativaContato, 'id' | 'usuarioId' | 'data'> }) =>
    api.registrarTentativa(tarefaId, dados),
  )

// estoque
export const useEstoque = (habilitado = true) =>
  useQuery({ queryKey: ['estoque'], queryFn: api.obterEstoque, enabled: habilitado })
export const useMovimentacoes = (filtro: { tipo?: TipoMovimentacao; mes?: string }) =>
  useQuery({ queryKey: ['movimentacoes', filtro], queryFn: () => api.listarMovimentacoes(filtro), placeholderData: keepPreviousData })
export const useEntradaLote = () => useEscrita(api.registrarEntradaLote)
export const useBaixaLote = () =>
  useEscrita(({ loteId, dados }: { loteId: string; dados: Parameters<typeof api.registrarBaixa>[1] }) =>
    api.registrarBaixa(loteId, dados),
  )
export const useFechamento = (mes: string) =>
  useQuery({ queryKey: ['fechamento', mes], queryFn: () => api.obterFechamento(mes), placeholderData: keepPreviousData })

// notificações
export const useNotificacoes = (status?: 'pendente' | 'enviada') =>
  useQuery({ queryKey: ['notificacoes', status], queryFn: () => api.listarNotificacoes({ status }) })
export const useMarcarEnviada = () =>
  useEscrita(({ id, protocolo }: { id: string; protocolo: string }) => api.marcarNotificacaoEnviada(id, { protocolo }))

// indicadores e painel
export const useIndicadores = (filtro: { inicio: ISODate; fim: ISODate; territorioId?: string; ubsId?: string }) =>
  useQuery({ queryKey: ['indicadores', filtro], queryFn: () => api.obterIndicadores(filtro), placeholderData: keepPreviousData })
export const usePainelUbs = (habilitado = true) =>
  useQuery({ queryKey: ['painel-ubs'], queryFn: api.obterPainelUbs, enabled: habilitado })

// administração
export const useAuditoria = (filtro: { entidade?: EventoAuditoria['entidade']; usuarioId?: string }) =>
  useQuery({ queryKey: ['auditoria', filtro], queryFn: () => api.listarAuditoria(filtro), placeholderData: keepPreviousData })
export const useUsuarios = () => useQuery({ queryKey: ['usuarios'], queryFn: api.listarUsuarios })
export const useSalvarUsuario = () =>
  useEscrita(({ dados, id }: { dados: Omit<Usuario, 'id'>; id?: string }) => api.salvarUsuario(dados, id))
export const useAtualizarParametros = () => useEscrita((p: Parametros) => api.atualizarParametros(p))
export function useRestaurarDemo() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.restaurarDemonstracao, onSuccess: () => qc.invalidateQueries() })
}
