import { Navigate, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { createServiceClient } from '@/lib/supabase/service'
import CreateCampaignForm from '@/components/campaigns/create-campaign-form'

const loadBroadcastForEdit = createServerFn({ method: 'GET' })
  .inputValidator((d: string) => d)
  .handler(async ({ data: id }) => {
    const supabase = createServiceClient()
    const { data: campaign } = await supabase
      .from("marketing_campaigns")
      .select(
        "id,name,subject,content,content_blocks,from_name,header_image,footer_image,social_facebook,social_x,social_instagram,social_linkedin,social_medium,unsubscribe_url,copyright_text,company_address,status",
      )
      .eq("id", id)
      .single()
    return campaign
  })

export const Route = createFileRoute('/broadcasts/$id/edit')({
  loader: ({ params }) => loadBroadcastForEdit({ data: params.id }),
  component: EditBroadcastPage,
})

function EditBroadcastPage() {
  const campaign = Route.useLoaderData()

  if (!campaign) {
    return <Navigate to="/broadcasts/new" />
  }

  return <CreateCampaignForm campaign={campaign} />
}
