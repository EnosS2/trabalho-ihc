const soDigitos = (v: string) => v.replace(/\D/g, '')

/** Valida Cartão Nacional de Saúde (definitivo 1/2 ou provisório 7/8/9). */
export function validarCns(valor: string): boolean {
  const cns = soDigitos(valor)
  if (cns.length !== 15) return false
  const primeiro = cns[0]
  if (primeiro === '1' || primeiro === '2') {
    const pis = cns.slice(0, 11)
    let soma = 0
    for (let i = 0; i < 11; i++) soma += Number(pis[i]) * (15 - i)
    let dv = 11 - (soma % 11)
    if (dv === 11) dv = 0
    if (dv === 10) {
      soma += 2
      dv = 11 - (soma % 11)
      return cns === `${pis}001${dv}`
    }
    return cns === `${pis}000${dv}`
  }
  if ('789'.includes(primeiro)) {
    let soma = 0
    for (let i = 0; i < 15; i++) soma += Number(cns[i]) * (15 - i)
    return soma % 11 === 0
  }
  return false
}

/** Gera um CNS provisório válido (usado no seed de demonstração). */
export function gerarCnsProvisorio(aleatorio: () => number): string {
  for (;;) {
    let base = String(7 + Math.floor(aleatorio() * 3))
    for (let i = 1; i < 14; i++) base += Math.floor(aleatorio() * 10)
    let soma = 0
    for (let i = 0; i < 14; i++) soma += Number(base[i]) * (15 - i)
    const dv = (11 - (soma % 11)) % 11
    if (dv < 10) return base + dv
  }
}

export function validarCpf(valor: string): boolean {
  const cpf = soDigitos(valor)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const dv = (fatia: number) => {
    let soma = 0
    for (let i = 0; i < fatia; i++) soma += Number(cpf[i]) * (fatia + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return dv(9) === Number(cpf[9]) && dv(10) === Number(cpf[10])
}

export function gerarCpf(aleatorio: () => number): string {
  const n = Array.from({ length: 9 }, () => Math.floor(aleatorio() * 10))
  const dv = (arr: number[]) => {
    const soma = arr.reduce((acc, d, i) => acc + d * (arr.length + 1 - i), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  n.push(dv(n))
  n.push(dv(n))
  return n.join('')
}

export function formatarCns(cns?: string): string {
  if (!cns) return '—'
  const d = soDigitos(cns)
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 11)} ${d.slice(11)}`
}

export function formatarCpf(cpf?: string): string {
  if (!cpf) return '—'
  const d = soDigitos(cpf)
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** LGPD: em listas, exibir apenas os últimos dígitos. */
export function mascararDocumento(valor?: string): string {
  if (!valor) return '—'
  const d = soDigitos(valor)
  return `•••• ${d.slice(-4)}`
}

export function formatarTelefone(tel?: string): string {
  if (!tel) return '—'
  const d = soDigitos(tel)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return tel
}
