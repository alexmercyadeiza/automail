import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { listSenderIdentities, loadFirstAdmin } from "@/server/settings";
import { getAdminUsers } from "@/server/team";
import type { AdminUser } from "@/server/team";

import SenderIdentities from "@/components/settings/sender-identities";
import AccountSettings from "@/components/settings/account-settings";
// import SecuritySettings from "@/components/settings/security-settings";
import TeamTable from "@/components/team/team-table";
import AddUserButton from "@/components/team/add-user-button";

const loadSettings = async () => {
  const [identitiesResult, adminResult, teamResult] = await Promise.all([
    listSenderIdentities(),
    loadFirstAdmin(),
    getAdminUsers(),
  ]);

  return {
    identities: identitiesResult.ok ? identitiesResult.identities : [],
    identitiesError: identitiesResult.ok ? null : identitiesResult.message,
    account: adminResult.ok ? adminResult.account : null,
    teamUsers: teamResult.ok ? teamResult.users : ([] as AdminUser[]),
  };
};

export const Route = createFileRoute("/settings/")({
  loader: () => loadSettings(),
  component: SettingsPage,
});

type TabId = "account" | "sender-identities" | "team";

const TABS: { id: TabId; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "sender-identities", label: "Sender Identities" },
  { id: "team", label: "Team" },
];

function SettingsPage() {
  const { identities, identitiesError, account, teamUsers: initialTeamUsers } =
    Route.useLoaderData();
  const [teamUsers, setTeamUsers] = useState<AdminUser[]>(initialTeamUsers);
  const [activeTab, setActiveTab] = useState<TabId>("account");

  return (
    <div className="p-10 space-y-8">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-neutral-500">
          Manage your account, email sending configuration, and security.
        </p>
      </header>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex gap-6" aria-label="Settings tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-neutral-900 rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "account" && <AccountSettings account={account} />}
        {activeTab === "sender-identities" && (
          <SenderIdentities
            initialIdentities={identities}
            loadError={identitiesError}
          />
        )}
        {activeTab === "team" && (
          <section className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-neutral-900">Team</h2>
                <p className="text-sm text-neutral-500">
                  Manage admin accounts and permissions.
                </p>
              </div>
              <AddUserButton onCreated={(user) => setTeamUsers([...teamUsers, user])} />
            </div>
            <TeamTable users={teamUsers} onUsersChange={setTeamUsers} />
          </section>
        )}

      </div>
    </div>
  );
}
