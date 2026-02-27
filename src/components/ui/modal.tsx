import { Loader2, X } from "lucide-react";
import { useEffect, useRef } from "react";

type ModalSize = "sm" | "md" | "lg" | "xl";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: ModalSize;
};

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
}: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full ${sizeClasses[size]} rounded-2xl bg-white p-6 shadow-xl`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-neutral-900">{title}</h2>
            {description && <p className="text-sm text-neutral-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type ButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  type?: "button" | "submit";
};

export function ModalCancelButton({ onClick, disabled, children }: ButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="flex-1 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50">
      {children}
    </button>
  );
}

export function ModalSubmitButton({ onClick, disabled, children, type = "submit" }: ButtonProps) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-400 flex items-center justify-center gap-2">
      {children}
    </button>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3 pt-2">{children}</div>;
}

export function ModalError({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{message}</div>;
}

export function ButtonSpinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}
