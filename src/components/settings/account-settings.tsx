import { useState } from "react";
import { toast } from "sonner";
import type { AccountInfo } from "@/server/settings";
import { updateAccountEmail, updateAccountName } from "@/server/settings";

type Props = {
  account: AccountInfo | null;
};

export default function AccountSettings({ account }: Props) {
  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  if (!account) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
        <p className="text-sm text-neutral-500">Unable to load account information.</p>
      </div>
    );
  }

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === account.name) return;

    setSavingName(true);
    try {
      const result = await updateAccountName({ data: { id: account.id, name: trimmed } });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Name updated");
    } catch {
      toast.error("Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || trimmed === account.email) return;

    setSavingEmail(true);
    try {
      const result = await updateAccountEmail({ data: { id: account.id, email: trimmed } });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Email updated");
    } catch {
      toast.error("Failed to update email");
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-neutral-900">Account</h2>
        <p className="text-sm text-neutral-500">
          Manage your account details.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200/80 bg-white divide-y divide-neutral-100">
        {/* Name field */}
        <form onSubmit={handleSaveName} className="flex items-end gap-4 px-6 py-5">
          <div className="flex-1">
            <label
              htmlFor="account-name"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Name
            </label>
            <input
              id="account-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={savingName || name.trim() === account.name || !name.trim()}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingName ? "Saving..." : "Save"}
          </button>
        </form>

        {/* Email field */}
        <form onSubmit={handleSaveEmail} className="flex items-end gap-4 px-6 py-5">
          <div className="flex-1">
            <label
              htmlFor="account-email"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Email
            </label>
            <input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={savingEmail || email.trim().toLowerCase() === account.email || !email.trim()}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingEmail ? "Saving..." : "Save"}
          </button>
        </form>

        {/* Role (read-only) */}
        <div className="px-6 py-5">
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Role
          </label>
          <p className="text-sm text-neutral-600 capitalize">{account.role}</p>
        </div>
      </div>
    </section>
  );
}
