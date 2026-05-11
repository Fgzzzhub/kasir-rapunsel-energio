import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AppBusiness,
  AppRole,
  CustomerRow,
  PaymentMethod,
  TransactionProductRow,
  TransactionRow,
  TransactionServiceRow,
} from "@/lib/types/app";
import { getMonthRange } from "@/lib/utils/date";
import { toNumber } from "@/lib/utils/currency";
import { getServiceEmployeeNames } from "@/lib/utils/transaction-services";

import { attachTransactionServiceEmployees } from "./transaction-service-employees";

type CustomerTransaction = TransactionRow & {
  business: Pick<AppBusiness, "id" | "name" | "slug" | "theme"> | null;
  transaction_products: TransactionProductRow[];
  transaction_services: TransactionServiceRow[];
};

export type CustomerSort =
  | "highest_spending"
  | "last_visit"
  | "most_visits"
  | "name_az"
  | "newest";

export type CustomerListItem = CustomerRow & {
  average_spending: number;
  business_names: string[];
  business_slugs: string[];
  favorite_service: string | null;
  first_visit: string | null;
  last_visit: string | null;
  total_spending: number;
  total_visits: number;
};

export type CustomerSummaryMetrics = {
  customersThisMonth: number;
  newCustomersThisMonth: number;
  repeatCustomers: number;
  spendingThisMonth: number;
  totalCustomers: number;
};

export type CustomerDetail = CustomerListItem & {
  favorite_product: string | null;
  transactions: Array<
    CustomerTransaction & {
      payment_method: PaymentMethod;
      service_summary: string;
      product_summary: string;
    }
  >;
};

