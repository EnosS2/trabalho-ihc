/// <reference types="vitest/config" />
import { execSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Versão exibida no rodapé, para quem testa saber se está vendo a atualização mais recente:
 * data e hash do último commit (no GitHub Pages, é o commit que foi publicado). Sem git, usa a hora do build.
 */
function versaoDoSite() {
  try {
    const [data, hash] = execSync('git log -1 --format="%cI|%h"', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split('|')
    return { data, hash }
  } catch {
    return { data: new Date().toISOString(), hash: '' }
  }
}

export default defineConfig(({ command }) => ({
  define: { __VERSAO__: JSON.stringify(versaoDoSite()) },
  // Build publicado no GitHub Pages em https://enoss2.github.io/trabalho-ihc/
  base: command === 'build' ? '/trabalho-ihc/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}))
