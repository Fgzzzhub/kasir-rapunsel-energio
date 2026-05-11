import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AppRole,
  EmployeeRow,
  PayrollCommissionItem,
  PayrollEmployeeSummary,
  PayrollReportData,
  SalaryAdjustmentRow,
  TransactionRow,
  TransactionServiceRow,
} from "@/lib/types/app";
import { toNumber } from "@/lib/utils/currency";
import {
  getEffectiveCommissionRate,
  getServiceEmployeeSplits,
  type ServiceWithEmployees,
} from "@/lib/utils/transaction-services";

import { getBusinesses } from "./reporting";
import { attachTransactionServiceEmployees } from "./transaction-service-employees";

type PayrollTransactionRecord = TransactionRow & {
  business: {
    name: string;
    slug: string;
    theme: string;
  } | null;
};

function buildScopeLabel({
  businessName,
  scope,
}: {
  businessName: string;
  scope: "selected" | "combined";
}) {
  return scope === "combined" ? "Semua Bisnis" : businessName;
}

export async function getPayrollReport({
  businessId,
  businessName,
  endDate,
  role,
  scope = "selected",
  startDate,
}: {
  businessId: string;
  businessName: string;
  endDate: string;
  role: AppRole;
  scope?: "selected" | "combined";
  startDate: string;
}) {
  const supabase = await createSupabaseServerClient();
  let employeesQuery = supabase.from("employees").select("*").order("name");
  let adjustmentsQuery = supabase
    .from("salary_adjustments")
    .select("*")
    .gte("adjustment_date", startDate)
    .lte("adjustment_date", endDate)
    .order("adjustment_date", { ascending: false })
    .order("created_at", { ascending: false });
  let transactionsQuery = supabase
    .from("transactions")
    .select("*, business:businesses(name, slug, theme)")
    .gte("created_at", `${startDate}T00:00:00`)
    .lte("created_at", `${endDate}T23:59:59`)
    .order("created_at", { ascending: false });
  let attendanceQuery = supabase
    .from("attendance_records")
    .select("*")
    .gte("attendance_date", startDate)
    .lte("attendance_date", endDate);

  if (!(role === "owner" && scope === "combined")) {
    employeesQuery = employeesQuery.eq("business_id", businessId);
    adjustmentsQuery = adjustmentsQuery.eq("business_id", businessId);
    transactionsQuery = transactionsQuery.eq("business_id", businessId);
    attendanceQuery = attendanceQuery.eq("business_id", businessId);
  }

  const [
    { data: employeesData, error: employeesError },
    { data: adjustmentsData, error: adjustmentsError },
    { data: transactionsData, error: transactionsError },
    { data: attendanceData, error: attendanceError },
    businesses,
  ] = await Promise.all([
    employeesQuery,
    adjustmentsQuery,
    transactionsQuery,
    attendanceQuery,
    getBusinesses(),
  ]);

  if (employeesError) {
    throw new Error(employeesError.message);
  }

  if (adjustmentsError) {
    throw new Error(adjustmentsError.message);
  }

  if (transactionsError) {
    throw new Error(transactionsError.message);
  }

  if (attendanceError) {
    throw new Error(attendanceError.message);
  }

  const employees = (employeesData ?? []) as EmployeeRow[];
  const transactions = (transactionsData ?? []) as unknown as PayrollTransactionRecord[];
  const transactionIds = transactions.map((transaction) => transaction.id);

  const { data: serviceRowsData, error: serviceRowsError } = transactionIds.length
    ? await supabase
        .from("transaction_services")
        .select("*")
        .in("transaction_id", transactionIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (serviceRowsError) {
    throw new Error(serviceRowsError.message);
  }

  const serviceRows = (await attachTransactionServiceEmployees(
    supabase,
    (serviceRowsData ?? []) as unknown as TransactionServiceRow[],
  )) as Array<
    ServiceWithEmployees & { service_name_snapshot: string; transaction_id: string }
  >;
  const transactionMap = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const businessMap = new Map(businesses.map((business) => [business.id, business]));

  const adjustments = ((adjustmentsData ?? []) as SalaryAdjustmentRow[]).map(
    (adjustment) => {
      const employee = employees.find((item) => item.id === adjustment.employee_id);
      const business = businessMap.get(adjustment.business_id);

      return {
        ...adjustment,
        business_name: business?.name ?? "Bisnis tidak diketahui",
        employee_name: employee?.name ?? "Karyawan tidak diketahui",
      };
    },
  );

  const employeeMap = new Map<string, PayrollEmployeeSummary>();

  employees.forEach((employee) => {
    const business = businessMap.get(employee.business_id);

    employeeMap.set(employee.id, {
      adjustments: [],
      baseSalary: toNumber(employee.base_salary),
      businessId: employee.business_id,
      businessName: business?.name ?? businessName,
      commissionItems: [],
      employeeId: employee.id,
      employeeName: employee.name,
      netSalary: toNumber(employee.base_salary),
      totalAbsentDays: 0,
      totalAttendanceDeduction: 0,
      totalBonus: 0,
      totalCommission: 0,
      totalDeduction: 0,
      totalHandledServiceAmount: 0,
      totalMealAllowance: 0,
      totalPresentDays: 0,
    });
  });

  (attendanceData ?? []).forEach((record) => {
    const summary = employeeMap.get(record.employee_id);

    if (!summary) {
      return;
    }

    if (record.status === "present" || record.status === "late") {
      summary.totalPresentDays += 1;
    }

    if (record.status === "absent") {
      summary.totalAbsentDays += 1;
    }

    summary.totalMealAllowance += toNumber(record.meal_allowance_amount);
    summary.totalAttendanceDeduction += toNumber(record.deduction_amount);
  });

  serviceRows.forEach((serviceRow) => {
    const transaction = transactionMap.get(serviceRow.transaction_id);

    if (!transaction) {
      return;
    }

    getServiceEmployeeSplits(serviceRow).forEach((employeeSplit) => {
      const summary = employeeMap.get(employeeSplit.employee_id);

      if (!summary) {
        return;
      }

      const commissionItem: PayrollCommissionItem = {
        businessId: transaction.business_id,
        businessName: transaction.business?.name ?? summary.businessName,
        commissionAmount: toNumber(employeeSplit.commission_amount),
        commissionRate: getEffectiveCommissionRate(employeeSplit),
        customerName: transaction.customer_name,
        paymentMethod: transaction.payment_method as PayrollCommissionItem["paymentMethod"],
        price: toNumber(employeeSplit.split_base_amount),
        serviceName: serviceRow.service_name_snapshot,
        splitPercentage: employeeSplit.split_percentage,
        transactionCreatedAt: transaction.created_at,
        transactionId: transaction.id,
      };

      summary.commissionItems.push(commissionItem);
      summary.totalCommission += commissionItem.commissionAmount;
      summary.totalHandledServiceAmount += commissionItem.price;
    });
  });

  adjustments.forEach((adjustment) => {
    const summary = employeeMap.get(adjustment.employee_id);

    if (!summary) {
      return;
    }

    summary.adjustments.push(adjustment);

    if (adjustment.type === "bonus") {
      summary.totalBonus += toNumber(adjustment.amount);
    } else {
      summary.totalDeduction += toNumber(adjustment.amount);
    }
  });

  const payrollEmployees = Array.from(employeeMap.values())
    .map((employee) => ({
      ...employee,
      netSalary:
        employee.baseSalary +
        employee.totalCommission +
        employee.totalBonus -
        employee.totalDeduction +
        employee.totalMealAllowance -
        employee.totalAttendanceDeduction,
    }))
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName, "id-ID"));

  const summary = payrollEmployees.reduce(
    (accumulator, employee) => ({
      totalBaseSalary: accumulator.totalBaseSalary + employee.baseSalary,
      totalBonus: accumulator.totalBonus + employee.totalBonus,
      totalCommission: accumulator.totalCommission + employee.totalCommission,
      totalDeduction: accumulator.totalDeduction + employee.totalDeduction,
      totalMealAllowance: accumulator.totalMealAllowance + employee.totalMealAllowance,
      totalPayrollCost: accumulator.totalPayrollCost + employee.netSalary,
    }),
    {
      totalBaseSalary: 0,
      totalBonus: 0,
      totalCommission: 0,
      totalDeduction: 0,
      totalMealAllowance: 0,
      totalPayrollCost: 0,
    },
  );

  return {
    adjustments,
    employees: payrollEmployees,
    endDate,
    scopeLabel: buildScopeLabel({ businessName, scope }),
    startDate,
    summary,
  } satisfies PayrollReportData;
}
