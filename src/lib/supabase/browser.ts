import { createBrowserClient } from "@supabase/ssr";

import { assertSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

export function createSupabaseBrowserClient() {
  const { supabaseAnonKey, supabaseUrl } = assertSupabaseEnv();

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
