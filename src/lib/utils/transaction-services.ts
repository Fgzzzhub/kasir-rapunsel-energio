import type { TransactionServiceEmployeeRow, TransactionServiceRow } from "@/lib/types/app";
import { toNumber } from "@/lib/utils/currency";

export type ServiceWithEmployees = Pick<
  TransactionServiceRow,
  | "commission_amount"
  | "commission_rate_snapshot"
  | "employee_id"
  | "employee_name_snapshot"
  | "id"
  | "price_snapshot"
  | "total_commission_amount"
> & {
  created_at?: string;
  transaction_service_employees?: TransactionServiceEmployeeRow[];
};

export function getServiceEmployeeSplits(service: ServiceWithEmployees) {
  const splitRows = service.transaction_service_employees ?? [];

  if (splitRows.length > 0) {
    return splitRows;
  }

  if (!service.employee_id || !service.employee_name_snapshot) {
    return [];
  }

  return [
    {
      commission_amount: toNumber(service.commission_amount),
      commission_rate_snapshot: toNumber(service.commission_rate_snapshot),
      created_at: service.created_at ?? new Date(0).toISOString(),
      employee_id: service.employee_id,
      employee_name_snapshot: service.employee_name_snapshot,
      id: `${service.id}:legacy:${service.employee_id}`,
      split_base_amount: toNumber(service.price_snapshot),
      split_percentage: 100,
      split_type: "equal",
      transaction_service_id: service.id,
    } satisfies TransactionServiceEmployeeRow,
  ];
}

export function getServiceEmployeeNames(service: ServiceWithEmployees) {
  const names = getServiceEmployeeSplits(service).map((employee) => employee.employee_name_snapshot);

  return names.length ? names.join(", ") : "-";
}

export function getEffectiveCommissionRate(employee: TransactionServiceEmployeeRow) {
  return (toNumber(employee.commission_rate_snapshot) * toNumber(employee.split_percentage)) / 100;
}

export function formatCommissionRate(rate: number) {
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function getServiceTotalCommission(service: ServiceWithEmployees) {
  const splitRows = getServiceEmployeeSplits(service);

  if (splitRows.length > 0) {
    return splitRows.reduce((sum, employee) => sum + toNumber(employee.commission_amount), 0);
  }

  return toNumber(service.total_commission_amount ?? service.commission_amount);
}
