import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ChevronLeft } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import EmailPreview from '@/components/marketing/email-preview'
import CampaignOptionsMenu from '@/components/campaigns/campaign-options-menu'
import CampaignPageActions from '@/components/campaigns/campaign-page-actions'

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const loadBroadcastDetail = createServerFn({ method: 'GET' })
  .inputValidator((d: string) => d)
  .handler(async ({ data: id }) => {
    const supabase = createServiceClient();
    const [
      { data: campaign },
      { data: logs },
      { count: customerCount },
      { data: listsRaw },
    ] = await Promise.all([
      supabase
        .from("marketing_campaigns")
        .select(
          "id,name,subject,content,status,created_at,sent_at,from_name,header_image,footer_image,social_facebook,social_x,social_instagram,social_linkedin,social_medium,unsubscribe_url,copyright_text,company_address",
        )
        .eq("id", id)
        .single(),
      supabase
        .from("marketing_email_logs")
        .select("id,status,opened_at,clicked_at")
        .eq("campaign_id", id),
      supabase
        .from("marketing_customers")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("marketing_email_lists")
        .select("id,name")
        .order("name", { ascending: true }),
    ]);

    // Get customer counts per list
    const lists = listsRaw ?? [];
    const listIds = lists.map((l) => l.id);
    const { data: customerCounts } = await supabase
      .from("marketing_customers")
      .select("list_id")
      .in("list_id", listIds.length > 0 ? listIds : ["__none__"]);

    const countByList = (customerCounts || []).reduce(
      (acc, c) => {
        if (c.list_id) {
          acc[c.list_id] = (acc[c.list_id] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const listsWithCounts = lists.map((l) => ({
      ...l,
      customer_count: countByList[l.id] || 0,
    }));

    return {
      campaign,
      emailLogs: logs ?? [],
      customerCount: customerCount ?? 0,
      listsWithCounts,
    };
  })

export const Route = createFileRoute('/broadcasts/$id/')({
  loader: ({ params }) => loadBroadcastDetail({ data: params.id }),
  component: BroadcastDetailPage,
})

function BroadcastDetailPage() {
  const { campaign, emailLogs, customerCount, listsWithCounts } = Route.useLoaderData()

  if (!campaign) {
    return (
      <div className="p-10">
        <p className="text-sm text-red-600">Broadcast not found.</p>
      </div>
    );
  }

  const delivered = emailLogs.filter(
    (log) => log.status === "delivered" || log.status === "sent",
  ).length;
  const failed = emailLogs.filter((log) => log.status === "failed").length;
  const opened = emailLogs.filter((log) => Boolean(log.opened_at)).length;
  const clicked = emailLogs.filter((log) => Boolean(log.clicked_at)).length;

  return (
    <div className="p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            to="/broadcasts"
            search={{ cp: 1 }}
            className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-700 mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Broadcasts
          </Link>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
                <span className="relative">
                  <span
                    className={`absolute bottom-0 left-0 right-0 h-1/2 ${
                      campaign.status === "sent"
                        ? "bg-emerald-100/70"
                        : "bg-amber-100/70"
                    }`}
                  />
                  <span className="relative">
                    {campaign.name || campaign.subject}
                  </span>
                </span>
              </h1>
              {campaign.status === "sent" ? (
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  Sent
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs font-medium text-neutral-500">
                  Draft
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
              {campaign.name && (
                <>
                  <span>Subject: {campaign.subject}</span>
                  <span>·</span>
                </>
              )}
              <span>Created {formatDateTime(campaign.created_at)}</span>
              {campaign.sent_at && (
                <>
                  <span>·</span>
                  <span>Sent {formatDateTime(campaign.sent_at)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Options Menu */}
        <div className="flex items-center gap-2">
          <CampaignPageActions
            campaignId={campaign.id}
            subject={campaign.subject}
            content={campaign.content}
            fromName={campaign.from_name}
            headerImage={campaign.header_image}
            footerImage={campaign.footer_image}
            socialFacebook={campaign.social_facebook}
            socialX={campaign.social_x}
            socialInstagram={campaign.social_instagram}
            socialLinkedin={campaign.social_linkedin}
            socialMedium={campaign.social_medium}
            unsubscribeUrl={campaign.unsubscribe_url}
            copyrightText={campaign.copyright_text}
            companyAddress={campaign.company_address}
            status={campaign.status}
            customerCount={customerCount}
            lists={listsWithCounts}
          />
          <CampaignOptionsMenu
            campaignId={campaign.id}
            status={campaign.status}
          />
        </div>
      </div>

      {/* Deliverability Stats - First Card */}
      {campaign.status === "sent" && (
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 pb-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Delivery Report
              </h2>
              <p className="text-sm text-neutral-500">
                Detailed performance metrics for this broadcast.
              </p>
            </div>
            <Link
              to="/broadcasts/$id/report"
              params={{ id: campaign.id }}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              View full report →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Delivered",
                value: delivered,
                color: "text-emerald-600",
              },
              { label: "Opened", value: opened, color: "text-blue-600" },
              { label: "Clicked", value: clicked, color: "text-purple-600" },
              { label: "Failed", value: failed, color: "text-red-600" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-neutral-100 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  {item.label}
                </p>
                <p className={`mt-2 text-2xl font-semibold ${item.color}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Content */}
      <div className="space-y-6 rounded-2xl border border-neutral-200/80 bg-white p-6">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            Email Preview
          </h2>
          <p className="text-sm text-neutral-500">
            This is exactly what your subscribers will receive.
          </p>
        </div>

        {/* Shared Email Preview Component */}
        <EmailPreview
          content={campaign.content}
          headerImage={campaign.header_image}
          footerImage={campaign.footer_image}
          maxWidth="60%"
          socialFacebook={campaign.social_facebook}
          socialX={campaign.social_x}
          socialInstagram={campaign.social_instagram}
          socialLinkedin={campaign.social_linkedin}
          socialMedium={campaign.social_medium}
          unsubscribeUrl={campaign.unsubscribe_url}
          copyrightText={campaign.copyright_text}
          companyAddress={campaign.company_address}
        />
      </div>
    </div>
  );
}
