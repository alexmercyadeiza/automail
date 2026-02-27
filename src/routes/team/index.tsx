import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import AddUserButton from "@/components/team/add-user-button";
import TeamTable from "@/components/team/team-table";
import { createServiceClient } from "@/lib/supabase/service";
import type { AdminUser } from "@/server/team";

const loadTeamUsers = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("admins")
    .select("id, email, name, role, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false as const, users: [] as AdminUser[] };
  }

  return { ok: true as const, users: data as AdminUser[] };
});

export const Route = createFileRoute("/team/")({
  loader: () => loadTeamUsers(),
  component: TeamPage,
});

function TeamPage() {
  const { users: initialUsers } = Route.useLoaderData();
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
            Team
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage admin accounts and permissions
          </p>
        </div>
        <AddUserButton onCreated={(user) => setUsers([...users, user])} />
      </div>

      <TeamTable users={users} onUsersChange={setUsers} />
    </div>
  );
}
