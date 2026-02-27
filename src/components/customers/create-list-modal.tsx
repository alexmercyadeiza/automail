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
import { createEmailList } from "@/server/campaigns";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateListModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameInputId = useId();
  const descInputId = useId();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const result = await createEmailList({ data: { name, description } });
      if (!result.ok) {
        setFeedback(result.message ?? "Unable to create list");
        return;
      }

      toast.success("List created", {
        description: `"${name}" has been created`,
      });
      router.invalidate();
      resetAndClose();
    });
  };

  const resetAndClose = () => {
    setName("");
    setDescription("");
    setFeedback(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Create list"
      description="Organize your contacts into lists"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="text-sm font-medium text-neutral-700"
            htmlFor={nameInputId}
          >
            List name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Newsletter subscribers"
            id={nameInputId}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-neutral-700"
            htmlFor={descInputId}
          >
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional description"
            id={descInputId}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <ModalError message={feedback} />

        <ModalFooter>
          <ModalCancelButton onClick={resetAndClose}>Cancel</ModalCancelButton>
          <ModalSubmitButton disabled={isPending}>
            {isPending ? (
              <>
                <ButtonSpinner />
                Creating...
              </>
            ) : (
              "Create list"
            )}
          </ModalSubmitButton>
        </ModalFooter>
      </form>
    </Modal>
  );
}
