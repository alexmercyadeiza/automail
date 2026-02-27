import { createFileRoute } from '@tanstack/react-router'
import CreateCampaignForm from '@/components/campaigns/create-campaign-form'

export const Route = createFileRoute('/broadcasts/new')({
  component: NewBroadcastPage,
})

function NewBroadcastPage() {
  return <CreateCampaignForm />
}
