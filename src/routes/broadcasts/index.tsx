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

const loadBroadcasts = createServerFn({ method: 'GET' })
  .inputValidator((d: { cp: number }) => d)
  .handler(async ({ data }) => {
    const supabase = createServiceClient()
    const page = data.cp
    const perPage = 5
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const [
      { count: customerCount },
      { count: campaignCount },
      { data: recentCustomers },
      { data: recentCampaigns, count: campaignTotal },
      { data: emailLogs },
    ] = await Promise.all([
      supabase
        .from('marketing_customers')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('marketing_campaigns')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('marketing_customers')
        .select('id,name,email,created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('marketing_campaigns')
        .select('id,name,subject,status,created_at,sent_at', {
          count: 'exact',
        })
        .order('created_at', { ascending: false })
        .range(from, to),
      supabase
        .from('marketing_email_logs')
        .select(
          'id,status,sent_at,delivered_at,bounced_at,opened_at,clicked_at',
        )
        .order('sent_at', { ascending: false })
        .limit(50),
    ])

    return {
      customerCount: customerCount ?? 0,
      campaignCount: campaignCount ?? 0,
      recentCustomers: recentCustomers ?? [],
      recentCampaigns: recentCampaigns ?? [],
      campaignTotal: campaignTotal ?? 0,
      emailLogs: emailLogs ?? [],
      page,
      perPage,
    }
  })

export const Route = createFileRoute('/broadcasts/')({
  validateSearch: (search: Record<string, unknown>) => ({
    cp: Number(search.cp) || 1,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadBroadcasts({ data: { cp: deps.cp } }),
  component: BroadcastsPage,
})

function BroadcastsPage() {
  const {
    customerCount,
    campaignCount,
    recentCustomers,
    recentCampaigns,
    campaignTotal,
    emailLogs,
    page,
    perPage,
  } = Route.useLoaderData()

  const totalPages = Math.ceil(campaignTotal / perPage)

  const delivered = emailLogs.filter((l) => Boolean(l.delivered_at)).length
  const opened = emailLogs.filter((l) => Boolean(l.opened_at)).length
  const clicked = emailLogs.filter((l) => Boolean(l.clicked_at)).length
  const bounced = emailLogs.filter((l) => Boolean(l.bounced_at)).length

  const totalSends = emailLogs.length || 1

  return (
    <div className="p-10 space-y-10">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
            Broadcasts
          </h1>
          <p className="text-sm text-neutral-500 max-w-xl">
            Send one-off email campaigns to your customer lists. Build targeted
            sends, craft beautiful emails, and track deliverability.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/customers"
            search={{ list: undefined, page: 1, limit: 20 }}
            className="rounded-lg border border-neutral-200/80 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:border-neutral-300"
          >
            Manage customer lists
          </Link>
          <Link
            to="/broadcasts/new"
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            New broadcast
          </Link>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Customers',
            value: customerCount.toLocaleString(),
            helper: 'Active subscribers',
          },
          {
            label: 'Broadcasts',
            value: campaignCount.toLocaleString(),
            helper: 'Drafts and sent',
          },
          {
            label: 'Deliveries',
            value: delivered.toLocaleString(),
            helper: 'All time',
          },
          {
            label: 'Opens',
            value: opened.toLocaleString(),
            helper: 'Tracked',
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

      {/* Latest Broadcasts */}
      <section className="rounded-xl border border-neutral-200/80 bg-white">
        <div className="border-b border-neutral-200/80 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Latest broadcasts
            </h2>
            <p className="text-xs text-neutral-500">
              Drafts and recently delivered sends.
            </p>
          </div>
          <Link
            to="/broadcasts/new"
            className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
          >
            Create broadcast
          </Link>
        </div>

        <div className="divide-y divide-neutral-100">
          {recentCampaigns.length === 0 ? (
            <p className="px-6 py-6 text-sm text-neutral-500">
              No broadcasts yet. Draft your first announcement to keep customers
              in the loop.
            </p>
          ) : (
            recentCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                to="/broadcasts/$id"
                params={{ id: campaign.id }}
                className="flex items-center gap-3 px-6 py-5 transition hover:bg-neutral-50"
              >
                <h3 className="text-lg font-semibold text-neutral-900 truncate">
                  <span className="relative">
                    <span
                      className={`absolute bottom-0 left-0 right-0 h-1/2 ${
                        campaign.status === 'sent'
                          ? 'bg-emerald-100/70'
                          : 'bg-amber-100/70'
                      }`}
                    />
                    <span className="relative">
                      {campaign.name || campaign.subject}
                    </span>
                  </span>
                </h3>
                {campaign.status === 'sent' ? (
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    Sent
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs font-medium text-neutral-500">
                    Draft
                  </span>
                )}
              </Link>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200/80 px-6 py-3">
            <p className="text-xs text-neutral-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  to="/broadcasts"
                  search={{ cp: page - 1 }}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Previous
                </Link>
              ) : (
                <span className="rounded-lg border border-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-300 cursor-not-allowed">
                  Previous
                </span>
              )}
              {page < totalPages ? (
                <Link
                  to="/broadcasts"
                  search={{ cp: page + 1 }}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Next
                </Link>
              ) : (
                <span className="rounded-lg border border-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-300 cursor-not-allowed">
                  Next
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Two Column: Recent Customers + Deliverability */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-neutral-200/80 bg-white">
          <div className="border-b border-neutral-200/80 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Recent customers
              </h2>
              <p className="text-xs text-neutral-500">
                Latest contacts added to the list.
              </p>
            </div>
            <Link
              to="/customers"
              search={{ list: undefined, page: 1, limit: 20 }}
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
            >
              View all
            </Link>
          </div>
          <div className="px-6 py-4 text-sm">
            {recentCustomers.length === 0 ? (
              <p className="text-neutral-500">
                No customers yet. Start by adding your first contact.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {recentCustomers.map((customer) => (
                  <li
                    key={customer.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">
                        {customer.name || customer.email}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {customer.email}
                      </p>
                    </div>
                    <p className="text-xs text-neutral-400">
                      {formatDate(customer.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white">
          <div className="border-b border-neutral-200/80 px-6 py-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Deliverability snapshot
            </h2>
            <p className="text-xs text-neutral-500">
              Track sending health using recent email logs.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 px-6 py-6">
            {[
              {
                label: 'Deliverability',
                value: `${Math.round((delivered / totalSends) * 100)}%`,
              },
              {
                label: 'Open rate',
                value: `${Math.round((opened / totalSends) * 100)}%`,
              },
              {
                label: 'Click rate',
                value: `${Math.round((clicked / totalSends) * 100)}%`,
              },
              {
                label: 'Bounce rate',
                value: `${Math.round((bounced / totalSends) * 100)}%`,
              },
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
        </div>
      </section>
    </div>
  )
}
