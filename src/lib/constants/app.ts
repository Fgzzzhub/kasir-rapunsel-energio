import type {
  AppRole,
  BusinessSlug,
  ExpenseCategory,
  PaymentMethod,
  SalaryAdjustmentType,
} from "@/lib/types/app";

export const APP_NAME = "Rapunsel & Energio Manager";

export const BUSINESS_COOKIE_NAME = "selected-business-slug";

export const DEFAULT_BUSINESS_SLUG: BusinessSlug = "rapunsel-salon";

export function isRapunselBusiness(slug: string | undefined | null) {
  return slug === "rapunsel-salon";
}

export const PAYMENT_METHOD_OPTIONS: Array<{
  label: string;
  value: PaymentMethod;
}> = [
  { label: "Cash", value: "cash" },
  { label: "Transfer", value: "transfer" },
  { label: "QRIS", value: "qris" },
  { label: "Lainnya", value: "other" },
];

export const EXPENSE_CATEGORY_OPTIONS: Array<{
  label: string;
  value: ExpenseCategory;
}> = [
  { label: "Sewa tempat", value: "rent" },
  { label: "Listrik", value: "electricity" },
  { label: "Air", value: "water" },
  { label: "Gaji", value: "salary" },
  { label: "Perlengkapan", value: "supplies" },
  { label: "Perawatan", value: "maintenance" },
  { label: "Operasional", value: "operational" },
  { label: "Lainnya", value: "other" },
];

export const SALARY_ADJUSTMENT_TYPE_OPTIONS: Array<{
  label: string;
  value: SalaryAdjustmentType;
}> = [
  { label: "Bonus", value: "bonus" },
  { label: "Potongan", value: "deduction" },
];

export const APP_NAVIGATION: Array<{
  href: string;
  icon: string;
  label: string;
  roles: AppRole[];
  businesses?: BusinessSlug[]; // If undefined, available to all businesses
}> = [
  { href: "/dashboard", icon: "LayoutDashboard", label: "Dashboard", roles: ["owner", "admin"] },
  { href: "/transactions", icon: "Receipt", label: "Transaksi", roles: ["owner", "admin"] },
  { href: "/tutup-kasir", icon: "Lock", label: "Tutup Kasir", roles: ["owner", "admin"] },
  { href: "/customers", icon: "Users", label: "Data Customer", roles: ["owner", "admin"] },
  { href: "/attendance", icon: "CalendarCheck", label: "Absensi", roles: ["owner", "admin"] },
  { href: "/services", icon: "Scissors", label: "Layanan", roles: ["owner", "admin"] },
  { href: "/products", icon: "Package", label: "Produk", roles: ["owner", "admin"], businesses: ["rapunsel-salon"] },
  { href: "/inventory", icon: "Warehouse", label: "Inventory", roles: ["owner", "admin"] },
  { href: "/employees", icon: "UserCog", label: "Karyawan", roles: ["owner"] },
  { href: "/expenses", icon: "Wallet", label: "Pengeluaran", roles: ["owner"] },
  { href: "/payroll", icon: "BadgeDollarSign", label: "Payroll", roles: ["owner"] },
  { href: "/reports", icon: "BarChart3", label: "Laporan", roles: ["owner"] },
  { href: "/settings", icon: "Settings", label: "Pengaturan", roles: ["owner"] },
];
