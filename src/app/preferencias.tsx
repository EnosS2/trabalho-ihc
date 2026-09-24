import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface Preferencias {
  tema: 'sistema' | 'claro' | 'escuro'
  altoContraste: boolean
  /** 0 = 100%, 1 = 112,5%, 2 = 125%, 3 = 137,5% */
  fonte: 0 | 1 | 2 | 3
  movimentoReduzido: boolean
}

const PADRAO: Preferencias = { tema: 'sistema', altoContraste: false, fonte: 0, movimentoReduzido: false }
const CHAVE = 'testagem-ubs:preferencias'

function ler(): Preferencias {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? { ...PADRAO, ...(JSON.parse(bruto) as Partial<Preferencias>) } : PADRAO
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
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const aplicarTema = () => {
      const escuro = prefs.tema === 'escuro' || (prefs.tema === 'sistema' && media.matches)
      html.dataset.tema = escuro && !prefs.altoContraste ? 'escuro' : 'claro'
    }
    aplicarTema()
    html.dataset.contraste = prefs.altoContraste ? 'alto' : 'normal'
    html.dataset.fonte = String(prefs.fonte)
    html.dataset.movimento = prefs.movimentoReduzido ? 'reduzido' : 'normal'
    try {
      localStorage.setItem(CHAVE, JSON.stringify(prefs))
    } catch {
      /* preferência vale só nesta sessão */
    }
    media.addEventListener('change', aplicarTema)
    return () => media.removeEventListener('change', aplicarTema)
  }, [prefs])

  const valor = useMemo(
    () => ({
      prefs,
      atualizar: (p: Partial<Preferencias>) => setPrefs((atual) => ({ ...atual, ...p })),
      restaurar: () => setPrefs(PADRAO),
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
