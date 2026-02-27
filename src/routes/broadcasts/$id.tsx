import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/broadcasts/$id')({
  component: BroadcastLayout,
})

function BroadcastLayout() {
  return <Outlet />
}
