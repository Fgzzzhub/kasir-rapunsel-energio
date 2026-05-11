import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ServiceRow } from "@/lib/types/app";

export async function getServices({
  businessId,
  search,
}: {
  businessId: string;
  search?: string;
}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ServiceRow[];
}

export async function getActiveServices(businessId: string) {
  const services = await getServices({ businessId });

  return services.filter((service) => service.is_active);
}
