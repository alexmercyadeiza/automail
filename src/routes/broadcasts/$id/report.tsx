import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ChevronLeft } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const loadBroadcastReport = createServerFn({ method: 'GET' })
  .inputValidator((d: string) => d)
  .handler(async ({ data: id }) => {
    const supabase = createServiceClient()
    const [{ data: campaign }, { data: logs }] = await Promise.all([
      supabase
        .from("marketing_campaigns")
        .select("id,subject")
        .eq("id", id)
        .single(),
      supabase
        .from("marketing_email_logs")
        .select(
          "id,customer_email,status,sent_at,delivered_at,bounced_at,opened_at,clicked_at,error_message,message_id",
        )
        .eq("campaign_id", id)
        .order("sent_at", { ascending: false }),
    ])

    return {
      campaign,
      entries: logs ?? [],
    }
  })

export const Route = createFileRoute('/broadcasts/$id/report')({
  loader: ({ params }) => loadBroadcastReport({ data: params.id }),
  component: BroadcastReportPage,
})

function BroadcastReportPage() {
  const { campaign, entries } = Route.useLoaderData()
  const params = Route.useParams()

  return (
    <div className="p-10 space-y-8">
      <div>
        <Link
          to="/broadcasts/$id"
          params={{ id: params.id }}
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-700 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Broadcast
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
            Deliverability report
          </h1>
          <p className="text-sm text-neutral-500">
            {campaign ? `${campaign.subject}` : "Broadcast"} · {entries.length}{" "}
            deliveries tracked
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200/80 bg-white">
        <div className="border-b border-neutral-200/80 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Email activity
          </h2>
          <p className="text-xs text-neutral-500">
            Data mirrors marketing_email_logs table.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200/80 text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Sent</th>
                <th className="px-6 py-3 font-medium">Delivered</th>
                <th className="px-6 py-3 font-medium">Opened</th>
                <th className="px-6 py-3 font-medium">Clicked</th>
                <th className="px-6 py-3 font-medium">Bounced</th>
                <th className="px-6 py-3 font-medium">Message ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-neutral-500"
                  >
                    No email logs yet. Send the broadcast to populate
                    deliverability stats.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      {entry.customer_email}
                    </td>
                    <td className="px-6 py-4 capitalize text-neutral-600">
                      {entry.status}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {formatTimestamp(entry.sent_at)}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {formatTimestamp(entry.delivered_at)}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {formatTimestamp(entry.opened_at)}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {formatTimestamp(entry.clicked_at)}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {formatTimestamp(entry.bounced_at)}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {entry.message_id
                        ? entry.message_id
                        : (entry.error_message ?? "—")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
