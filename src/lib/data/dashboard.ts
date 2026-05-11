import { getMonthRange } from "@/lib/utils/date";
import { toNumber } from "@/lib/utils/currency";
import { getServiceEmployeeSplits, getServiceTotalCommission } from "@/lib/utils/transaction-services";

import { createSupabaseServerClient } from "../supabase/server";
import type {
  AppBusiness,
  AppRole,
  TransactionProductRow,
  TransactionRow,
  TransactionServiceRow,
} from "../types/app";

import { getBusinesses } from "./reporting";
import { attachTransactionServiceEmployees } from "./transaction-service-employees";

type DashboardTransaction = TransactionRow & {
  business: Pick<AppBusiness, "name" | "slug" | "theme"> | null;
  transaction_products: TransactionProductRow[];
  transaction_services: TransactionServiceRow[];
};

export async function getDashboardMetrics({
  businessId,
  role,
  scope = "selected",
}: {
  businessId: string;
  role: AppRole;
  scope?: "selected" | "combined";
}) {
  const supabase = await createSupabaseServerClient();
  const today = new Date();
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);
  const { end: monthEnd, start: monthStart } = getMonthRange(today);

  let monthlyQuery = supabase
    .from("transactions")
    .select("*, business:businesses(name, slug, theme), transaction_services(*), transaction_products(*)")
    .gte("created_at", monthStart.toISOString())
    .lte("created_at", monthEnd.toISOString());
  let todayQuery = supabase
    .from("transactions")
    .select("*, business:businesses(name, slug, theme), transaction_services(*), transaction_products(*)")
    .gte("created_at", todayStart.toISOString())
    .lte("created_at", todayEnd.toISOString());
  let recentQuery = supabase
    .from("transactions")
    .select("*, business:businesses(name, slug, theme), transaction_services(*), transaction_products(*)")
    .order("created_at", { ascending: false })
    .limit(5);
  let expenseQuery = supabase
    .from("expenses")
    .select("amount, business_id")
    .gte("expense_date", monthStart.toISOString().slice(0, 10))
    .lte("expense_date", monthEnd.toISOString().slice(0, 10));

  if (!(role === "owner" && scope === "combined")) {
    monthlyQuery = monthlyQuery.eq("business_id", businessId);
    todayQuery = todayQuery.eq("business_id", businessId);
    recentQuery = recentQuery.eq("business_id", businessId);
    expenseQuery = expenseQuery.eq("business_id", businessId);
  }

  const [
    { data: monthlyData, error: monthlyError },
    { data: todayData, error: todayError },
    { data: recentData, error: recentError },
    { data: expenseData, error: expenseError },
    businesses,
  ] = await Promise.all([
    monthlyQuery,
    todayQuery,
    recentQuery,
    expenseQuery,
    getBusinesses(),
  ]);

  if (monthlyError) {
    throw new Error(monthlyError.message);
  }

  if (todayError) {
    throw new Error(todayError.message);
  }

  if (recentError) {
    throw new Error(recentError.message);
  }

  if (expenseError) {
    throw new Error(expenseError.message);
  }

  const monthlyTransactions = await hydrateDashboardTransactions(
    supabase,
    (monthlyData ?? []) as unknown as DashboardTransaction[],
  );
  const todayTransactions = await hydrateDashboardTransactions(
    supabase,
    (todayData ?? []) as unknown as DashboardTransaction[],
  );
  const recentTransactions = await hydrateDashboardTransactions(
    supabase,
    (recentData ?? []) as unknown as DashboardTransaction[],
  );
  const monthExpenses = (expenseData ?? []).reduce(
    (sum, item) => sum + toNumber(item.amount),
    0,
  );

  const monthlyCommission = monthlyTransactions.flatMap((item) => item.transaction_services);
  const monthlyProducts = monthlyTransactions.flatMap((item) => item.transaction_products);
  const todayCustomerIds = new Set(todayTransactions.map((item) => item.customer_id).filter(Boolean));
  const monthCustomerIds = new Set(monthlyTransactions.map((item) => item.customer_id).filter(Boolean));
  const visitCounts = new Map<string, number>();
  monthlyTransactions.forEach((transaction) => {
    if (!transaction.customer_id) return;
    visitCounts.set(transaction.customer_id, (visitCounts.get(transaction.customer_id) ?? 0) + 1);
  });
  const bestEmployeesMap = new Map<
    string,
    { employeeName: string; handledRevenue: number; handledServices: number; totalCommission: number }
  >();
  const topServicesMap = new Map<string, { serviceName: string; totalRevenue: number; totalServices: number }>();
  const topProductsMap = new Map<string, { productName: string; totalProducts: number; totalRevenue: number }>();
  const businessMetricsMap = new Map<
    string,
    {
      monthRevenue: number;
      name: string;
      theme: string;
      todayRevenue: number;
      todayTransactionsCount: number;
    }
  >();
  const dashboardBusinesses =
    role === "owner" && scope === "combined"
      ? businesses
      : businesses.filter((business) => business.id === businessId);

  dashboardBusinesses.forEach((business) => {
    businessMetricsMap.set(business.id, {
      monthRevenue: 0,
      name: business.name,
      theme: business.theme,
      todayRevenue: 0,
      todayTransactionsCount: 0,
    });
  });

  monthlyCommission.forEach((item) => {
    getServiceEmployeeSplits(item).forEach((employee) => {
      const current = bestEmployeesMap.get(employee.employee_id) ?? {
        employeeName: employee.employee_name_snapshot,
        handledRevenue: 0,
        handledServices: 0,
        totalCommission: 0,
      };

      current.handledServices += 1;
      current.handledRevenue += toNumber(employee.split_base_amount);
      current.totalCommission += toNumber(employee.commission_amount);
      bestEmployeesMap.set(employee.employee_id, current);
    });

    const service = topServicesMap.get(item.service_id) ?? {
      serviceName: item.service_name_snapshot,
      totalRevenue: 0,
      totalServices: 0,
    };
    service.totalRevenue += toNumber(item.price_snapshot);
    service.totalServices += 1;
    topServicesMap.set(item.service_id, service);
  });

  monthlyProducts.forEach((item) => {
    const product = topProductsMap.get(item.product_id) ?? {
      productName: item.product_name_snapshot,
      totalProducts: 0,
      totalRevenue: 0,
    };
    product.totalProducts += Number(item.qty ?? 0);
    product.totalRevenue += toNumber(item.subtotal);
    topProductsMap.set(item.product_id, product);

    if (item.employee_id && item.employee_name_snapshot) {
      const current = bestEmployeesMap.get(item.employee_id) ?? {
        employeeName: item.employee_name_snapshot,
        handledRevenue: 0,
        handledServices: 0,
        totalCommission: 0,
      };

      current.handledServices += Number(item.qty ?? 0);
      current.handledRevenue += toNumber(item.subtotal);
      current.totalCommission += toNumber(item.commission_amount);
      bestEmployeesMap.set(item.employee_id, current);
    }
  });

  monthlyTransactions.forEach((transaction) => {
    const current = businessMetricsMap.get(transaction.business_id) ?? {
      monthRevenue: 0,
      name: transaction.business?.name ?? "Bisnis tidak diketahui",
      theme: transaction.business?.theme ?? "soft",
      todayRevenue: 0,
      todayTransactionsCount: 0,
    };

    current.monthRevenue += toNumber(transaction.total_amount);
    businessMetricsMap.set(transaction.business_id, current);
  });

  todayTransactions.forEach((transaction) => {
    const current = businessMetricsMap.get(transaction.business_id) ?? {
      monthRevenue: 0,
      name: transaction.business?.name ?? "Bisnis tidak diketahui",
      theme: transaction.business?.theme ?? "soft",
      todayRevenue: 0,
      todayTransactionsCount: 0,
    };

    current.todayRevenue += toNumber(transaction.total_amount);
    current.todayTransactionsCount += 1;
    businessMetricsMap.set(transaction.business_id, current);
  });

  const monthRevenue = monthlyTransactions.reduce(
    (sum, item) => sum + toNumber(item.total_amount),
    0,
  );
  const monthCommission = monthlyCommission.reduce(
    (sum, item) => sum + getServiceTotalCommission(item),
    0,
  ) + monthlyProducts.reduce((sum, item) => sum + toNumber(item.commission_amount), 0);

  return {
    bestEmployees: Array.from(bestEmployeesMap.values())
      .sort((left, right) => right.totalCommission - left.totalCommission)
      .slice(0, 5),
    estimatedMonthNetProfit: monthRevenue - monthCommission - monthExpenses,
    monthCommission,
    monthExpenses,
    monthRevenue,
    repeatCustomersThisMonth: Array.from(visitCounts.values()).filter((visits) => visits > 1).length,
    perBusiness: Array.from(businessMetricsMap.entries()).map(([id, metrics]) => ({
      businessId: id,
      monthRevenue: metrics.monthRevenue,
      name: metrics.name,
      theme: metrics.theme,
      todayRevenue: metrics.todayRevenue,
      todayTransactionsCount: metrics.todayTransactionsCount,
    })),
    recentTransactions,
    todayCustomersCount: todayCustomerIds.size,
    todayRevenue: todayTransactions.reduce(
      (sum, item) => sum + toNumber(item.total_amount),
      0,
    ),
    todayTransactionsCount: todayTransactions.length,
    topProducts: Array.from(topProductsMap.values())
      .sort((left, right) => right.totalProducts - left.totalProducts)
      .slice(0, 5),
    topServices: Array.from(topServicesMap.values())
      .sort((left, right) => right.totalServices - left.totalServices)
      .slice(0, 5),
    monthCustomersCount: monthCustomerIds.size,
  };
}

async function hydrateDashboardTransactions(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  transactions: DashboardTransaction[],
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
