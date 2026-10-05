import { beforeEach, describe, expect, it } from 'vitest'
import { entrarComCredenciais, listarAcessosDemo, obterSessao, sair } from './api'

describe('login fictício', () => {
  beforeEach(async () => {
    await sair()
  })

  it('cada acesso de demonstração entra com o próprio perfil', async () => {
    const acessos = await listarAcessosDemo()
    expect(new Set(acessos.map((a) => a.perfil))).toEqual(new Set(['executor', 'responsavel_tecnico', 'acs', 'gestor', 'admin']))
    for (const a of acessos) {
      const u = await entrarComCredenciais({ email: a.email, senha: a.senha })
      expect(u.perfil).toBe(a.perfil)
      expect((await obterSessao())?.usuario.id).toBe(a.id)
    }
  })

  it('aceita e-mail com maiúsculas e espaços', async () => {
    const u = await entrarComCredenciais({ email: '  Beatriz.Rocha@demo.poa ', senha: 'rt123' })
    expect(u.perfil).toBe('responsavel_tecnico')
  })

  it('recusa senha errada ou e-mail desconhecido com a mesma mensagem', async () => {
    await expect(entrarComCredenciais({ email: 'ana.ribeiro@demo.poa', senha: 'errada' })).rejects.toThrow('E-mail ou senha incorretos')
    await expect(entrarComCredenciais({ email: 'ninguem@demo.poa', senha: 'executor123' })).rejects.toThrow('E-mail ou senha incorretos')
    expect(await obterSessao()).toBeNull()
  })
})
