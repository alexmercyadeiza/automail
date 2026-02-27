import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

type Props = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  baseUrl: string;
};

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  limit,
  baseUrl,
}: Props) {
  const navigate = useNavigate();

  const buildUrl = (page: number, newLimit?: number) => {
    const currentSearch =
      typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(currentSearch);
    params.set("page", String(page));
    if (newLimit) {
      params.set("limit", String(newLimit));
    }
    const hasQuery = baseUrl.includes("?");
    if (hasQuery) {
      const [base, existingParams] = baseUrl.split("?");
      const existingSearchParams = new URLSearchParams(existingParams);
      for (const [key, value] of existingSearchParams.entries()) {
        if (!params.has(key)) {
          params.set(key, value);
        }
      }
      return `${base}?${params.toString()}`;
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const handlePageChange = (page: number) => {
    navigate({ to: buildUrl(page) });
  };

  const handleLimitChange = (newLimit: number) => {
    navigate({ to: buildUrl(1, newLimit) });
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalItems);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-200 bg-neutral-50 px-6 py-3">
      <div className="flex items-center gap-4">
        <p className="text-sm text-neutral-600">
          Showing <span className="font-medium">{startItem}</span> to{" "}
          <span className="font-medium">{endItem}</span> of{" "}
          <span className="font-medium">{totalItems.toLocaleString()}</span>{" "}
          contacts
        </p>

        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">Show:</span>
          <select
            value={String(limit)}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-700"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>

          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page, idx) =>
              page === "ellipsis" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 text-neutral-400"
                >
                  &hellip;
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  className={`min-w-[32px] rounded-lg px-2 py-1.5 text-sm font-medium transition ${
                    currentPage === page
                      ? "bg-emerald-600 text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {page}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
