export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  googleSheetsClientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL ?? "",
  googleSheetsPrivateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY ?? "",
  googleSheetsSpreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "",
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasServiceRoleEnv() {
  return hasSupabaseEnv() && Boolean(env.supabaseServiceRoleKey);
}

export function hasGoogleSheetsEnv() {
  return Boolean(
    env.googleSheetsClientEmail &&
      env.googleSheetsPrivateKey &&
      env.googleSheetsSpreadsheetId,
  );
}

export function assertSupabaseEnv() {
  if (!hasSupabaseEnv()) {
    throw new Error(
      "Supabase environment variables are missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return env;
}

export function assertServiceRoleEnv() {
  if (!hasServiceRoleEnv()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for privileged Supabase operations.",
    );
  }

  return env;
}
