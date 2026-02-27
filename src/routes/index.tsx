import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { createServiceClient } from '@/lib/supabase/service'

const loadDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = createServiceClient()

  const [
    { count: customerCount },
    { count: broadcastCount },
    { count: automationCount },
    { data: emailLogs },
  ] = await Promise.all([
    supabase
      .from('marketing_customers')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('marketing_campaigns')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('automation_campaigns')
      .select('*', { count: 'exact', head: true })
      .then((res) => {
        // Table may not exist yet — treat missing table as zero
        if (res.error) return { count: 0 }
        return res
      }),
    supabase
      .from('marketing_email_logs')
      .select('id,delivered_at,opened_at,clicked_at,bounced_at')
      .order('sent_at', { ascending: false })
      .limit(50),
  ])

  const logs = emailLogs ?? []
  const delivered = logs.filter((l) => Boolean(l.delivered_at)).length
  const opened = logs.filter((l) => Boolean(l.opened_at)).length
  const clicked = logs.filter((l) => Boolean(l.clicked_at)).length
  const bounced = logs.filter((l) => Boolean(l.bounced_at)).length
  const totalSends = logs.length || 1

  return {
    customerCount: customerCount ?? 0,
    broadcastCount: broadcastCount ?? 0,
    automationCount: automationCount ?? 0,
    deliveries: delivered,
    stats: {
      deliverability: Math.round((delivered / totalSends) * 100),
      openRate: Math.round((opened / totalSends) * 100),
      clickRate: Math.round((clicked / totalSends) * 100),
      bounceRate: Math.round((bounced / totalSends) * 100),
    },
  }
})

export const Route = createFileRoute('/')({
  loader: () => loadDashboard(),
  component: DashboardPage,
})

function DashboardPage() {
  const {
    customerCount,
    broadcastCount,
    automationCount,
    deliveries,
    stats,
  } = Route.useLoaderData()

  return (
    <div className="p-10 space-y-10">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
          Marketing Dashboard
        </h1>
        <p className="text-sm text-neutral-500 max-w-xl">
          Overview of your email marketing across broadcasts, automations, and
          customer engagement.
        </p>
      </header>

      {/* Stat Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Customers',
            value: customerCount.toLocaleString(),
            helper: 'Active subscribers',
          },
          {
            label: 'Broadcasts',
            value: broadcastCount.toLocaleString(),
            helper: 'One-off sends',
          },
          {
            label: 'Automations',
            value: automationCount.toLocaleString(),
            helper: 'Drip campaigns',
          },
          {
            label: 'Deliveries',
            value: deliveries.toLocaleString(),
            helper: 'All time',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-neutral-200/80 bg-white px-5 py-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-neutral-900">
              {item.value}
            </p>
            <p className="text-xs text-neutral-500 mt-1">{item.helper}</p>
          </div>
        ))}
      </section>

      {/* Quick Actions */}
      <section className="grid gap-6 md:grid-cols-2">
        <Link
          to="/broadcasts"
          className="group rounded-xl border border-neutral-200/80 bg-white p-6 transition hover:border-neutral-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-neutral-900 group-hover:text-neutral-700">
              Broadcasts
            </h2>
          </div>
          <p className="text-sm text-neutral-500">
            Send one-off email campaigns to your customer lists. Create, preview,
            and track delivery performance.
          </p>
          <p className="mt-3 text-sm font-medium text-neutral-600 group-hover:text-neutral-900">
            Go to broadcasts →
          </p>
        </Link>

        <Link
          to="/campaigns"
          className="group rounded-xl border border-neutral-200/80 bg-white p-6 transition hover:border-neutral-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <svg
                className="h-5 w-5 text-purple-600"
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
            <h2 className="text-base font-semibold text-neutral-900 group-hover:text-neutral-700">
              Campaigns
            </h2>
          </div>
          <p className="text-sm text-neutral-500">
            Build automated drip campaigns with triggers, delays, conditions, and
            multi-step email workflows.
          </p>
          <p className="mt-3 text-sm font-medium text-neutral-600 group-hover:text-neutral-900">
            Go to campaigns →
          </p>
        </Link>
      </section>

      {/* Deliverability Summary */}
      <section className="rounded-xl border border-neutral-200/80 bg-white">
        <div className="border-b border-neutral-200/80 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Deliverability snapshot
          </h2>
          <p className="text-xs text-neutral-500">
            Aggregate sending health from recent email logs.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 px-6 py-6 lg:grid-cols-4">
          {[
            { label: 'Deliverability', value: `${stats.deliverability}%` },
            { label: 'Open rate', value: `${stats.openRate}%` },
            { label: 'Click rate', value: `${stats.clickRate}%` },
            { label: 'Bounce rate', value: `${stats.bounceRate}%` },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-neutral-100 px-4 py-3"
            >
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                {metric.label}
              </p>
              <p className="mt-2 text-xl font-semibold text-neutral-900">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
