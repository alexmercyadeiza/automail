import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { createServiceClient } from '@/lib/supabase/service'
import WorkflowBuilder from '@/components/automations/workflow-builder'
import { updateAutomation } from '@/server/automations'

const loadAutomation = createServerFn({ method: 'GET' })
  .inputValidator((d: string) => d)
  .handler(async ({ data: id }) => {
    const supabase = createServiceClient()
    const { data: automation } = await supabase
      .from('automation_campaigns')
      .select('id,name,status,nodes,created_at,updated_at')
      .eq('id', id)
      .single()
    return automation
  })

export const Route = createFileRoute('/campaigns/$id/')({
  loader: ({ params }) => loadAutomation({ data: params.id }),
  component: AutomationDetailPage,
})

function AutomationDetailPage() {
  const automation = Route.useLoaderData()
  const params = Route.useParams()

  if (!automation) {
    return (
      <div className="p-10">
        <p className="text-sm text-red-600">Automation not found.</p>
      </div>
    )
  }

  const handleSave = async (
    name: string,
    nodes: typeof automation.nodes,
  ) => {
    const result = await updateAutomation({
      data: { id: params.id, payload: { name, nodes } },
    })
    return { ok: result.ok, id: params.id }
  }

  return (
    <WorkflowBuilder
      automationId={automation.id}
      initialName={automation.name}
      initialNodes={automation.nodes}
      onSave={handleSave}
    />
  )
}
