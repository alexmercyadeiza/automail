import Modal, {
  ButtonSpinner,
  ModalCancelButton,
  ModalFooter,
} from "./modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: "danger" | "default";
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  loading = false,
  variant = "default",
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} size="sm">
      <ModalFooter>
        <ModalCancelButton onClick={onClose} disabled={loading}>
          Cancel
        </ModalCancelButton>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 ${
            variant === "danger"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {loading && <ButtonSpinner />}
          {confirmLabel}
        </button>
      </ModalFooter>
    </Modal>
  );
}
