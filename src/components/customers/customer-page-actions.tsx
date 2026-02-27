import { Archive, Eye, EyeOff, Plus, Upload } from "lucide-react";
import { useState } from "react";
import AddCustomerModal from "./add-customer-modal";
import CreateListModal from "./create-list-modal";
import ImportCSVModal from "./import-csv-modal";
import { useObscure } from "./obscure-context";

type EmailList = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type Props = {
  lists: EmailList[];
  selectedListId?: string;
};

export default function CustomerPageActions({ lists, selectedListId }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const { obscured, toggle: onToggleObscured } = useObscure();

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleObscured}
          className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
          title={obscured ? "Show contacts" : "Hide contacts"}
        >
          {obscured ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowCreateListModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Archive className="h-4 w-4" />
          New list
        </button>
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </button>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Add contact
        </button>
      </div>

      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        lists={lists}
        defaultListId={selectedListId}
      />

      <ImportCSVModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        lists={lists}
        defaultListId={selectedListId}
      />

      <CreateListModal
        isOpen={showCreateListModal}
        onClose={() => setShowCreateListModal(false)}
      />
    </>
  );
}
