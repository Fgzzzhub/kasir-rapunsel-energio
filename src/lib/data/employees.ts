import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole, EmployeeRow } from "@/lib/types/app";

export async function getEmployees({
  businessId,
  role,
  scope = "selected",
  search,
}: {
  businessId: string;
  role?: AppRole;
  scope?: "selected" | "combined";
  search?: string;
}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("employees")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (!(role === "owner" && scope === "combined")) {
    query = query.eq("business_id", businessId);
  }

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EmployeeRow[];
}

export async function getActiveEmployees(businessId: string) {
  const employees = await getEmployees({ businessId });

  return employees.filter((employee) => employee.is_active);
}
