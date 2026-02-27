import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { createServiceClient } from '@/lib/supabase/service'

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

const loadAutomations = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('automation_campaigns')
    .select('id,name,status,created_at,updated_at,nodes')
    .order('created_at', { ascending: false })

  if (error) {
    // Table might not exist yet
    return { automations: [] }
  }

  return { automations: data ?? [] }
})

export const Route = createFileRoute('/campaigns/')({
  loader: () => loadAutomations(),
  component: CampaignsPage,
})

function CampaignsPage() {
  const { automations } = Route.useLoaderData()

  return (
    <div className="p-10 space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
            Campaigns
          </h1>
        </div>
        <Link
          to="/campaigns/new"
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New campaign
        </Link>
      </header>

      {/* Automations List */}
      {automations.length === 0 ? (
        <div className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-50">
            <svg
              className="h-6 w-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-neutral-900">
            No automation campaigns yet
          </h2>
          <p className="mt-1 text-sm text-neutral-500 max-w-sm mx-auto">
            Create your first automated workflow to engage customers with
            triggered emails, delays, and conditions.
          </p>
          <Link
            to="/campaigns/new"
            className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Create your first campaign
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200/80 bg-white divide-y divide-neutral-100">
          {automations.map((automation) => {
            const nodeCount = Array.isArray(automation.nodes)
              ? automation.nodes.length
              : 0

            return (
              <Link
                key={automation.id}
                to="/campaigns/$id"
                params={{ id: automation.id }}
                className="flex items-center justify-between px-6 py-5 transition hover:bg-neutral-50"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-neutral-900">
                    {automation.name}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {nodeCount} step{nodeCount !== 1 ? 's' : ''} · Created{' '}
                    {formatDate(automation.created_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    automation.status === 'active'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : automation.status === 'paused'
                        ? 'border border-amber-200 bg-amber-50 text-amber-700'
                        : 'border border-neutral-200 bg-white text-neutral-500'
                  }`}
                >
                  {automation.status === 'active'
                    ? 'Active'
                    : automation.status === 'paused'
                      ? 'Paused'
                      : 'Draft'}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
