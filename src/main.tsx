import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import '@fontsource/atkinson-hyperlegible/400-italic.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { PreferenciasProvider } from './app/preferencias'
import { router } from './app/router'
import { ToastProvider } from './components/ui/Toast'
import { ErroDeAcesso, ErroDeNegocio } from './data/api'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 15_000,
      // Erros de regra/permissão não melhoram com nova tentativa.
      retry: (tentativas, erro) => !(erro instanceof ErroDeNegocio || erro instanceof ErroDeAcesso) && tentativas < 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferenciasProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>
    </PreferenciasProvider>
  </StrictMode>,
)
