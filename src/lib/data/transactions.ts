import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AppRole,
  EmployeeRow,
  ServiceRow,
  TransactionListItem,
  TransactionProductRow,
  TransactionRow,
  TransactionServiceRow,
  ProductRow,
} from "@/lib/types/app";
import { getServiceEmployeeSplits, getServiceTotalCommission } from "@/lib/utils/transaction-services";

import { attachTransactionServiceEmployees } from "./transaction-service-employees";

type TransactionRecord = TransactionRow & {
  business: {
    name: string;
    slug: string;
    theme: string;
  } | null;
  transaction_services: TransactionServiceRow[];
  transaction_products: TransactionProductRow[];
};

export async function getTransactionFormOptions(businessId: string, businessSlug: string) {
  const supabase = await createSupabaseServerClient();
  const supportsProducts = businessSlug === "rapunsel-salon";
  const [
    { data: servicesData, error: servicesError }, 
    { data: employeesData, error: employeesError },
    { data: productsData, error: productsError }
  ] = await Promise.all([
      supabase
        .from("services")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("employees")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name"),
      supportsProducts
        ? supabase
            .from("products")
            .select("*")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .order("name")
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (servicesError) throw new Error(servicesError.message);
  if (employeesError) throw new Error(employeesError.message);
  if (productsError) throw new Error(productsError.message);

  return {
    employees: (employeesData ?? []) as EmployeeRow[],
    services: (servicesData ?? []) as ServiceRow[],
    products: (productsData ?? []) as ProductRow[],
  };
}

export async function getTransactions({
  businessId,
  employeeId,
  endDate,
  paymentMethod,
  role,
  scope = "selected",
  search,
  startDate,
}: {
  businessId: string;
  employeeId?: string;
  endDate?: string;
  paymentMethod?: string;
  role: AppRole;
  scope?: "selected" | "combined";
  search?: string;
  startDate?: string;
}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("transactions")
    .select(
      `
        *,
        business:businesses(name, slug, theme),
        transaction_services(*),
        transaction_products(*)
      `,
    )
    .order("created_at", { ascending: false });

  if (!(role === "owner" && scope === "combined")) {
    query = query.eq("business_id", businessId);
  }

  if (startDate) {
    query = query.gte("created_at", `${startDate}T00:00:00`);
  }

  if (endDate) {
    query = query.lte("created_at", `${endDate}T23:59:59`);
  }

  if (paymentMethod) {
    query = query.eq("payment_method", paymentMethod);
  }

  if (search?.trim()) {
    query = query.ilike("customer_name", `%${search.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const transactions = (data ?? []) as unknown as TransactionRecord[];
  const services = await attachTransactionServiceEmployees(
    supabase,
    transactions.flatMap((transaction) => transaction.transaction_services ?? []),
  );
  const servicesById = new Map(services.map((service) => [service.id, service]));

  return transactions
    .map((transaction) => ({
      ...transaction,
      transaction_services: (transaction.transaction_services ?? []).map(
        (service) => servicesById.get(service.id) ?? service,
      ),
    }))
    .filter((transaction) =>
      employeeId
        ? transaction.transaction_services.some((item) =>
            getServiceEmployeeSplits(item).some((employee) => employee.employee_id === employeeId),
          )
        : true,
    )
    .map(
      (transaction): TransactionListItem => ({
        ...transaction,
        service_count: transaction.transaction_services?.length ?? 0,
        product_count: transaction.transaction_products?.length ?? 0,
        total_commission: (transaction.transaction_services ?? []).reduce(
          (sum, item) => sum + getServiceTotalCommission(item),
          0,
        ),
      }),
    );
}

export async function getTransactionById({
  businessId,
  id,
  role,
}: {
  businessId: string;
  id: string;
  role: AppRole;
}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("transactions")
    .select(
      `
        *,
        business:businesses(name, slug, theme),
        transaction_services(*),
        transaction_products(*)
      `,
    )
    .eq("id", id);

  if (role !== "owner") {
    query = query.eq("business_id", businessId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  const transaction = data as unknown as TransactionRecord;
  const services = await attachTransactionServiceEmployees(
    supabase,
    transaction.transaction_services ?? [],
  );

  return {
    ...transaction,
    transaction_services: services,
  };
}
