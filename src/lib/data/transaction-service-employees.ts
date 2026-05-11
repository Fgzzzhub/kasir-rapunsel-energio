import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TransactionServiceEmployeeRow, TransactionServiceRow } from "@/lib/types/app";

export type TransactionServiceWithEmployees = TransactionServiceRow & {
  transaction_service_employees?: TransactionServiceEmployeeRow[];
};

function withEmptyEmployeeSplits(services: TransactionServiceRow[]) {
  return services.map((service) => ({
    ...service,
    transaction_service_employees: [],
  }));
}

function isMissingTransactionServiceEmployeesTable(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.message?.includes("transaction_service_employees") ||
    false
  );
}

export async function attachTransactionServiceEmployees(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  services: TransactionServiceRow[],
): Promise<TransactionServiceWithEmployees[]> {
  const serviceIds = services.map((service) => service.id);

  if (!serviceIds.length) {
    return withEmptyEmployeeSplits(services);
  }

  const { data, error } = await supabase
    .from("transaction_service_employees")
    .select("*")
    .in("transaction_service_id", serviceIds);

  if (error && isMissingTransactionServiceEmployeesTable(error)) {
    return withEmptyEmployeeSplits(services);
  }

  if (error) {
    throw new Error(error.message);
  }

  const employeesByServiceId = new Map<string, TransactionServiceEmployeeRow[]>();

  ((data ?? []) as TransactionServiceEmployeeRow[]).forEach((employee) => {
    const current = employeesByServiceId.get(employee.transaction_service_id) ?? [];
    current.push(employee);
    employeesByServiceId.set(employee.transaction_service_id, current);
  });

  return services.map((service) => ({
    ...service,
    transaction_service_employees: employeesByServiceId.get(service.id) ?? [],
  }));
}
