import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Modal, {
  ButtonSpinner,
  ModalCancelButton,
  ModalError,
  ModalFooter,
  ModalSubmitButton,
} from "@/components/ui/modal";
import { createAdminUser } from "@/server/team";
import type { AdminUser } from "@/server/team";

type Props = {
  onCreated: (user: AdminUser) => void;
};

const roles = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

export default function AddUserButton({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  const selectedRole = roles.find((r) => r.value === role) ?? roles[0];

  useEffect(() => {
    if (!roleDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [roleDropdownOpen]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("admin");
    setRoleDropdownOpen(false);
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await createAdminUser({
        data: { name, email, password, role },
      });

      if (!result.ok) {
        setError(result.message || "Failed to create user");
        return;
      }

      toast.success("User created successfully");
      onCreated(result.user!);
      setOpen(false);
      resetForm();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add User
      </button>

      <Modal
        isOpen={open}
        onClose={handleClose}
        title="Add Team Member"
        description="Create a new admin account"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="add-name" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Name
            </label>
            <input
              id="add-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
              placeholder="Full name"
            />
          </div>

          <div>
            <label htmlFor="add-email" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Email
            </label>
            <input
              id="add-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="add-password" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Password
            </label>
            <input
              id="add-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
              placeholder="Min 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Role
            </label>
            <div ref={roleRef} className="relative">
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
              >
                <span>{selectedRole.label}</span>
                <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${roleDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {roleDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                  {roles.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        setRole(r.value);
                        setRoleDropdownOpen(false);
                      }}
                      className={`flex w-full items-center px-3 py-2 text-sm transition-colors ${
                        role === r.value
                          ? "bg-neutral-50 text-neutral-900 font-medium"
                          : "text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <ModalError message={error} />

          <ModalFooter>
            <ModalCancelButton onClick={handleClose} disabled={loading}>
              Cancel
            </ModalCancelButton>
            <ModalSubmitButton disabled={loading}>
              {loading && <ButtonSpinner />}
              Create User
            </ModalSubmitButton>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
