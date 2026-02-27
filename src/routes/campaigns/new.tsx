import { createFileRoute } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import WorkflowBuilder from '@/components/automations/workflow-builder'
import { createAutomation, updateAutomation } from '@/server/automations'
import { useRef } from 'react'

export const Route = createFileRoute('/campaigns/new')({
  component: NewAutomationPage,
})

function NewAutomationPage() {
  const navigate = useNavigate()
  const automationIdRef = useRef<string | null>(null)

  const handleSave = async (
    name: string,
    nodes: Parameters<typeof createAutomation>[0] extends { data: infer D }
      ? D extends { nodes: infer N }
        ? N
        : never
      : never,
  ) => {
    if (automationIdRef.current) {
      const result = await updateAutomation({
        data: { id: automationIdRef.current, payload: { name, nodes } },
      })
      return { ok: result.ok, id: automationIdRef.current }
    }

    const result = await createAutomation({ data: { name, nodes } })
    if (result.ok && result.automation) {
      automationIdRef.current = result.automation.id
      return { ok: true, id: result.automation.id }
    }
    return { ok: false }
  }

  return <WorkflowBuilder onSave={handleSave} />
}
