import { useId, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Table2, ChartColumn } from 'lucide-react'

export interface PontoBarra {
  rotulo: string
  valor: number | null
  /** Texto do tooltip/tabela (ex.: "12 de 40"). */
  detalhe?: string
}

/**
 * Barras de UMA série (uma cor: slot primário). Marcas finas com ponta arredondada de 4px,
 * grade em linha fina sólida, tooltip ao passar o mouse e alternância para tabela
 * (acessível a leitores de tela e para quem prefere números).
 */
export function GraficoBarras({
  titulo,
  dados,
  formatar = (v) => String(v),
  horizontal,
  referencia,
  altura,
  cor = 'var(--primary)',
  dominioMax,
}: {
  titulo: string
  dados: PontoBarra[]
  formatar?: (v: number) => string
  horizontal?: boolean
  referencia?: { valor: number; rotulo: string }
  altura?: number
  cor?: string
  dominioMax?: number
}) {
  const [tabela, setTabela] = useState(false)
  const idTitulo = useId()
  const h = altura ?? (horizontal ? Math.max(160, dados.length * 36 + 40) : 240)
  const eixo = { fill: 'var(--muted)', fontSize: 12 }

  return (
    <figure aria-labelledby={idTitulo} className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <figcaption id={idTitulo} className="min-w-0 pt-1.5 font-bold">
          {titulo}
        </figcaption>
        <button
          type="button"
          onClick={() => setTabela((t) => !t)}
          aria-pressed={tabela}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-bold whitespace-nowrap text-primary hover:bg-primary-soft"
        >
          {tabela ? <ChartColumn className="size-4" aria-hidden /> : <Table2 className="size-4" aria-hidden />}
          {tabela ? 'Ver gráfico' : 'Ver tabela'}
        </button>
      </div>

      {tabela ? (
        <table className="w-full text-sm">
          <caption className="sr-only">{titulo}</caption>
          <tbody>
            {dados.map((d) => (
              <tr key={d.rotulo} className="border-b border-border last:border-0">
                <th scope="row" className="py-2 text-left font-normal text-muted">
                  {d.rotulo}
                </th>
                <td className="py-2 text-right font-bold tabular">
                  {d.valor === null ? 'sem dados' : formatar(d.valor)}
                  {d.detalhe && <span className="ml-2 font-normal text-muted">({d.detalhe})</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div aria-hidden style={{ height: h }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dados}
              layout={horizontal ? 'vertical' : 'horizontal'}
              margin={{ top: referencia && horizontal ? 22 : 8, right: horizontal ? 24 : 8, bottom: 0, left: horizontal ? 8 : -12 }}
              barCategoryGap={horizontal ? 8 : '28%'}
            >
              <CartesianGrid stroke="var(--border)" strokeWidth={1} horizontal={!horizontal} vertical={Boolean(horizontal)} />
              {horizontal ? (
                <>
                  <XAxis type="number" tick={eixo} axisLine={false} tickLine={false} tickFormatter={formatar} domain={[0, dominioMax ?? 'auto']} />
                  <YAxis type="category" dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} width={150} />
                </>
              ) : (
                <>
                  <XAxis dataKey="rotulo" tick={eixo} axisLine={{ stroke: 'var(--border)' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={eixo} axisLine={false} tickLine={false} tickFormatter={formatar} allowDecimals={false} domain={[0, dominioMax ?? 'auto']} />
                </>
              )}
              <Tooltip
                cursor={{ fill: 'var(--surface-3)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0].payload as PontoBarra
                  return (
                    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
                      <p className="font-bold">{p.rotulo}</p>
                      <p className="text-muted">
                        <span className="font-bold text-fg">{p.valor === null ? 'sem dados' : formatar(p.valor)}</span>
                        {p.detalhe ? `, ${p.detalhe}` : ''}
                      </p>
                    </div>
                  )
                }}
              />
              {referencia && (
                <ReferenceLine
                  {...(horizontal ? { x: referencia.valor } : { y: referencia.valor })}
                  stroke="var(--fg)"
                  strokeWidth={1.5}
                  label={{
                    value: referencia.rotulo,
                    position: horizontal ? 'top' : 'insideTopRight',
                    fill: 'var(--fg)',
                    fontSize: 12,
                  }}
                />
              )}
              <Bar
                dataKey="valor"
                fill={cor}
                radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                maxBarSize={horizontal ? 22 : 36}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Resumo textual para leitores de tela quando o gráfico está visível */}
      {!tabela && (
        <p className="sr-only">
          {dados.map((d) => `${d.rotulo}: ${d.valor === null ? 'sem dados' : formatar(d.valor)}`).join('; ')}
        </p>
      )}
    </figure>
  )
}