function mostFrequent(items: string[]) {
  if (!items.length) return null;

  const counts = new Map<string, number>();
  items.forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function aggregateCustomer(customer: CustomerRow, transactions: CustomerTransaction[]): CustomerListItem {
  const sortedTransactions = [...transactions].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
  const totalVisits = sortedTransactions.length;
  const totalSpending = sortedTransactions.reduce(
    (sum, transaction) => sum + toNumber(transaction.total_amount),
    0,
  );
  const businessMap = new Map<string, { name: string; slug: string }>();
  const serviceNames = sortedTransactions.flatMap((transaction) =>
    transaction.transaction_services.map((service) => service.service_name_snapshot),
  );

  sortedTransactions.forEach((transaction) => {
    if (transaction.business) {
      businessMap.set(transaction.business_id, {
        name: transaction.business.name,
        slug: transaction.business.slug,
      });
    }
  });

  return {
    ...customer,
    average_spending: totalVisits ? totalSpending / totalVisits : 0,
    business_names: Array.from(businessMap.values()).map((business) => business.name),
    business_slugs: Array.from(businessMap.values()).map((business) => business.slug),
    favorite_service: mostFrequent(serviceNames),
    first_visit: sortedTransactions.at(-1)?.created_at ?? null,
    last_visit: sortedTransactions[0]?.created_at ?? null,
    total_spending: totalSpending,
    total_visits: totalVisits,
  };
}

function sortCustomers(customers: CustomerListItem[], sort: CustomerSort) {
  return [...customers].sort((left, right) => {
    if (sort === "highest_spending") return right.total_spending - left.total_spending;
    if (sort === "last_visit") {
      return (
        new Date(right.last_visit ?? 0).getTime() - new Date(left.last_visit ?? 0).getTime()
      );
    }
    if (sort === "most_visits") return right.total_visits - left.total_visits;
    if (sort === "name_az") return left.name.localeCompare(right.name);
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

export async function getCustomers({
  businessId,
  role,
  filters,
}: {
  businessId: string;
  filters: {
    businessId?: string;
    endDate?: string;
    phone?: string;
    search?: string;
    sort?: CustomerSort;
    startDate?: string;
  };
  role: AppRole;
}) {
  const supabase = await createSupabaseServerClient();
  const ownerBusinessFilter =
    role === "owner" && filters.businessId && filters.businessId !== "all"
      ? filters.businessId
      : undefined;
  const effectiveBusinessId = role === "owner" ? ownerBusinessFilter : businessId;

  let customersQuery = supabase.from("customers").select("*");

  if (filters.search?.trim() && filters.phone?.trim()) {
    customersQuery = customersQuery
      .ilike("name", `%${filters.search.trim()}%`)
      .ilike("phone", `%${filters.phone.trim()}%`);
  } else if (filters.search?.trim()) {
    customersQuery = customersQuery.ilike("name", `%${filters.search.trim()}%`);
  } else if (filters.phone?.trim()) {
    customersQuery = customersQuery.ilike("phone", `%${filters.phone.trim()}%`);
  }

  const transactionsQueryBase = supabase
    .from("transactions")
    .select(
      `
        *,
        business:businesses(id, name, slug, theme),
        transaction_services(*),
        transaction_products(*)
      `,
    )
    .not("customer_id", "is", null)
    .order("created_at", { ascending: false });

  let transactionsQuery = transactionsQueryBase;

  if (effectiveBusinessId) {
    transactionsQuery = transactionsQuery.eq("business_id", effectiveBusinessId);
  }

  if (filters.startDate) {
    transactionsQuery = transactionsQuery.gte("created_at", `${filters.startDate}T00:00:00`);
  }

  if (filters.endDate) {
    transactionsQuery = transactionsQuery.lte("created_at", `${filters.endDate}T23:59:59`);
  }

  const [{ data: customersData, error: customersError }, { data: transactionsData, error: transactionsError }] =
    await Promise.all([customersQuery.order("created_at", { ascending: false }), transactionsQuery]);

  if (customersError) throw new Error(customersError.message);
  if (transactionsError) throw new Error(transactionsError.message);

  const transactions = await hydrateCustomerTransactions(
    supabase,
    (transactionsData ?? []) as unknown as CustomerTransaction[],
  );
  const transactionsByCustomer = new Map<string, CustomerTransaction[]>();

  transactions.forEach((transaction) => {
    if (!transaction.customer_id) return;
    const customerTransactions = transactionsByCustomer.get(transaction.customer_id) ?? [];
    customerTransactions.push(transaction);
    transactionsByCustomer.set(transaction.customer_id, customerTransactions);
  });

  const customers = ((customersData ?? []) as CustomerRow[])
    .map((customer) => aggregateCustomer(customer, transactionsByCustomer.get(customer.id) ?? []))
    .filter((customer) => (effectiveBusinessId || filters.startDate || filters.endDate ? customer.total_visits > 0 : true));

  const now = new Date();
  const { end: monthEnd, start: monthStart } = getMonthRange(now);
  const monthlyTransactions = transactions.filter((transaction) => {
    const createdAt = new Date(transaction.created_at);
    return createdAt >= monthStart && createdAt <= monthEnd;
  });
  const monthlyCustomerIds = new Set(monthlyTransactions.map((transaction) => transaction.customer_id));

  return {
    customers: sortCustomers(customers, filters.sort ?? "newest"),
    metrics: {
      customersThisMonth: monthlyCustomerIds.size,
      newCustomersThisMonth: customers.filter((customer) => {
        const createdAt = new Date(customer.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      }).length,
      repeatCustomers: customers.filter((customer) => customer.total_visits > 1).length,
      spendingThisMonth: monthlyTransactions.reduce(
        (sum, transaction) => sum + toNumber(transaction.total_amount),
        0,
      ),
      totalCustomers: customers.length,
    } satisfies CustomerSummaryMetrics,
  };
}

export async function getCustomerById({
  businessId,
  customerId,
  role,
}: {
  businessId: string;
  customerId: string;
  role: AppRole;
}): Promise<CustomerDetail> {
  const supabase = await createSupabaseServerClient();
  const [{ data: customerData, error: customerError }, transactionsResult] = await Promise.all([
    supabase.from("customers").select("*").eq("id", customerId).maybeSingle(),
    (() => {
      let query = supabase
        .from("transactions")
        .select(
          `
            *,
            business:businesses(id, name, slug, theme),
            transaction_services(*),
            transaction_products(*)
          `,
        )
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (role !== "owner") {
        query = query.eq("business_id", businessId);
      }

      return query;
    })(),
  ]);

  if (customerError) throw new Error(customerError.message);
  if (transactionsResult.error) throw new Error(transactionsResult.error.message);
  if (!customerData) notFound();

  const transactions = await hydrateCustomerTransactions(
    supabase,
    (transactionsResult.data ?? []) as unknown as CustomerTransaction[],
  );

  if (role !== "owner" && transactions.length === 0) {
    notFound();
  }

  const aggregate = aggregateCustomer(customerData as CustomerRow, transactions);
  const favoriteProduct = mostFrequent(
    transactions.flatMap((transaction) =>
      transaction.transaction_products.map((product) => product.product_name_snapshot),
    ),
  );

  return {
    ...aggregate,
    favorite_product: favoriteProduct,
    transactions: transactions.map((transaction) => ({
      ...transaction,
      payment_method: transaction.payment_method as PaymentMethod,
      product_summary: transaction.transaction_products.length
        ? transaction.transaction_products
            .map((product) => `${product.product_name_snapshot} x${product.qty}`)
            .join(", ")
        : "-",
      service_summary: transaction.transaction_services.length
        ? transaction.transaction_services
            .map((service) => `${service.service_name_snapshot} oleh ${getServiceEmployeeNames(service)}`)
            .join(", ")
        : "-",
    })),
  };
}

async function hydrateCustomerTransactions(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  transactions: CustomerTransaction[],
) {
  const services = await attachTransactionServiceEmployees(
    supabase,
    transactions.flatMap((transaction) => transaction.transaction_services ?? []),
  );
  const servicesById = new Map(services.map((service) => [service.id, service]));

  return transactions.map((transaction) => ({
    ...transaction,
    transaction_services: (transaction.transaction_services ?? []).map(
      (service) => servicesById.get(service.id) ?? service,
    ),
  }));
}
