import { useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ui/confirm-modal";
import type { SenderIdentity } from "@/server/settings";
import {
  createSenderIdentity,
  deleteSenderIdentity,
  getSenderIdentity,
} from "@/server/settings";

type Props = {
  initialIdentities: SenderIdentity[];
  loadError: string | null;
};

const statusBadge = (status: string) => {
  switch (status) {
    case "SUCCESS":
      return "bg-emerald-50 text-emerald-700";
    case "PENDING":
      return "bg-amber-50 text-amber-700";
    case "FAILED":
    case "TEMPORARY_FAILURE":
      return "bg-red-50 text-red-700";
    default:
      return "bg-neutral-100 text-neutral-600";
  }
};

const typeLabel = (type: string) => {
  switch (type) {
    case "EMAIL_ADDRESS":
      return "Email";
    case "DOMAIN":
      return "Domain";
    case "MANAGED_DOMAIN":
      return "Managed Domain";
    default:
      return type;
  }
};

export default function SenderIdentities({ initialIdentities, loadError }: Props) {
  const [identities, setIdentities] = useState<SenderIdentity[]>(initialIdentities);
  const [newIdentity, setNewIdentity] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = newIdentity.trim();
    if (!value) return;

    setAdding(true);
    try {
      const result = await createSenderIdentity({ data: { identity: value } });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const isDomain = !value.includes("@");
      setIdentities((prev) => [
        ...prev,
        {
          name: value.toLowerCase(),
          type: result.identityType as SenderIdentity["type"],
          verificationStatus: result.verificationStatus,
          dkimTokens: result.dkimTokens,
          sendingEnabled: result.verificationStatus === "SUCCESS",
        },
      ]);
      setNewIdentity("");
      toast.success(`Identity "${value}" created`);
    } catch {
      toast.error("Failed to create identity");
    } finally {
      setAdding(false);
    }
  };

  const handleRefresh = async (name: string) => {
    setRefreshingId(name);
    try {
      const result = await getSenderIdentity({ data: name });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setIdentities((prev) =>
        prev.map((id) => (id.name === name ? result.identity : id)),
      );
    } catch {
      toast.error("Failed to refresh identity");
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteSenderIdentity({ data: deleteTarget });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setIdentities((prev) => prev.filter((id) => id.name !== deleteTarget));
      toast.success("Identity deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete identity");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-neutral-900">
          Sender Identities
        </h2>
        <p className="text-sm text-neutral-500">
          Manage verified email addresses and domains used to send campaigns.
        </p>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* Add identity form */}
      <form onSubmit={handleAdd} className="flex gap-3">
        <input
          type="text"
          value={newIdentity}
          onChange={(e) => setNewIdentity(e.target.value)}
          placeholder="Email address or domain"
          className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
        />
        <button
          type="submit"
          disabled={adding || !newIdentity.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      {/* Identities table */}
      {identities.length === 0 && !loadError ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
          <p className="text-sm text-neutral-500">
            No sender identities configured yet.
          </p>
        </div>
      ) : identities.length > 0 ? (
        <div className="rounded-xl border border-neutral-200/80 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Identity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {identities.map((identity) => (
                <tr
                  key={identity.name}
                  className="hover:bg-neutral-50/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-neutral-900">
                    {identity.name}
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {typeLabel(identity.type)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(identity.verificationStatus)}`}
                    >
                      {identity.verificationStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRefresh(identity.name)}
                        disabled={refreshingId === identity.name}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-50 transition-colors"
                        title="Refresh status"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${refreshingId === identity.name ? "animate-spin" : ""}`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(identity.name)}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete identity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Identity"
        description={`Are you sure you want to delete "${deleteTarget}"? You will need to re-verify it to send emails from this identity again.`}
        confirmLabel="Delete"
        loading={deleting}
        variant="danger"
      />
    </section>
  );
}
