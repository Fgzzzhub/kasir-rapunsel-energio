import type { Database } from "@/lib/types/database";

export type AppRole = "owner" | "admin";

export type BusinessSlug = "rapunsel-salon" | "energio-reflexologi";

export type BusinessTheme = "soft" | "green";

export type PaymentMethod = "cash" | "transfer" | "qris" | "other";

export type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
export type BusinessSettingsRow = Database["public"]["Tables"]["business_settings"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
export type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionServiceRow =
  Database["public"]["Tables"]["transaction_services"]["Row"];
export type TransactionServiceEmployeeRow =
  Database["public"]["Tables"]["transaction_service_employees"]["Row"];
export type AttendanceRecordRow =
  Database["public"]["Tables"]["attendance_records"]["Row"];
export type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
export type SalaryAdjustmentRow =
  Database["public"]["Tables"]["salary_adjustments"]["Row"];
export type SyncLogRow = Database["public"]["Tables"]["sync_logs"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type TransactionProductRow =
  Database["public"]["Tables"]["transaction_products"]["Row"];
export type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];
export type StockMovementRow = Database["public"]["Tables"]["stock_movements"]["Row"];
export type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];
export type PayrollPeriodRow = Database["public"]["Tables"]["payroll_periods"]["Row"];
export type CashDrawerSessionRow = Database["public"]["Tables"]["cash_drawer_sessions"]["Row"];

export type ExpenseCategory =
  | "rent"
  | "electricity"
  | "water"
  | "salary"
  | "supplies"
  | "maintenance"
  | "operational"
  | "other";

export type SalaryAdjustmentType = "bonus" | "deduction";
export type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "sick" | "leave";

export type AppBusiness = BusinessRow & {
  slug: BusinessSlug;
  theme: BusinessTheme;
};

export type AppProfile = ProfileRow & {
  role: AppRole;
};

export type SelectedBusinessContext = {
  businesses: AppBusiness[];
  selectedBusiness: AppBusiness;
  theme: BusinessTheme;
};

export type AuthenticatedSessionContext = SelectedBusinessContext & {
  isConfigured: true;
  profile: AppProfile;
  user: {
    id: string;
    email?: string;
  };
};

export type UnauthenticatedSessionContext = {
  businesses: AppBusiness[];
  isConfigured: boolean;
  profile: null;
  selectedBusiness: AppBusiness | null;
  theme: BusinessTheme;
  user: null;
};

export type IncompleteProfileSessionContext = {
  businesses: AppBusiness[];
  isConfigured: true;
  profile: null;
  selectedBusiness: AppBusiness;
  theme: BusinessTheme;
  user: {
    id: string;
    email?: string;
  };
};

export type SessionContext =
  | AuthenticatedSessionContext
  | IncompleteProfileSessionContext
  | UnauthenticatedSessionContext;

export type ServiceMutationPayload = {
  businessId: string;
  name: string;
  description?: string;
  durationMinutes?: number | null;
  isActive?: boolean;
  price: number;
};

export type ProductMutationPayload = {
  businessId: string;
  name: string;
  category?: string | null;
  sku?: string | null;
  description?: string | null;
  isActive?: boolean;
  price: number;
};

export type EmployeeMutationPayload = {
  baseSalary: number;
  businessId: string;
  commissionRate: number;
  isActive?: boolean;
  name: string;
  phone?: string;
  position?: string;
};

export type TransactionServiceInput = {
  employeeIds: string[];
  serviceId: string;
  finalPrice?: number | null;
  priceAdjustmentReason?: string;
};

export type TransactionProductInput = {
  productId: string;
  qty: number;
};

export type CreateTransactionPayload = {
  businessId: string;
  customerName: string;
  customerPhone?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  services: TransactionServiceInput[];
  products: TransactionProductInput[];
};

export type TransactionSummary = {
  businessId: string;
  businessName: string;
  createdAt: string;
  customerName: string;
  customerPhone: string | null;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  totalCommission: number;
  transactionId: string;
};

export type TransactionListItem = TransactionRow & {
  business: Pick<BusinessRow, "name" | "slug" | "theme"> | null;
  service_count: number;
  product_count: number;
  total_commission: number;
  transaction_services: Array<
    Pick<
      TransactionServiceRow,
      | "id"
      | "commission_amount"
      | "commission_rate_snapshot"
      | "employee_id"
      | "employee_name_snapshot"
      | "price_snapshot"
      | "original_price_snapshot"
      | "price_adjustment_amount"
      | "price_adjustment_reason"
      | "service_name_snapshot"
      | "total_commission_amount"
    >
    & {
      transaction_service_employees?: TransactionServiceEmployeeRow[];
    }
  >;
  transaction_products: Array<
    Pick<
      TransactionProductRow,
      | "id"
      | "product_name_snapshot"
      | "qty"
      | "price_snapshot"
      | "subtotal"
    >
  >;
};

