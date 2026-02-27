import { Link, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ChevronLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import CustomerPageActions from "@/components/customers/customer-page-actions";
import CustomerTable from "@/components/customers/customer-table";
import ListSelector from "@/components/customers/list-selector";
import { ObscureProvider } from "@/components/customers/obscure-context";
import Pagination from "@/components/customers/pagination";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const loadCustomers = createServerFn({ method: "GET" })
  .inputValidator(
    (d: { list?: string; page: number; limit: number }) => d,
  )
  .handler(async ({ data: params }) => {
    const selectedListId = params.list;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    // Fetch lists
    const { data: listsRaw } = await supabase
      .from("marketing_email_lists")
      .select("id,name,description,created_at")
      .order("created_at", { ascending: false });

    const lists = listsRaw ?? [];

    // Get customer counts per list
    const listIds = lists.map((l) => l.id);
    const { data: customerCounts } = await supabase
      .from("marketing_customers")
      .select("list_id")
      .in("list_id", listIds.length > 0 ? listIds : ["__none__"]);

    const countByList = (customerCounts || []).reduce(
      (acc, c) => {
        if (c.list_id) {
          acc[c.list_id] = (acc[c.list_id] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const listsWithCounts = lists.map((l) => ({
      ...l,
      customer_count: countByList[l.id] || 0,
    }));

    // Build customers query with pagination
    let customersQuery = supabase
      .from("marketing_customers")
      .select("id,first_name,last_name,email,created_at,list_id")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Build count query for filtered results
    let countQuery = supabase
      .from("marketing_customers")
      .select("*", { count: "exact", head: true });

    if (selectedListId) {
      customersQuery = customersQuery.eq("list_id", selectedListId);
      countQuery = countQuery.eq("list_id", selectedListId);
    }

    const [
      { data: customerRows },
      { count: filteredCount },
      { count: totalCount },
    ] = await Promise.all([
      customersQuery,
      countQuery,
      supabase
        .from("marketing_customers")
        .select("*", { count: "exact", head: true }),
    ]);

    const customers = customerRows ?? [];
    const totalFiltered = filteredCount ?? 0;
    const totalPages = Math.ceil(totalFiltered / limit);

    const selectedList = selectedListId
      ? lists.find((l) => l.id === selectedListId) ?? null
      : null;

    return {
      customers,
      lists,
      listsWithCounts,
      countByList,
      totalCount: totalCount ?? 0,
      totalFiltered,
      totalPages,
      page,
      limit,
      selectedListId: selectedListId ?? null,
      selectedList,
    };
  });

export const Route = createFileRoute("/customers")({
  validateSearch: (search: Record<string, unknown>) => ({
    list: (search.list as string) || undefined,
    page: Number(search.page) || 1,
    limit: Number(search.limit) || 20,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadCustomers({ data: deps }),
  component: CustomersPage,
});

function CustomersPage() {
  const {
    customers,
    lists,
    listsWithCounts,
    countByList,
    totalCount,
    totalFiltered,
    totalPages,
    page,
    limit,
    selectedListId,
    selectedList,
  } = Route.useLoaderData();

  const search = Route.useSearch();

  return (
    <ObscureProvider>
      <div className="p-10 space-y-6">
        {/* Header */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-700 mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
                {selectedList ? selectedList.name : "Contacts"}
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                {selectedList
                  ? `${totalFiltered} contact${totalFiltered !== 1 ? "s" : ""} in this list`
                  : "Manage your email subscribers and organize them into lists"}
              </p>
            </div>
            <CustomerPageActions
              lists={lists}
              selectedListId={search.list}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white border border-neutral-200 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Total Contacts
            </p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">
              {totalCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-white border border-neutral-200 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Lists
            </p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">
              {lists.length}
            </p>
          </div>
          <div className="rounded-xl bg-white border border-neutral-200 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              {selectedList ? "In This List" : "Currently Viewing"}
            </p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">
              {totalFiltered}
            </p>
          </div>
          <div className="rounded-xl bg-white border border-neutral-200 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Unassigned
            </p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">
              {totalCount -
                Object.values(countByList).reduce(
                  (a: number, b: number) => a + b,
                  0,
                )}
            </p>
          </div>
        </div>

        {/* Lists Section */}
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
            <h2 className="text-sm font-semibold text-neutral-900">Lists</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Filter contacts by list or view all
            </p>
          </div>
          <div className="p-4">
            <ListSelector
              lists={listsWithCounts}
              selectedListId={selectedListId}
              totalCustomers={totalCount}
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <CustomerTable customers={customers} lists={lists} />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalFiltered}
            limit={limit}
            baseUrl={`/customers${selectedListId ? `?list=${selectedListId}` : ""}`}
          />
        </div>
      </div>
    </ObscureProvider>
  );
}
