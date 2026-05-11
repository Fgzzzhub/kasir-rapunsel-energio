import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole, ExpenseListItem } from "@/lib/types/app";
import { toNumber } from "@/lib/utils/currency";

export async function getExpenses({
  businessId,
  endDate,
  role,
  scope = "selected",
  search,
  startDate,
}: {
  businessId: string;
  endDate?: string;
  role: AppRole;
  scope?: "selected" | "combined";
  search?: string;
  startDate?: string;
}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("expenses")
    .select("*, business:businesses(id, name, slug, theme)")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (!(role === "owner" && scope === "combined")) {
    query = query.eq("business_id", businessId);
  }

  if (startDate) {
    query = query.gte("expense_date", startDate);
  }

  if (endDate) {
    query = query.lte("expense_date", endDate);
  }

  if (search?.trim()) {
    const sanitizedSearch = search.trim().replaceAll(",", " ");
    query = query.or(`name.ilike.%${sanitizedSearch}%,notes.ilike.%${sanitizedSearch}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const expenses = (data ?? []) as unknown as ExpenseListItem[];

  return {
    expenses,
    totalAmount: expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0),
  };
}
