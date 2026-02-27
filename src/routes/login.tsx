import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'

const loginAction = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const bcrypt = await import('bcryptjs')

    // Try database-backed login first
    try {
      const supabase = createServiceClient()

      const { data: admin } = await supabase
        .from('admins')
        .select('id, email, password, name')
        .eq('email', data.email.trim().toLowerCase())
        .maybeSingle()

      if (admin) {
        const valid = await bcrypt.compare(data.password, admin.password)
        if (valid) {
          return { ok: true }
        }
        return { ok: false, message: 'Invalid credentials' }
      }
    } catch {
      // Supabase not available or admins table doesn't exist yet —
      // fall through to env-var auth
    }

    // Fallback: env-var credentials (bootstrap / no database)
    const validUsername = process.env.AUTH_USERNAME || 'admin'
    const validPassword = process.env.AUTH_PASSWORD || 'admin'

    if (data.email === validUsername && data.password === validPassword) {
      return { ok: true }
    }

    return { ok: false, message: 'Invalid credentials' }
  })

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await loginAction({ data: { email, password } })

      if (result.ok) {
        document.cookie = 'auth_session=1; path=/; max-age=604800'
        navigate({ to: '/', search: { cp: 1 } })
      } else {
        setError(result.message || 'Invalid credentials')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
              Campaigns
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
