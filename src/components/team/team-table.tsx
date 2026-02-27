import { KeyRound, MoreHorizontal, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import ConfirmModal from "@/components/ui/confirm-modal";
import Modal, {
  ButtonSpinner,
  ModalCancelButton,
  ModalError,
  ModalFooter,
  ModalSubmitButton,
} from "@/components/ui/modal";
import { deleteAdminUser, updateAdminUser } from "@/server/team";
import type { AdminUser } from "@/server/team";

type Props = {
  users: AdminUser[];
  onUsersChange: (users: AdminUser[]) => void;
};

export default function TeamTable({ users, onUsersChange }: Props) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const setTriggerRef = useCallback((id: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      triggerRefs.current.set(id, el);
    } else {
      triggerRefs.current.delete(id);
    }
  }, []);

  const openMenu = (userId: string) => {
    if (menuOpenId === userId) {
      setMenuOpenId(null);
      setMenuPos(null);
      return;
    }
    const trigger = triggerRefs.current.get(userId);
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.right - 192, // 192 = w-48 (12rem)
      });
    }
    setMenuOpenId(userId);
  };

  useEffect(() => {
    if (!menuOpenId) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        triggerRefs.current.get(menuOpenId)?.contains(target)
      ) {
        return;
      }
      setMenuOpenId(null);
      setMenuPos(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenId]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    setError(null);

    try {
      const result = await deleteAdminUser({ data: deleteTarget.id });

      if (!result.ok) {
        setError(result.message || "Failed to delete user");
        return;
      }

      toast.success("User deleted");
      onUsersChange(users.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setLoading(true);
    setError(null);

    try {
      const result = await updateAdminUser({
        data: { id: resetTarget.id, password: newPassword },
      });

      if (!result.ok) {
        setError(result.message || "Failed to reset password");
        return;
      }

      toast.success("Password updated");
      setResetTarget(null);
      setNewPassword("");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "editor":
        return "Editor";
      case "viewer":
        return "Viewer";
      default:
        return role;
    }
  };

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-emerald-50 text-emerald-700";
      case "editor":
        return "bg-blue-50 text-blue-700";
      case "viewer":
        return "bg-neutral-100 text-neutral-600";
      default:
        return "bg-neutral-100 text-neutral-600";
    }
  };

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
        <p className="text-sm text-neutral-500">No team members yet</p>
      </div>
    );
  }

  const menuUser = menuOpenId ? users.find((u) => u.id === menuOpenId) : null;

  return (
    <>
      <div className="rounded-xl border border-neutral-200/80 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-neutral-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-neutral-900">
                  {user.name || "\u2014"}
                </td>
                <td className="px-6 py-4 text-neutral-600">{user.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass(user.role)}`}
                  >
                    {roleLabel(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4 text-neutral-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    ref={setTriggerRef(user.id)}
                    type="button"
                    onClick={() => openMenu(user.id)}
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Portaled dropdown menu */}
      {menuOpenId && menuPos && menuUser &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 w-48 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpenId(null);
                setMenuPos(null);
                setResetTarget(menuUser);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <KeyRound className="h-4 w-4" />
              Reset Password
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpenId(null);
                setMenuPos(null);
                setDeleteTarget(menuUser);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete User
            </button>
          </div>,
          document.body,
        )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setError(null);
        }}
        onConfirm={handleDelete}
        title="Delete User"
        description={`Are you sure you want to delete ${deleteTarget?.name || deleteTarget?.email}? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={loading}
        variant="danger"
      />

      {/* Reset password modal */}
      <Modal
        isOpen={!!resetTarget}
        onClose={() => {
          setResetTarget(null);
          setNewPassword("");
          setError(null);
        }}
        title="Reset Password"
        description={`Set a new password for ${resetTarget?.name || resetTarget?.email}`}
        size="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label
              htmlFor="reset-password"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              New Password
            </label>
            <input
              id="reset-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
              placeholder="Min 6 characters"
            />
          </div>

          <ModalError message={error} />

          <ModalFooter>
            <ModalCancelButton
              onClick={() => {
                setResetTarget(null);
                setNewPassword("");
                setError(null);
              }}
              disabled={loading}
            >
              Cancel
            </ModalCancelButton>
            <ModalSubmitButton disabled={loading || newPassword.length < 6}>
              {loading && <ButtonSpinner />}
              Update Password
            </ModalSubmitButton>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
