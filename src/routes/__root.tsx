import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Toaster } from 'sonner'

import Sidebar from '../components/sidebar'
import appCss from '../styles.css?url'

const checkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { getCookie } = await import('@tanstack/react-start/server')
  const session = getCookie('auth_session')
  return { authenticated: session === '1' }
})

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Campaigns' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  beforeLoad: async ({ location }) => {
    if (location.pathname !== '/login') {
      const result = await checkAuth()
      if (!result.authenticated) {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-neutral-50 min-h-screen">
        {children}
        <Toaster richColors position="bottom-right" />
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'

  if (isLoginPage) {
    return <Outlet />
  }

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
