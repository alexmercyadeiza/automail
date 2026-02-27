import { FileText, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteMarketingCampaign, markCampaignAsDraft } from "@/server/campaigns";

type Props = {
  campaignId: string;
  status?: string;
};

export default function CampaignOptionsMenu({ campaignId, status }: Props) {
  const navigate = useNavigate();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isMarkingDraft, setIsMarkingDraft] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowDeleteConfirm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setShowDeleteConfirm(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteMarketingCampaign({ data: campaignId });
      if (result.ok) {
        navigate({ to: "/broadcasts/new" });
      }
    });
  };

  const handleMarkAsDraft = async () => {
    setIsMarkingDraft(true);
    const result = await markCampaignAsDraft({ data: campaignId });
    setIsMarkingDraft(false);

    if (result.ok) {
      toast.success("Campaign marked as draft");
      setIsOpen(false);
      router.invalidate();
    } else {
      toast.error(result.message || "Failed to mark as draft");
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
          {showDeleteConfirm ? (
            <div className="px-3 py-2 space-y-2">
              <p className="text-sm text-neutral-700">Delete this campaign?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                  className="flex-1 rounded-md border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {status === "sent" && (
                <button
                  type="button"
                  onClick={handleMarkAsDraft}
                  disabled={isMarkingDraft}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {isMarkingDraft ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Mark as draft
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete campaign
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
