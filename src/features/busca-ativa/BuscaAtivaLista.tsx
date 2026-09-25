import { MapPin, MessageSquare, Phone } from 'lucide-react'
import { useState } from 'react'
import { usePode, useSessaoAtiva } from '@/app/sessao'
import { ICONE } from '@/components/icones'
import { AgravoBadge, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Feedback'
import { Field, RadioCards, Segmented, Select, Textarea } from '@/components/ui/Form'
import { Meta } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import type { TarefaResumo } from '@/data/api'
import { useBuscaAtiva, useReferencias, useRegistrarTentativa } from '@/data/hooks'
import { RESULTADO_TENTATIVA_ROTULO } from '@/domain/rotulos'
import type { ResultadoTentativa, TentativaContato } from '@/domain/types'
import { formatarTelefone } from '@/domain/rules/documentos'
import { formatarData } from '@/lib/datas'
import { plural } from '@/lib/texto'

const MEIOS: { valor: TentativaContato['meio']; rotulo: string; icone: typeof Phone }[] = [
  { valor: 'visita', rotulo: 'Visita domiciliar', icone: MapPin },
  { valor: 'telefone', rotulo: 'Telefone', icone: Phone },
  { valor: 'mensagem', rotulo: 'Mensagem', icone: MessageSquare },
]

function DialogoTentativa({ tarefa, aoFechar }: { tarefa: TarefaResumo | null; aoFechar: () => void }) {
  const [meio, setMeio] = useState<TentativaContato['meio']>('visita')
  const [resultado, setResultado] = useState<ResultadoTentativa | ''>('')
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState<string>()
  const registrar = useRegistrarTentativa()
  const toast = useToast()

  const salvar = async () => {
    if (!resultado) {
      setErro('Selecione o resultado do contato.')
      return
    }
    try {
      await registrar.mutateAsync({ tarefaId: tarefa!.tarefa.id, dados: { meio, resultado, observacao: obs || undefined } })
      toast.sucesso('Tentativa registrada.')
      setResultado('')
      setObs('')
      aoFechar()
    } catch (e) {
      toast.erro(e)
    }
  }

  return (
    <Dialog
      aberto={Boolean(tarefa)}
      aoFechar={aoFechar}
      titulo="Registrar tentativa de contato"
      descricao={tarefa?.pessoa.nome}
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button onClick={salvar} carregando={registrar.isPending}>
            Salvar tentativa
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <RadioCards
          legenda="Como foi o contato?"
          nome="meio"
          valor={meio}
          onChange={setMeio}
          opcoes={MEIOS.map((m) => ({ valor: m.valor, rotulo: m.rotulo, icone: <m.icone className="size-4" aria-hidden /> }))}
        />
        <Field label="Resultado" obrigatorio erro={erro}>
          <Select
            value={resultado}
            onChange={(e) => {
              setResultado(e.target.value as ResultadoTentativa)
              setErro(undefined)
            }}
          >
            <option value="">Selecione…</option>
            {Object.entries(RESULTADO_TENTATIVA_ROTULO).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Observação" dica="Ex.: melhor horário, novo endereço, pessoa de referência.">
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} maxLength={400} />
        </Field>
      </div>
    </Dialog>
  )
}

export default function BuscaAtivaLista() {
  const { usuario } = useSessaoAtiva()
  const podeRegistrar = usePode('busca.registrar')
  const [status, setStatus] = useState<'aberta' | 'concluida'>('aberta')
  const [microareaId, setMicroareaId] = useState('')
  const { data, isLoading, error, refetch } = useBuscaAtiva({ status, microareaId: microareaId || undefined })
  const refs = useReferencias()
  const [selecionada, setSelecionada] = useState<TarefaResumo | null>(null)
  const microareas = refs.data?.microareas.filter((m) => m.ubsId === usuario.ubsId) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Segmented
          rotulo="Situação"
          valor={status}
          onChange={setStatus}
          opcoes={[
            { valor: 'aberta', rotulo: 'A localizar' },
            { valor: 'concluida', rotulo: 'Resolvidas' },
          ]}
        />
        {usuario.perfil !== 'acs' && (
          <Field label="Microárea" className="w-56">
            <Select value={microareaId} onChange={(e) => setMicroareaId(e.target.value)}>
              <option value="">Todas</option>
              {microareas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.descricao}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {isLoading && <Carregando />}
      {error && <EstadoErro erro={error} tentarNovamente={refetch} />}
      {data && data.length === 0 && (
        <EstadoVazio
          icone={ICONE.ok}
          titulo={status === 'aberta' ? 'Ninguém para localizar agora' : 'Nenhuma busca resolvida ainda'}
          descricao="As buscas são criadas automaticamente quando alguém perde um prazo presencial (coleta, dose, VDRL ou início de tratamento)."
        />
      )}
      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {data?.map((t) => {
          const ultima = t.tarefa.tentativas.at(-1)
          return (
            <li key={t.tarefa.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{t.pessoa.nome}</p>
                  <Meta
                    itens={[
                      `${t.pessoa.idade} anos`,
                      t.microarea?.descricao ?? 'Sem microárea',
                      usuario.perfil !== 'acs' && t.acsNome ? `ACS ${t.acsNome}` : null,
                    ]}
                  />
                </div>
                {t.tarefa.status === 'aberta' ? (
                  <Badge tom={t.diasEmAberto > 7 ? 'perigo' : 'atencao'} icone={ICONE.aguardando}>
                    {plural(t.diasEmAberto, 'dia')}
                  </Badge>
                ) : (
                  <Badge tom="sucesso" icone={ICONE.ok}>
                    Resolvida
                  </Badge>
                )}
              </div>
              <p className="flex items-start gap-2 text-sm">
                {t.agravo && <AgravoBadge agravo={t.agravo} />}
                <span>{t.motivoExibido}</span>
              </p>
              <address className="flex flex-col gap-1 text-sm not-italic">
                <span className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0 text-muted" aria-hidden />
                  {t.pessoa.endereco.logradouro}, {t.pessoa.endereco.numero} — {t.pessoa.endereco.bairro}
                </span>
                <span className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0 text-muted" aria-hidden />
                  {t.pessoa.telefone ? (
                    <a href={`tel:${t.pessoa.telefone}`} className="font-bold text-primary underline-offset-2 hover:underline">
                      {formatarTelefone(t.pessoa.telefone)}
                    </a>
                  ) : (
                    <span className="text-muted">Sem telefone cadastrado</span>
                  )}
                </span>
              </address>
              <p className="text-sm text-muted">
                {t.tarefa.tentativas.length === 0
                  ? 'Nenhuma tentativa registrada.'
                  : `${plural(t.tarefa.tentativas.length, 'tentativa')}. Última em ${formatarData(ultima!.data)}: ${RESULTADO_TENTATIVA_ROTULO[ultima!.resultado].toLowerCase()}.`}
              </p>
              {podeRegistrar && t.tarefa.status === 'aberta' && (
                <Button variante="sutil" icone={ICONE.buscaAtiva} onClick={() => setSelecionada(t)} className="mt-auto">
                  Registrar tentativa
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      <DialogoTentativa tarefa={selecionada} aoFechar={() => setSelecionada(null)} />
    </div>
  )
}
