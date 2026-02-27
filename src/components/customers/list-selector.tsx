import { Archive, Users, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Modal from "@/components/ui/modal";
import { deleteEmailList } from "@/server/campaigns";

type EmailList = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  customer_count?: number;
};

type Props = {
  lists: EmailList[];
  selectedListId: string | null;
  totalCustomers: number;
};

export default function ListSelector({
  lists,
  selectedListId,
  totalCustomers,
}: Props) {
  const navigate = useNavigate();
  const [isDeleting, startDelete] = useTransition();
  const [deleteListId, setDeleteListId] = useState<string | null>(null);

  const handleSelectList = (listId: string | null) => {
    const currentSearch =
      typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(currentSearch);
    if (listId) {
      params.set("list", listId);
    } else {
      params.delete("list");
    }
    params.delete("page");
    navigate({
      to: `/customers${params.toString() ? `?${params.toString()}` : ""}`,
    });
  };

  const handleDeleteList = (e: React.MouseEvent, listId: string) => {
    e.stopPropagation();
    setDeleteListId(listId);
  };

  const confirmDeleteList = () => {
    if (!deleteListId) return;
    const listId = deleteListId;

    startDelete(async () => {
      const result = await deleteEmailList({ data: listId });
      setDeleteListId(null);
      if (!result.ok) {
        toast.error(result.message || "Failed to delete list");
        return;
      }
      toast.success("List deleted");
      if (selectedListId === listId) {
        handleSelectList(null);
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => handleSelectList(null)}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition ${
          selectedListId === null
            ? "bg-emerald-50 text-emerald-700 font-medium border border-emerald-200"
            : "bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200"
        }`}
      >
        <Users className="h-4 w-4" />
        <span>All contacts</span>
        <span
          className={`ml-1 text-xs ${selectedListId === null ? "text-emerald-600" : "text-neutral-400"}`}
        >
          ({totalCustomers})
        </span>
      </button>

      {lists.map((list) => (
        <div
          key={list.id}
          role="button"
          tabIndex={0}
          onClick={() => handleSelectList(list.id)}
          onKeyDown={(e) => e.key === "Enter" && handleSelectList(list.id)}
          className={`group inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition cursor-pointer ${
            selectedListId === list.id
              ? "bg-emerald-50 text-emerald-700 font-medium border border-emerald-200"
              : "bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200"
          }`}
        >
          <Archive className="h-4 w-4 shrink-0" />
          <span className="truncate max-w-[150px]">{list.name}</span>
          <span
            className={`text-xs ${selectedListId === list.id ? "text-emerald-600" : "text-neutral-400"}`}
          >
            ({list.customer_count ?? 0})
          </span>
          <button
            type="button"
            onClick={(e) => handleDeleteList(e, list.id)}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 text-neutral-400 hover:text-red-600 transition-opacity disabled:opacity-50"
            title="Delete list"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {lists.length === 0 && (
        <p className="px-3 py-2 text-xs text-neutral-400">
          No lists yet. Create one to organize your contacts.
        </p>
      )}

      <Modal
        isOpen={deleteListId !== null}
        onClose={() => setDeleteListId(null)}
        title="Delete list"
        size="sm"
      >
        <p className="text-sm text-neutral-600">
          Contacts will be unassigned from this list, not deleted.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setDeleteListId(null)}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            onClick={confirmDeleteList}
            disabled={isDeleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Deleting\u2026" : "Delete list"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