export type ExpenseListItem = ExpenseRow & {
  business: Pick<BusinessRow, "id" | "name" | "slug" | "theme"> | null;
};

export type ExpenseMutationPayload = {
  amount: number;
  businessId: string;
  category: ExpenseCategory;
  expenseDate: string;
  name: string;
  notes?: string;
};

export type SalaryAdjustmentMutationPayload = {
  adjustmentDate: string;
  amount: number;
  businessId: string;
  employeeId: string;
  notes?: string;
  type: SalaryAdjustmentType;
};

export type AttendanceMutationPayload = {
  attendanceDate: string;
  businessId: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  deductionAmount: number;
  employeeId: string;
  mealAllowanceAmount: number;
  mealAllowanceEligible: boolean;
  notes?: string | null;
  status: AttendanceStatus;
};

export type AttendanceListItem = AttendanceRecordRow & {
  business: Pick<BusinessRow, "id" | "name" | "slug" | "theme"> | null;
  employee: Pick<EmployeeRow, "id" | "name"> | null;
};

export type AttendanceEmployeeSummary = {
  absentDays: number;
  employeeId: string;
  employeeName: string;
  halfDays: number;
  lateDays: number;
  leaveDays: number;
  presentDays: number;
  sickDays: number;
  totalAttendanceDeduction: number;
  totalMealAllowance: number;
};

export type PayrollCommissionItem = {
  businessId: string;
  businessName: string;
  commissionAmount: number;
  commissionRate: number;
  customerName: string;
  paymentMethod: PaymentMethod;
  price: number;
  splitPercentage?: number | null;
  serviceName: string;
  transactionCreatedAt: string;
  transactionId: string;
};

export type SalaryAdjustmentListItem = SalaryAdjustmentRow & {
  business_name: string;
  employee_name: string;
};

export type PayrollEmployeeSummary = {
  adjustments: SalaryAdjustmentListItem[];
  baseSalary: number;
  businessId: string;
  businessName: string;
  commissionItems: PayrollCommissionItem[];
  employeeId: string;
  employeeName: string;
  netSalary: number;
  totalAbsentDays: number;
  totalAttendanceDeduction: number;
  totalBonus: number;
  totalCommission: number;
  totalDeduction: number;
  totalHandledServiceAmount: number;
  totalMealAllowance: number;
  totalPresentDays: number;
};

export type PayrollTotals = {
  totalBaseSalary: number;
  totalBonus: number;
  totalCommission: number;
  totalDeduction: number;
  totalMealAllowance: number;
  totalPayrollCost: number;
};

export type PayrollReportData = {
  adjustments: SalaryAdjustmentListItem[];
  employees: PayrollEmployeeSummary[];
  endDate: string;
  scopeLabel: string;
  startDate: string;
  summary: PayrollTotals;
};

export type PaymentMethodBreakdownRow = {
  method: PaymentMethod;
  totalAmount: number;
  totalTransactions: number;
};

export type RevenueByBusinessRow = {
  businessId: string;
  businessName: string;
  totalRevenue: number;
  totalTransactions: number;
};

export type CommissionByEmployeeRow = {
  businessId: string;
  businessName: string;
  employeeId: string;
  employeeName: string;
  handledRevenue: number;
  handledServices: number;
  totalCommission: number;
};

export type TopServiceRow = {
  businessId: string;
  businessName: string;
  serviceName: string;
  totalRevenue: number;
  totalServices: number;
};

export type TopEmployeeRow = {
  businessId: string;
  businessName: string;
  employeeId: string;
  employeeName: string;
  handledRevenue: number;
  handledServices: number;
  totalCommission: number;
};

export type FinancialReportSummary = {
  estimatedNetProfit: number;
  grossRevenue: number;
  totalCommission: number;
  totalExpenses: number;
  totalServicesHandled: number;
  totalTransactions: number;
};

export type FinancialReportData = {
  commissionByEmployee: CommissionByEmployeeRow[];
  endDate: string;
  expenses: ExpenseListItem[];
  paymentMethodBreakdown: PaymentMethodBreakdownRow[];
  revenueByBusiness: RevenueByBusinessRow[];
  scopeLabel: string;
  startDate: string;
  summary: FinancialReportSummary;
  topEmployees: TopEmployeeRow[];
  topServices: TopServiceRow[];
  transactions: TransactionListItem[];
};
