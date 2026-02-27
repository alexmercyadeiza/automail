import {
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Modal, { ModalCancelButton, ModalFooter } from "@/components/ui/modal";

type EmailList = {
  id: string;
  name: string;
  customer_count?: number;
};

type BatchResult = {
  email: string;
  success: boolean;
};

type SendProgress = {
  phase: "idle" | "preparing" | "sending" | "complete" | "error";
  total: number;
  totalBatches: number;
  currentBatch: number;
  sent: number;
  failed: number;
  progress: number;
  recentResults: BatchResult[];
  errorMessage?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  status: string;
  customerCount: number;
  lists: EmailList[];
};

function ListSelectDropdown({
  lists,
  selectedId,
  onChange,
  customerCount,
  disabled,
}: {
  lists: EmailList[];
  selectedId: string;
  onChange: (id: string) => void;
  customerCount: number;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const selectedLabel = selectedId
    ? lists.find((l) => l.id === selectedId)?.name
    : `All contacts (${customerCount})`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${
          disabled
            ? "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed"
            : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        }`}
      >
        <span className={selectedId ? "" : "text-neutral-600"}>
          {selectedLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && !disabled && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
              !selectedId ? "text-emerald-600 font-medium" : "text-neutral-700"
            }`}
          >
            All contacts ({customerCount})
            {!selectedId && <Check className="h-4 w-4" />}
          </button>
          {lists.length > 0 && (
            <div className="my-1 border-t border-neutral-100" />
          )}
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => {
                onChange(list.id);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                selectedId === list.id
                  ? "text-emerald-600 font-medium"
                  : "text-neutral-700"
              }`}
            >
              <span>
                {list.name}{" "}
                <span className="text-neutral-400">
                  ({list.customer_count ?? 0})
                </span>
              </span>
              {selectedId === list.id && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SendCampaignModal({
  isOpen,
  onClose,
  campaignId,
  status,
  customerCount,
  lists,
}: Props) {
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [sendProgress, setSendProgress] = useState<SendProgress>({
    phase: "idle",
    total: 0,
    totalBatches: 0,
    currentBatch: 0,
    sent: 0,
    failed: 0,
    progress: 0,
    recentResults: [],
  });

  const getRecipientCount = () => {
    if (selectedListId && lists.length > 0) {
      const list = lists.find((l) => l.id === selectedListId);
      return list?.customer_count ?? 0;
    }
    return customerCount;
  };

  const recipientCount = getRecipientCount();
  const isSending =
    sendProgress.phase === "preparing" || sendProgress.phase === "sending";
  const isComplete = sendProgress.phase === "complete";
  const hasError = sendProgress.phase === "error";

  const handleSendToAll = async () => {
    setSendProgress({
      phase: "preparing",
      total: recipientCount,
      totalBatches: 0,
      currentBatch: 0,
      sent: 0,
      failed: 0,
      progress: 0,
      recentResults: [],
    });

    try {
      const response = await fetch("/api/marketing/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          listId: selectedListId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setSendProgress((prev) => ({
          ...prev,
          phase: "error",
          errorMessage: error.error || "Failed to send campaign",
        }));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setSendProgress((prev) => ({
          ...prev,
          phase: "error",
          errorMessage: "Failed to read response stream",
        }));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "start") {
                setSendProgress((prev) => ({
                  ...prev,
                  phase: "sending",
                  total: data.total,
                  totalBatches: data.totalBatches,
                }));
              } else if (data.type === "batch_start") {
                setSendProgress((prev) => ({
                  ...prev,
                  currentBatch: data.batchNumber,
                }));
              } else if (data.type === "batch_complete") {
                setSendProgress((prev) => ({
                  ...prev,
                  currentBatch: data.batchNumber,
                  sent: data.sent,
                  failed: data.failed,
                  progress: data.progress,
                  recentResults: [
                    ...data.batchResults,
                    ...prev.recentResults,
                  ].slice(0, 20),
                }));
              } else if (data.type === "complete") {
                setSendProgress((prev) => ({
                  ...prev,
                  phase: "complete",
                  sent: data.sent,
                  failed: data.failed,
                  progress: 100,
                }));
                toast.success("Campaign sent", {
                  description: `${data.sent} emails delivered${data.failed > 0 ? `, ${data.failed} failed` : ""}`,
                });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      setSendProgress((prev) => ({
        ...prev,
        phase: "error",
        errorMessage:
          error instanceof Error ? error.message : "Failed to send campaign",
      }));
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onClose();
      // Reset state when closing
      setSendProgress({
        phase: "idle",
        total: 0,
        totalBatches: 0,
        currentBatch: 0,
        sent: 0,
        failed: 0,
        progress: 0,
        recentResults: [],
      });
      setSelectedListId("");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Send Campaign"
      description="Send this campaign to your subscribers"
    >
      <div className="space-y-4">
        {lists.length > 0 && (
          <div>
            <span className="text-xs font-medium text-neutral-600 block mb-1.5">
              Recipients
            </span>
            <ListSelectDropdown
              lists={lists}
              selectedId={selectedListId}
              onChange={setSelectedListId}
              customerCount={customerCount}
              disabled={isSending || isComplete}
            />
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">Total recipients</span>
          <span className="font-medium text-neutral-900">
            {recipientCount.toLocaleString()}
          </span>
        </div>

        {(isSending || isComplete || hasError) && (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">
                  {sendProgress.phase === "preparing" && "Preparing..."}
                  {sendProgress.phase === "sending" &&
                    `Batch ${sendProgress.currentBatch}/${sendProgress.totalBatches}`}
                  {sendProgress.phase === "complete" && "Complete!"}
                  {sendProgress.phase === "error" && "Error"}
                </span>
                <span className="font-mono text-neutral-900">
                  {sendProgress.progress}%
                </span>
              </div>
              <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    hasError
                      ? "bg-red-500"
                      : isComplete
                        ? "bg-emerald-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${sendProgress.progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-white border border-neutral-200 px-3 py-2">
                <p className="text-lg font-semibold text-emerald-600">
                  {sendProgress.sent}
                </p>
                <p className="text-xs text-neutral-500">Sent</p>
              </div>
              <div className="rounded-lg bg-white border border-neutral-200 px-3 py-2">
                <p className="text-lg font-semibold text-red-500">
                  {sendProgress.failed}
                </p>
                <p className="text-xs text-neutral-500">Failed</p>
              </div>
              <div className="rounded-lg bg-white border border-neutral-200 px-3 py-2">
                <p className="text-lg font-semibold text-neutral-600">
                  {sendProgress.total}
                </p>
                <p className="text-xs text-neutral-500">Total</p>
              </div>
            </div>

            {sendProgress.recentResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Recent Activity
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg bg-white border border-neutral-200 p-2">
                  {sendProgress.recentResults.map((result, idx) => (
                    <div
                      key={`${result.email}-${idx}`}
                      className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-neutral-50"
                    >
                      {result.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      )}
                      <span className="text-neutral-600 truncate font-mono">
                        {result.email}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasError && sendProgress.errorMessage && (
              <p className="text-sm text-red-600">
                {sendProgress.errorMessage}
              </p>
            )}
          </div>
        )}

        {isSending && (
          <p className="text-xs text-center text-neutral-500">
            You can leave this page. Emails will continue sending in the
            background.
          </p>
        )}
      </div>

      <ModalFooter>
        <ModalCancelButton onClick={handleClose} disabled={isSending}>
          {isComplete ? "Close" : "Cancel"}
        </ModalCancelButton>
        <button
          type="button"
          onClick={handleSendToAll}
          disabled={
            status === "sent" || isSending || isComplete || recipientCount === 0
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300 transition-colors"
        >
          {status === "sent" || isComplete ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Campaign Sent
            </>
          ) : isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : recipientCount === 0 ? (
            "No recipients"
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send to {recipientCount.toLocaleString()}
            </>
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
}
