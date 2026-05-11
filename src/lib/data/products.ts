import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/types/app";

export async function getProducts(businessId: string): Promise<ProductRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getProductById(productId: string): Promise<ProductRow> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getActiveProducts(businessId: string): Promise<ProductRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
