import { useState } from 'react'
import { useSessaoAtiva } from '@/app/sessao'
import { ICONE } from '@/components/icones'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Aviso, Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Feedback'
import { Field, Select } from '@/components/ui/Form'
import { PageHeader } from '@/components/ui/Layout'
import { useAuditoria, useReferencias } from '@/data/hooks'
import { PERFIL_CURTO } from '@/domain/rotulos'
import type { EventoAuditoria } from '@/domain/types'
import { formatarDataHora } from '@/lib/datas'

const ENTIDADES: Record<EventoAuditoria['entidade'], string> = {
  pessoa: 'Pessoa',
  testagem: 'Testagem',
  caso: 'Caso',
  notificacao: 'Notificação',
  lote: 'Estoque',
  busca_ativa: 'Busca ativa',
  usuario: 'Usuário',
  sistema: 'Sistema',
  sessao: 'Sessão',
}

export default function AuditoriaPage() {
  const { usuario } = useSessaoAtiva()
  const [entidade, setEntidade] = useState<EventoAuditoria['entidade'] | ''>('')
  const [usuarioId, setUsuarioId] = useState('')
  const refs = useReferencias()
  const { data, isLoading, error } = useAuditoria({ entidade: entidade || undefined, usuarioId: usuarioId || undefined })
  const usuarios = refs.data?.usuarios.filter((u) => usuario.perfil === 'admin' || u.ubsId === usuario.ubsId) ?? []

  return (
    <>
      <PageHeader
        titulo="Auditoria"
        descricao={usuario.perfil === 'admin' ? 'Trilha de todas as ações no sistema.' : 'Trilha de ações realizadas na sua UBS.'}
      />
      <Aviso tom="info" className="mb-6" icone={ICONE.auditoria} titulo="Rastreabilidade (LGPD)">
        Toda criação, alteração e visualização de dados pessoais fica registrada com autor, data e hora. Os registros não
        podem ser editados nem apagados.
      </Aviso>
      <Card>
        <CardBody className="pt-5">
          <div className="mb-4 grid max-w-2xl gap-3 sm:grid-cols-2">
            <Field label="Tipo de registro">
              <Select value={entidade} onChange={(e) => setEntidade(e.target.value as EventoAuditoria['entidade'] | '')}>
                <option value="">Todos</option>
                {Object.entries(ENTIDADES).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Usuário">
              <Select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
                <option value="">Todos</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </Select>
            </Field>
          </div>
          {isLoading && <Carregando />}
          {error && <EstadoErro erro={error} />}
          {data && (
            <DataTable
              legenda="Eventos de auditoria"
              linhas={data}
              chave={(e) => e.evento.id}
              vazio={<EstadoVazio icone={ICONE.auditoria} titulo="Nenhum evento no filtro" />}
              principal={(e) => <span className="font-bold">{e.evento.descricao}</span>}
              colunas={[
                { chave: 'quando', cabecalho: 'Data e hora', celula: (e) => formatarDataHora(e.evento.data), className: 'tabular whitespace-nowrap' },
                {
                  chave: 'quem',
                  cabecalho: 'Usuário',
                  celula: (e) => (
                    <span className="flex flex-wrap items-center gap-1">
                      {e.usuario?.nome ?? '—'}
                      {e.usuario && <Badge>{PERFIL_CURTO[e.usuario.perfil]}</Badge>}
                    </span>
                  ),
                },
                { chave: 'o-que', cabecalho: 'Ação', celula: (e) => e.evento.descricao, ocultarMobile: true },
                { chave: 'tipo', cabecalho: 'Tipo', celula: (e) => ENTIDADES[e.evento.entidade] },
              ]}
            />
          )}
        </CardBody>
      </Card>
    </>
  )
}
