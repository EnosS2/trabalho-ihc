import { LinkButton } from '@/components/ui/Button'
import { ICONE } from '@/components/icones'
import { PageHeader } from '@/components/ui/Layout'

export default function NaoEncontradaPage() {
  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <PageHeader titulo="Página não encontrada" descricao="O endereço pode ter mudado ou foi digitado errado." />
      <LinkButton to="/" icone={ICONE.painel}>
        Voltar ao painel
      </LinkButton>
    </div>
  )
}
