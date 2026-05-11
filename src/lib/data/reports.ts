import type {
  AppRole,
  CommissionByEmployeeRow,
  FinancialReportData,
  PaymentMethodBreakdownRow,
  RevenueByBusinessRow,
  TopEmployeeRow,
  TopServiceRow,
} from "@/lib/types/app";
import { toNumber } from "@/lib/utils/currency";
import { getServiceEmployeeSplits } from "@/lib/utils/transaction-services";

import { getAnalyticsExpenses, getAnalyticsTransactions } from "./reporting";

function sortByNumberDesc<T>(rows: T[], selector: (row: T) => number) {
  return [...rows].sort((left, right) => selector(right) - selector(left));
}

export async function getFinancialReport({
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
  const [transactions, expenses] = await Promise.all([
    getAnalyticsTransactions({
      businessId,
      endDate,
      role,
      scope,
      startDate,
    }),
    getAnalyticsExpenses({
      businessId,
      endDate,
      role,
      scope,
      startDate,
    }),
  ]);

  const paymentMethodMap = new Map<string, PaymentMethodBreakdownRow>();
  const revenueByBusinessMap = new Map<string, RevenueByBusinessRow>();
  const commissionByEmployeeMap = new Map<string, CommissionByEmployeeRow>();
  const topServicesMap = new Map<string, TopServiceRow>();
  const topEmployeesMap = new Map<string, TopEmployeeRow>();

  transactions.forEach((transaction) => {
    const businessIdKey = transaction.business_id;
    const businessNameValue = transaction.business?.name ?? businessName;
    const paymentMethod = transaction.payment_method as PaymentMethodBreakdownRow["method"];

    const paymentMethodRow = paymentMethodMap.get(paymentMethod) ?? {
      method: paymentMethod,
      totalAmount: 0,
      totalTransactions: 0,
    };

    paymentMethodRow.totalAmount += toNumber(transaction.total_amount);
    paymentMethodRow.totalTransactions += 1;
    paymentMethodMap.set(paymentMethod, paymentMethodRow);

    const revenueRow = revenueByBusinessMap.get(businessIdKey) ?? {
      businessId: businessIdKey,
      businessName: businessNameValue,
      totalRevenue: 0,
      totalTransactions: 0,
    };

    revenueRow.totalRevenue += toNumber(transaction.total_amount);
    revenueRow.totalTransactions += 1;
    revenueByBusinessMap.set(businessIdKey, revenueRow);

    transaction.transaction_services.forEach((serviceRow) => {
      getServiceEmployeeSplits(serviceRow).forEach((employee) => {
        const commissionKey = `${businessIdKey}:${employee.employee_id}`;
        const commissionRow = commissionByEmployeeMap.get(commissionKey) ?? {
          businessId: businessIdKey,
          businessName: businessNameValue,
          employeeId: employee.employee_id,
          employeeName: employee.employee_name_snapshot,
          handledRevenue: 0,
          handledServices: 0,
          totalCommission: 0,
        };

        commissionRow.handledRevenue += toNumber(employee.split_base_amount);
        commissionRow.handledServices += 1;
        commissionRow.totalCommission += toNumber(employee.commission_amount);
        commissionByEmployeeMap.set(commissionKey, commissionRow);
      });

      const serviceKey = `${businessIdKey}:${serviceRow.service_name_snapshot}`;
      const serviceReportRow = topServicesMap.get(serviceKey) ?? {
        businessId: businessIdKey,
        businessName: businessNameValue,
        serviceName: serviceRow.service_name_snapshot,
        totalRevenue: 0,
        totalServices: 0,
      };

      serviceReportRow.totalRevenue += toNumber(serviceRow.price_snapshot);
      serviceReportRow.totalServices += 1;
      topServicesMap.set(serviceKey, serviceReportRow);

      getServiceEmployeeSplits(serviceRow).forEach((employee) => {
        const employeeKey = `${businessIdKey}:${employee.employee_id}`;
        const employeeRow = topEmployeesMap.get(employeeKey) ?? {
          businessId: businessIdKey,
          businessName: businessNameValue,
          employeeId: employee.employee_id,
          employeeName: employee.employee_name_snapshot,
          handledRevenue: 0,
          handledServices: 0,
          totalCommission: 0,
        };

        employeeRow.handledRevenue += toNumber(employee.split_base_amount);
        employeeRow.handledServices += 1;
        employeeRow.totalCommission += toNumber(employee.commission_amount);
        topEmployeesMap.set(employeeKey, employeeRow);
      });
    });
  });

  const totalExpenses = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const grossRevenue = transactions.reduce(
    (sum, transaction) => sum + toNumber(transaction.total_amount),
    0,
  );
  const totalCommission = transactions.reduce(
    (sum, transaction) => sum + toNumber(transaction.total_commission),
    0,
  );
  const totalServicesHandled = transactions.reduce(
    (sum, transaction) => sum + transaction.service_count,
    0,
  );

  return {
    commissionByEmployee: sortByNumberDesc(
      Array.from(commissionByEmployeeMap.values()),
      (row) => row.totalCommission,
    ),
    endDate,
    expenses,
    paymentMethodBreakdown: sortByNumberDesc(
      Array.from(paymentMethodMap.values()),
      (row) => row.totalAmount,
    ),
    revenueByBusiness: sortByNumberDesc(
      Array.from(revenueByBusinessMap.values()),
      (row) => row.totalRevenue,
    ),
    scopeLabel: scope === "combined" ? "Semua Bisnis" : businessName,
    startDate,
    summary: {
      estimatedNetProfit: grossRevenue - totalCommission - totalExpenses,
      grossRevenue,
      totalCommission,
      totalExpenses,
      totalServicesHandled,
      totalTransactions: transactions.length,
    },
    topEmployees: sortByNumberDesc(
      Array.from(topEmployeesMap.values()),
      (row) => row.handledRevenue,
    ).slice(0, 10),
    topServices: sortByNumberDesc(
      Array.from(topServicesMap.values()),
      (row) => row.totalRevenue,
    ).slice(0, 10),
    transactions,
  } satisfies FinancialReportData;
}
