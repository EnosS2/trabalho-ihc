/**
 * Semiótica: mapa único de ícones. Cada conceito tem UM signo em todo o sistema
 * (similaridade/consistência) e o ícone nunca aparece sem rótulo textual.
 * Biblioteca: Lucide (traço uniforme de 2px, cantos arredondados).
 */
import {
  Activity,
  BarChart3,
  Baby,
  CalendarClock,
  CircleCheck,
  CircleX,
  ClipboardList,
  Clock,
  FlaskConical,
  Footprints,
  House,
  Info,
  LifeBuoy,
  Package,
  Route,
  Send,
  Settings,
  ShieldCheck,
  Syringe,
  TestTubes,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react'

export const ICONE = {
  painel: House,
  novaTestagem: FlaskConical,
  testagens: ClipboardList,
  pessoas: Users,
  seguimento: Route,
  buscaAtiva: Footprints,
  estoque: Package,
  notificacoes: Send,
  indicadores: BarChart3,
  auditoria: ShieldCheck,
  configuracoes: Settings,
  ajuda: LifeBuoy,
  gestante: Baby,
  tratamento: Syringe,
  confirmatorio: TestTubes,
  prazo: CalendarClock,
  atividade: Activity,
  // status
  ok: CircleCheck,
  atencao: TriangleAlert,
  aguardando: Clock,
  erro: CircleX,
  info: Info,
} satisfies Record<string, LucideIcon>

export type NomeIcone = keyof typeof ICONE

export const SIGNIFICADO_ICONE: Record<NomeIcone, string> = {
  painel: 'Início / painel do dia',
  novaTestagem: 'Frasco de laboratório: registrar uma nova testagem rápida',
  testagens: 'Prancheta: histórico de testagens realizadas',
  pessoas: 'Pessoas: cadastro de usuários do SUS atendidos',
  seguimento: 'Rota: caminho do caso até o desfecho (confirmação, tratamento, cura)',
  buscaAtiva: 'Pegadas: ir até a pessoa no território',
  estoque: 'Pacote: kits e lotes de testes rápidos',
  notificacoes: 'Envio: notificação compulsória à vigilância',
  indicadores: 'Gráfico de barras: indicadores e comparação',
  auditoria: 'Escudo: segurança e rastreabilidade (LGPD)',
  configuracoes: 'Engrenagem: parâmetros e usuários',
  ajuda: 'Boia: central de ajuda',
  gestante: 'Bebê: gestante / transmissão vertical',
  tratamento: 'Seringa: dose ou tratamento',
  confirmatorio: 'Tubos de ensaio: exame confirmatório laboratorial',
  prazo: 'Calendário com relógio: prazo',
  atividade: 'Atividade recente',
  ok: 'Concluído / dentro do prazo',
  atencao: 'Atenção / prazo próximo',
  aguardando: 'Aguardando',
  erro: 'Vencido / erro',
  info: 'Informação',
}
