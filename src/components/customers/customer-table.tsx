import { ArrowLeftRight, ChevronDown, Loader2, Users } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  deleteMarketingCustomer,
  deleteMultipleCustomers,
  updateCustomerList,
} from "@/server/campaigns";
import { useObscure } from "./obscure-context";

type Customer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  created_at: string;
  list_id: string | null;
};

type EmailList = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type Props = {
  customers: Customer[];
  lists: EmailList[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function MoveToListDropdown({
  lists,
  onSelect,
  disabled,
}: {
  lists: EmailList[];
  onSelect: (listId: string | null) => void;
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg border border-neutral-200/80 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
      >
        <ArrowLeftRight className="h-3.5 w-3.5 text-neutral-500" />
        Move to list
        <ChevronDown
          className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-xs text-neutral-600 hover:bg-neutral-50"
          >
            Remove from list
          </button>
          {lists.length > 0 && (
            <div className="my-1 border-t border-neutral-100" />
          )}
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => {
                onSelect(list.id);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50"
            >
              {list.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CustomerTable({ customers, lists }: Props) {
  const { obscured } = useObscure();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, startDelete] = useTransition();
  const [isMoving, startMove] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const listMap = lists.reduce(
    (acc, list) => {
      acc[list.id] = list.name;
      return acc;
    },
    {} as Record<string, string>,
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;

    setFeedback(null);
    startDelete(async () => {
      const result = await deleteMultipleCustomers({
        data: Array.from(selectedIds),
      });
      if (!result.ok) {
        setFeedback(result.message ?? "Failed to delete contacts");
        return;
      }
      setFeedback(`Deleted ${result.deleted} contacts`);
      setSelectedIds(new Set());
      router.invalidate();
    });
  };

  const handleDeleteOne = (customerId: string) => {
    startDelete(async () => {
      const result = await deleteMarketingCustomer({
        data: { customerId },
      });
      if (!result.ok) {
        setFeedback(result.message ?? "Failed to delete contact");
      }
      router.invalidate();
    });
  };

  const handleMoveToList = (listId: string | null) => {
    if (selectedIds.size === 0) return;

    setFeedback(null);
    startMove(async () => {
      const result = await updateCustomerList({
        data: { customerIds: Array.from(selectedIds), listId },
      });
      if (!result.ok) {
        setFeedback(result.message ?? "Failed to move contacts");
        return;
      }
      const listName = listId
        ? listMap[listId] || "the selected list"
        : "no list";
      setFeedback(`Moved ${result.updated} contact(s) to ${listName}`);
      setSelectedIds(new Set());
      router.invalidate();
    });
  };

  return (
    <div>
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-4 bg-neutral-50 px-6 py-3 border-b border-neutral-200/80">
          <span className="text-sm text-neutral-600">
            {selectedIds.size} contact{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-3">
            {lists.length > 0 && (
              <MoveToListDropdown
                lists={lists}
                onSelect={handleMoveToList}
                disabled={isMoving}
              />
            )}
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete selected"
              )}
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div className="px-6 py-2 bg-neutral-50 border-b border-neutral-200/80">
          <p
            className={`text-sm ${feedback.includes("Failed") ? "text-red-600" : "text-emerald-600"}`}
          >
            {feedback}
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200/80 text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-6 py-3 font-medium w-10">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.size === customers.length &&
                    customers.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-neutral-300"
                />
              </th>
              <th className="px-6 py-3 font-medium">First Name</th>
              <th className="px-6 py-3 font-medium">Last Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">List</th>
              <th className="px-6 py-3 font-medium">Added</th>
              <th className="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                      <Users className="h-7 w-7 text-neutral-400" />
                    </div>
                    <h3 className="mt-4 text-sm font-medium text-neutral-900">
                      No contacts yet
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      Get started by importing a CSV file or adding contacts
                      manually.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(customer.id)}
                      onChange={() => toggleSelect(customer.id)}
                      className="rounded border-neutral-300"
                    />
                  </td>
                  <td className="px-6 py-4 font-medium text-neutral-900">
                    {obscured ? (
                      <span className="inline-block h-4 w-20 rounded bg-neutral-100 animate-pulse" />
                    ) : (
                      customer.first_name || "\u2014"
                    )}
                  </td>
                  <td className="px-6 py-4 text-neutral-700">
                    {obscured ? (
                      <span className="inline-block h-4 w-16 rounded bg-neutral-100 animate-pulse" />
                    ) : (
                      customer.last_name || "\u2014"
                    )}
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {obscured ? (
                      <span className="inline-block h-4 w-36 rounded bg-neutral-100 animate-pulse" />
                    ) : (
                      customer.email
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {customer.list_id ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {listMap[customer.list_id] || "Unknown list"}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-400">\u2014</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-neutral-500">
                    {formatDate(customer.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteOne(customer.id)}
                      disabled={isDeleting}
                      className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
