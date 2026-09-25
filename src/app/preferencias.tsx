import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface Preferencias {
  /** Claro é o padrão; a troca fica no botão sol/lua da barra lateral. */
  tema: 'claro' | 'escuro'
  altoContraste: boolean
  /** 0 = 100%, 1 = 112,5%, 2 = 125%, 3 = 137,5% */
  fonte: 0 | 1 | 2 | 3
  movimentoReduzido: boolean
}

const PADRAO: Preferencias = { tema: 'claro', altoContraste: false, fonte: 0, movimentoReduzido: false }
const CHAVE = 'testagem-ubs:preferencias'

function ler(): Preferencias {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return PADRAO
    const salvo = { ...PADRAO, ...(JSON.parse(bruto) as Partial<Preferencias>) }
    // Versões anteriores tinham o tema "sistema": passa a valer o padrão (claro).
    return { ...salvo, tema: salvo.tema === 'escuro' ? 'escuro' : 'claro' }
  } catch {
    return PADRAO
  }
}

const Ctx = createContext<{
  prefs: Preferencias
  atualizar: (p: Partial<Preferencias>) => void
  restaurar: () => void
} | null>(null)

/** Preferências de acessibilidade do usuário, aplicadas como atributos no <html>. */
export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferencias>(ler)

  useEffect(() => {
    const html = document.documentElement
    html.dataset.tema = prefs.tema === 'escuro' && !prefs.altoContraste ? 'escuro' : 'claro'
    html.dataset.contraste = prefs.altoContraste ? 'alto' : 'normal'
    html.dataset.fonte = String(prefs.fonte)
    html.dataset.movimento = prefs.movimentoReduzido ? 'reduzido' : 'normal'
    try {
      localStorage.setItem(CHAVE, JSON.stringify(prefs))
    } catch {
      /* preferência vale só nesta sessão */
    }
  }, [prefs])

  const valor = useMemo(
    () => ({
      prefs,
      atualizar: (p: Partial<Preferencias>) => setPrefs((atual) => ({ ...atual, ...p })),
      // Restaura só os ajustes de acessibilidade; o tema claro/escuro é escolha à parte.
      restaurar: () => setPrefs((atual) => ({ ...PADRAO, tema: atual.tema })),
    }),
    [prefs],
  )
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function usePreferencias() {
  const c = useContext(Ctx)
  if (!c) throw new Error('usePreferencias fora do provider')
  return c
}
