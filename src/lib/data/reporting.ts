import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AppBusiness,
  AppRole,
  ExpenseListItem,
  TransactionListItem,
  TransactionProductRow,
  TransactionRow,
  TransactionServiceRow,
} from "@/lib/types/app";
import { toNumber } from "@/lib/utils/currency";
import { getServiceTotalCommission } from "@/lib/utils/transaction-services";

import { attachTransactionServiceEmployees } from "./transaction-service-employees";

type AnalyticsFilters = {
  businessId: string;
  endDate: string;
  role: AppRole;
  scope?: "selected" | "combined";
  startDate: string;
};

type AnalyticsTransactionRecord = TransactionRow & {
  business: Pick<AppBusiness, "name" | "slug" | "theme"> | null;
  transaction_services: TransactionServiceRow[];
  transaction_products: TransactionProductRow[];
};

export async function getAnalyticsTransactions({
  businessId,
  endDate,
  role,
  scope = "selected",
  startDate,
}: AnalyticsFilters) {
  const supabase = await createSupabaseServerClient();
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
    .gte("created_at", `${startDate}T00:00:00`)
    .lte("created_at", `${endDate}T23:59:59`)
    .order("created_at", { ascending: false });

  if (!(role === "owner" && scope === "combined")) {
    query = query.eq("business_id", businessId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const transactions = (data ?? []) as unknown as AnalyticsTransactionRecord[];
  const services = await attachTransactionServiceEmployees(
    supabase,
    transactions.flatMap((transaction) => transaction.transaction_services ?? []),
  );
  const servicesById = new Map(services.map((service) => [service.id, service]));

  return transactions.map((transaction): TransactionListItem => {
    const transactionServices = (transaction.transaction_services ?? []).map(
      (service) => servicesById.get(service.id) ?? service,
    );

    return {
      ...transaction,
      transaction_services: transactionServices,
      service_count: transactionServices.length,
      product_count: transaction.transaction_products?.length ?? 0,
      total_commission: transactionServices.reduce(
        (sum, item) => sum + getServiceTotalCommission(item),
        0,
      ) + (transaction.transaction_products ?? []).reduce(
        (sum, item) => sum + toNumber(item.commission_amount),
        0,
      ),
    };
  });
}

export async function getAnalyticsExpenses({
  businessId,
  endDate,
  role,
  scope = "selected",
  startDate,
}: AnalyticsFilters) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("expenses")
    .select("*, business:businesses(id, name, slug, theme)")
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (!(role === "owner" && scope === "combined")) {
    query = query.eq("business_id", businessId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ExpenseListItem[];
}

export async function getBusinesses() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AppBusiness[];
}
