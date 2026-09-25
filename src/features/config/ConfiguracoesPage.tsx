import { Pencil, RotateCcw, UserPlus } from 'lucide-react'
import { useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { ICONE } from '@/components/icones'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { Aviso, Carregando, EstadoErro } from '@/components/ui/Feedback'
import { Checkbox, Field, GrupoCampos, Input, Select } from '@/components/ui/Form'
import { PageHeader } from '@/components/ui/Layout'
import { TabPanel, Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useAtualizarParametros, useParametros, useReferencias, useRestaurarDemo, useSalvarUsuario, useUsuarios } from '@/data/hooks'
import { NIVEL_ACESSO } from '@/domain/permissoes'
import { PERFIL_ROTULO, TIPO_TESTE_ROTULO, TIPOS_TESTE } from '@/domain/rotulos'
import type { Parametros, Perfil, Usuario } from '@/domain/types'

type Aba = 'usuarios' | 'parametros' | 'unidades' | 'demo'

function DialogoUsuario({ usuario, aoFechar }: { usuario: Usuario | 'novo' | null; aoFechar: () => void }) {
  const refs = useReferencias()
  const salvar = useSalvarUsuario()
  const toast = useToast()
  const existente = usuario && usuario !== 'novo' ? usuario : undefined
  const [f, setF] = useState<Omit<Usuario, 'id'>>(
    existente ?? { nome: '', perfil: 'executor', cargo: '', email: '', ubsId: '', microareaId: '', ativo: true },
  )
  const local = f.perfil !== 'gestor' && f.perfil !== 'admin'
  return (
    <Dialog
      aberto={Boolean(usuario)}
      aoFechar={aoFechar}
      titulo={existente ? `Editar ${existente.nome}` : 'Novo usuário'}
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar}>Cancelar</Button>
          <Button
            carregando={salvar.isPending}
            onClick={async () => {
              try {
                await salvar.mutateAsync({ dados: f, id: existente?.id })
                toast.sucesso('Usuário salvo.')
                aoFechar()
              } catch (e) {
                toast.erro(e)
              }
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" obrigatorio className="sm:col-span-2">
          <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        </Field>
        <Field label="E-mail institucional">
          <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="Cargo">
          <Input value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} />
        </Field>
        <Field label="Perfil de acesso" obrigatorio dica={NIVEL_ACESSO[f.perfil].descricao} className="sm:col-span-2">
          <Select value={f.perfil} onChange={(e) => setF({ ...f, perfil: e.target.value as Perfil })}>
            {(Object.keys(PERFIL_ROTULO) as Perfil[]).map((p) => (
              <option key={p} value={p}>{PERFIL_ROTULO[p]} (nível {NIVEL_ACESSO[p].nivel})</option>
            ))}
          </Select>
        </Field>
        {local && (
          <Field label="UBS" obrigatorio>
            <Select value={f.ubsId ?? ''} onChange={(e) => setF({ ...f, ubsId: e.target.value, microareaId: '' })}>
              <option value="">Selecione…</option>
              {refs.data?.ubs.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Select>
          </Field>
        )}
        {f.perfil === 'acs' && (
          <Field label="Microárea" obrigatorio>
            <Select value={f.microareaId ?? ''} onChange={(e) => setF({ ...f, microareaId: e.target.value })}>
              <option value="">Selecione…</option>
              {refs.data?.microareas.filter((m) => m.ubsId === f.ubsId).map((m) => <option key={m.id} value={m.id}>{m.descricao}</option>)}
            </Select>
          </Field>
        )}
        <Checkbox className="sm:col-span-2" label="Usuário ativo" descricao="Usuários inativos não conseguem entrar." checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} />
      </div>
    </Dialog>
  )
}

function FormParametros({ p }: { p: Parametros }) {
  const [f, setF] = useState(p)
  const salvar = useAtualizarParametros()
  const toast = useToast()
  const num = (k: keyof Omit<Parametros, 'estoqueMinimo'>, rotulo: string, dica?: string) => (
    <Field label={rotulo} dica={dica}>
      <Input type="number" min={0} inputMode="numeric" value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} />
    </Field>
  )
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={async (e) => {
        e.preventDefault()
        try {
          await salvar.mutateAsync(f)
          toast.sucesso('Parâmetros atualizados. Prazos recalculados.')
        } catch (err) {
          toast.erro(err)
        }
      }}
    >
      <GrupoCampos legenda="Prazos do seguimento (dias)" className="lg:grid-cols-3">
        {num('prazoColetaConfirmatorioDias', 'Coleta do confirmatório')}
        {num('prazoResultadoConfirmatorioDias', 'Resultado do confirmatório', 'Contado a partir da coleta.')}
        {num('prazoInicioTratamentoDias', 'Início do tratamento', 'Gestante com sífilis: sempre no mesmo dia.')}
        {num('prazoNotificacaoDias', 'Envio da notificação')}
        {num('toleranciaBuscaAtivaDias', 'Tolerância para busca ativa', 'Dias de atraso antes de acionar o ACS.')}
        {num('intervaloDoseSifilisDias', 'Intervalo entre doses (sífilis)')}
        {num('seguimentoVdrlGestanteDias', 'VDRL de seguimento da gestante')}
        {num('seguimentoVdrlDias', 'VDRL de seguimento, demais casos')}
      </GrupoCampos>
      <GrupoCampos legenda="Estoque" className="lg:grid-cols-3">
        {num('alertaValidadeDias', 'Alertar validade com antecedência de')}
        {TIPOS_TESTE.map((t) => (
          <Field key={t} label={`Mínimo de ${TIPO_TESTE_ROTULO[t]}`}>
            <Input type="number" min={0} inputMode="numeric" value={f.estoqueMinimo[t]} onChange={(e) => setF({ ...f, estoqueMinimo: { ...f.estoqueMinimo, [t]: Number(e.target.value) } })} />
          </Field>
        ))}
      </GrupoCampos>
      <div className="flex justify-end gap-2">
        <Button variante="secundario" onClick={() => setF(p)}>Descartar alterações</Button>
        <Button type="submit" carregando={salvar.isPending}>Salvar parâmetros</Button>
      </div>
    </form>
  )
}

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<Aba>('usuarios')
  const idBase = useId()
  const usuarios = useUsuarios()
  const params = useParametros()
  const refs = useReferencias()
  const restaurar = useRestaurarDemo()
  const toast = useToast()
  const navegar = useNavigate()
  const [editando, setEditando] = useState<Usuario | 'novo' | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const nomeUbs = (id?: string) => refs.data?.ubs.find((u) => u.id === id)?.nome ?? '—'

  return (
    <>
      <PageHeader titulo="Configurações" descricao="Usuários, perfis de acesso, prazos e unidades." />
      <Card>
        <CardBody className="pt-2">
          <Tabs
            rotulo="Seções de configuração"
            idBase={idBase}
            ativa={aba}
            onChange={setAba}
            abas={[
              { id: 'usuarios', rotulo: 'Usuários', contagem: usuarios.data?.length },
              { id: 'parametros', rotulo: 'Prazos e estoque' },
              { id: 'unidades', rotulo: 'Unidades' },
              { id: 'demo', rotulo: 'Dados de demonstração' },
            ]}
          />
          <TabPanel idBase={idBase} id={aba} className="pt-5 focus:outline-none">
            {aba === 'usuarios' && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-end">
                  <Button icone={UserPlus} onClick={() => setEditando('novo')}>Novo usuário</Button>
                </div>
                {usuarios.isLoading && <Carregando />}
                {usuarios.error && <EstadoErro erro={usuarios.error} />}
                {usuarios.data && (
                  <DataTable
                    legenda="Usuários do sistema"
                    linhas={usuarios.data}
                    chave={(u) => u.id}
                    principal={(u) => <span className="font-bold">{u.nome}</span>}
                    colunas={[
                      { chave: 'nome', cabecalho: 'Nome', celula: (u) => <span className="font-bold">{u.nome}</span>, ocultarMobile: true },
                      { chave: 'perfil', cabecalho: 'Perfil', celula: (u) => <Badge tom="primario">N{NIVEL_ACESSO[u.perfil].nivel} · {PERFIL_ROTULO[u.perfil]}</Badge> },
                      { chave: 'ubs', cabecalho: 'Lotação', celula: (u) => (u.ubsId ? nomeUbs(u.ubsId) : 'Rede municipal') },
                      { chave: 'ativo', cabecalho: 'Situação', celula: (u) => (u.ativo ? <Badge tom="sucesso" icone={ICONE.ok}>Ativo</Badge> : <Badge>Inativo</Badge>) },
                      {
                        chave: 'acoes',
                        cabecalho: <span className="sr-only">Ações</span>,
                        celula: (u) => (
                          <Button tamanho="sm" variante="fantasma" icone={Pencil} onClick={() => setEditando(u)} aria-label={`Editar ${u.nome}`}>
                            Editar
                          </Button>
                        ),
                      },
                    ]}
                  />
                )}
              </div>
            )}
            {aba === 'parametros' && (params.data ? <FormParametros key={JSON.stringify(params.data)} p={params.data} /> : <Carregando />)}
            {aba === 'unidades' && (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {refs.data?.ubs.map((u) => (
                  <li key={u.id} className="rounded-xl border border-border p-4">
                    <p className="font-bold">{u.nome}</p>
                    <p className="text-sm text-muted">CNES {u.cnes} · {refs.data.territorios.find((t) => t.id === u.territorioId)?.nome}</p>
                    <p className="text-sm text-muted">{u.endereco}</p>
                  </li>
                ))}
              </ul>
            )}
            {aba === 'demo' && (
              <Card className="max-w-2xl">
                <CardHeader titulo="Restaurar dados de demonstração" icone={<RotateCcw className="size-5" aria-hidden />} />
                <CardBody className="flex flex-col gap-4">
                  <Aviso tom="atencao">
                    Apaga tudo o que foi registrado neste navegador e gera novamente os dados fictícios, com datas relativas a
                    hoje. Útil antes de uma apresentação.
                  </Aviso>
                  <div>
                    <Button variante="perigo" icone={RotateCcw} onClick={() => setConfirmar(true)}>Restaurar dados</Button>
                  </div>
                </CardBody>
              </Card>
            )}
          </TabPanel>
        </CardBody>
      </Card>
      {editando && <DialogoUsuario key={editando === 'novo' ? 'novo' : editando.id} usuario={editando} aoFechar={() => setEditando(null)} />}
      <ConfirmDialog
        aberto={confirmar}
        aoFechar={() => setConfirmar(false)}
        perigo
        carregando={restaurar.isPending}
        titulo="Restaurar dados de demonstração?"
        mensagem="Todos os registros feitos neste navegador serão perdidos. Esta ação não pode ser desfeita."
        rotuloConfirmar="Sim, restaurar"
        aoConfirmar={async () => {
          await restaurar.mutateAsync()
          setConfirmar(false)
          toast.sucesso('Dados de demonstração restaurados.')
          navegar('/')
        }}
      />
    </>
  )
}
