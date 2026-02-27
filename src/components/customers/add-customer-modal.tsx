import { useId, useState, useTransition } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import Modal, {
  ButtonSpinner,
  ModalCancelButton,
  ModalError,
  ModalFooter,
  ModalSubmitButton,
} from "@/components/ui/modal";
import { createMarketingCustomer } from "@/server/campaigns";

type EmailList = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  lists: EmailList[];
  defaultListId?: string;
};

export default function AddCustomerModal({
  isOpen,
  onClose,
  lists,
  defaultListId,
}: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [listId, setListId] = useState(defaultListId || "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const firstNameInputId = useId();
  const lastNameInputId = useId();
  const emailInputId = useId();
  const listInputId = useId();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const result = await createMarketingCustomer({
        data: {
          firstName,
          lastName,
          email,
          listId: listId || undefined,
        },
      });
      if (!result.ok) {
        setFeedback(result.message ?? "Unable to add customer");
        return;
      }

      toast.success("Contact added", {
        description: `${firstName || email} has been added to your contacts`,
      });
      router.invalidate();
      resetAndClose();
    });
  };

  const resetAndClose = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setFeedback(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Add contact"
      description="Add a new subscriber to your list"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="text-sm font-medium text-neutral-700"
              htmlFor={firstNameInputId}
            >
              First name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="e.g. Ada"
              id={firstNameInputId}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              className="text-sm font-medium text-neutral-700"
              htmlFor={lastNameInputId}
            >
              Last name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="e.g. Lovelace"
              id={lastNameInputId}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            className="text-sm font-medium text-neutral-700"
            htmlFor={emailInputId}
          >
            Email address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ada@example.com"
            id={emailInputId}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-neutral-700 block mb-1"
            htmlFor={listInputId}
          >
            Add to list
          </label>
          <select
            id={listInputId}
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">No specific list</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>

        <ModalError message={feedback} />

        <ModalFooter>
          <ModalCancelButton onClick={resetAndClose}>Cancel</ModalCancelButton>
          <ModalSubmitButton disabled={isPending}>
            {isPending ? (
              <>
                <ButtonSpinner />
                Adding...
              </>
            ) : (
              "Add contact"
            )}
          </ModalSubmitButton>
        </ModalFooter>
      </form>
    </Modal>
  );
}
