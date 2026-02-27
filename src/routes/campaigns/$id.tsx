import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/campaigns/$id')({
  component: AutomationLayout,
})

function AutomationLayout() {
  return <Outlet />
}
