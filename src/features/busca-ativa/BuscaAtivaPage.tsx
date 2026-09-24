import { useSessaoAtiva } from '@/app/sessao'
import { PageHeader } from '@/components/ui/Layout'
import BuscaAtivaLista from './BuscaAtivaLista'

export default function BuscaAtivaPage() {
  const { usuario, microarea } = useSessaoAtiva()
  return (
    <>
      <PageHeader
        titulo="Busca ativa"
        descricao={
          usuario.perfil === 'acs'
            ? `Pessoas da ${microarea?.descricao.toLowerCase() ?? 'sua microárea'} com retorno pendente na UBS.`
            : 'Pessoas que perderam um prazo presencial. A tarefa se resolve sozinha quando a pendência é registrada no caso.'
        }
      />
      <BuscaAtivaLista />
    </>
  )
}
