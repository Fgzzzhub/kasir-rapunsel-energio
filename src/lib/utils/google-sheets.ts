import { createSign } from "node:crypto";

import { env, hasGoogleSheetsEnv, hasServiceRoleEnv } from "@/lib/env";
import { attachTransactionServiceEmployees } from "@/lib/data/transaction-service-employees";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { SyncLogRow, TransactionServiceRow } from "@/lib/types/app";
import { formatDateTime } from "@/lib/utils/date";
import {
  formatCommissionRate,
  getEffectiveCommissionRate,
  getServiceEmployeeNames,
  getServiceEmployeeSplits,
  getServiceTotalCommission,
} from "@/lib/utils/transaction-services";

const REQUIRED_SHEET_NAMES = [
  "Transactions",
  "Transaction Services",
  "Commission",
  "Expenses",
  "Payroll Summary",
] as const;

function normalizePrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, "\n");
}

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

async function getGoogleAccessToken() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    aud: "https://oauth2.googleapis.com/token",
    exp: issuedAt + 3600,
    iat: issuedAt,
    iss: env.googleSheetsClientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signer = createSign("RSA-SHA256");
  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();

  const assertion = `${encodedHeader}.${encodedPayload}.${signer.sign(
    normalizePrivateKey(env.googleSheetsPrivateKey),
    "base64url",
  )}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      assertion,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gagal mengambil token Google Sheets: ${errorText}`);
  }

  const responsePayload = (await response.json()) as { access_token: string };
  return responsePayload.access_token;
}

async function googleSheetsRequest<T>({
  accessToken,
  body,
  method = "GET",
  path,
}: {
  accessToken: string;
  body?: unknown;
  method?: "GET" | "POST";
  path: string;
}) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.googleSheetsSpreadsheetId}${path}`,
    {
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets API error: ${errorText}`);
  }

  return (await response.json()) as T;
}

async function ensureRequiredSheets(accessToken: string) {
  const payload = await googleSheetsRequest<{
    sheets?: Array<{ properties?: { title?: string } }>;
  }>({
    accessToken,
    path: "?fields=sheets.properties.title",
  });
  const existingSheetNames = new Set(
    (payload.sheets ?? []).map((sheet) => sheet.properties?.title).filter(Boolean),
  );
  const missingSheetNames = REQUIRED_SHEET_NAMES.filter(
    (sheetName) => !existingSheetNames.has(sheetName),
  );

  if (!missingSheetNames.length) {
    return;
  }

  await googleSheetsRequest({
    accessToken,
    body: {
      requests: missingSheetNames.map((sheetName) => ({
        addSheet: {
          properties: {
            title: sheetName,
          },
        },
      })),
    },
    method: "POST",
    path: ":batchUpdate",
  });
}

async function appendRows({
  accessToken,
  rows,
  sheetName,
}: {
  accessToken: string;
  rows: Array<Array<number | string>>;
  sheetName: string;
}) {
  if (!rows.length) {
    return;
  }

  const range = encodeURIComponent(`${sheetName}!A1`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.googleSheetsSpreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: rows,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gagal append ke sheet ${sheetName}: ${errorText}`);
  }
}

async function ensureHeaderRow({
  accessToken,
  headers,
  sheetName,
}: {
  accessToken: string;
  headers: string[];
  sheetName: string;
}) {
  const range = encodeURIComponent(`${sheetName}!1:1`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.googleSheetsSpreadsheetId}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    return;
  }

  const payload = (await response.json()) as { values?: string[][] };

  if (payload.values?.[0]?.length) {
    return;
  }

  await appendRows({
    accessToken,
    rows: [headers],
    sheetName,
  });
}

async function syncTransactionLog(log: SyncLogRow, accessToken: string) {
  if (!log.reference_id) {
    throw new Error("reference_id transaksi tidak ditemukan.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .select("*, business:businesses(name)")
    .eq("id", log.reference_id)
    .maybeSingle();

  if (transactionError) {
    throw new Error(transactionError.message);
  }

  if (!transaction) {
    throw new Error("Transaksi sumber tidak ditemukan.");
  }

  const { data: transactionServices, error: transactionServicesError } = await supabase
    .from("transaction_services")
    .select("*")
    .eq("transaction_id", transaction.id)
    .order("created_at");

  if (transactionServicesError) {
    throw new Error(transactionServicesError.message);
  }

  const businessName =
    (
      transaction as typeof transaction & {
        business?: { name?: string } | null;
      }
    ).business?.name ?? "Bisnis tidak diketahui";
  const serviceRows = await attachTransactionServiceEmployees(
    supabase,
    (transactionServices ?? []) as TransactionServiceRow[],
  );

  await ensureHeaderRow({
    accessToken,
    headers: [
      "Date",
      "Business",
      "Transaction ID",
      "Customer Name",
      "Payment Method",
      "Total Amount",
      "Created By",
    ],
    sheetName: "Transactions",
  });
  await ensureHeaderRow({
    accessToken,
    headers: [
      "Date",
      "Business",
      "Transaction ID",
      "Customer Name",
      "Service Name",
      "Employee Name",
      "Price",
      "Commission Rate",
      "Commission Amount",
    ],
    sheetName: "Transaction Services",
  });
  await ensureHeaderRow({
    accessToken,
    headers: [
      "Date",
      "Business",
      "Transaction ID",
      "Employee Name",
      "Service Name",
      "Commission Amount",
    ],
    sheetName: "Commission",
  });

  await appendRows({
    accessToken,
    rows: [
      [
        formatDateTime(transaction.created_at),
        businessName,
        transaction.id,
        transaction.customer_name,
        transaction.payment_method.toUpperCase(),
        Number(transaction.total_amount),
        transaction.created_by ?? "-",
      ],
    ],
    sheetName: "Transactions",
  });
  await appendRows({
    accessToken,
    rows: serviceRows.map((serviceRow) => [
      formatDateTime(transaction.created_at),
      businessName,
      transaction.id,
      transaction.customer_name,
      serviceRow.service_name_snapshot,
      getServiceEmployeeNames(serviceRow),
      Number(serviceRow.price_snapshot),
      getServiceEmployeeSplits(serviceRow)
        .map(
          (employee) =>
            `${employee.employee_name_snapshot} ${formatCommissionRate(
              getEffectiveCommissionRate(employee),
            )}%`,
        )
        .join(", "),
      getServiceTotalCommission(serviceRow),
    ]),
    sheetName: "Transaction Services",
  });
  await appendRows({
    accessToken,
    rows: serviceRows.flatMap((serviceRow) =>
      getServiceEmployeeSplits(serviceRow).map((employee) => [
        formatDateTime(transaction.created_at),
        businessName,
        transaction.id,
        employee.employee_name_snapshot,
        serviceRow.service_name_snapshot,
        Number(employee.commission_amount),
      ]),
    ),
    sheetName: "Commission",
  });
}

export async function getGoogleSheetsSyncStatus() {
  const configured = hasGoogleSheetsEnv() && hasServiceRoleEnv();

  return {
    configured,
    message: configured
      ? "Kredensial Google Sheets dan service role Supabase tersedia."
      : "Kredensial Google Sheets atau SUPABASE_SERVICE_ROLE_KEY belum lengkap. Sinkronisasi tidak dijalankan.",
  };
}

export async function processGoogleSheetsSync({
  includeFailed = false,
  limit = 25,
}: {
  includeFailed?: boolean;
  limit?: number;
}) {
  const status = await getGoogleSheetsSyncStatus();

  if (!status.configured) {
    return {
      ...status,
      failed: 0,
      processed: 0,
      synced: 0,
    };
  }

  const supabase = createSupabaseServiceRoleClient();
  const accessToken = await getGoogleAccessToken();
  await ensureRequiredSheets(accessToken);

  const statuses = includeFailed ? ["pending", "failed"] : ["pending"];
  const { data: logs, error } = await supabase
    .from("sync_logs")
    .select("*")
    .in("status", statuses)
    .order("created_at")
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  let synced = 0;
  let failed = 0;

  for (const log of (logs ?? []) as SyncLogRow[]) {
    try {
      if (log.type === "transaction") {
        await syncTransactionLog(log, accessToken);
      } else {
        throw new Error(`Tipe sync ${log.type} belum didukung.`);
      }

      const { error: updateError } = await supabase
        .from("sync_logs")
        .update({
          error_message: null,
          status: "synced",
          synced_at: new Date().toISOString(),
        })
        .eq("id", log.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      synced += 1;
    } catch (syncError) {
      failed += 1;

      await supabase
        .from("sync_logs")
        .update({
          error_message:
            syncError instanceof Error ? syncError.message : "Sinkronisasi Google Sheets gagal.",
          status: "failed",
        })
        .eq("id", log.id);
    }
  }

  return {
    ...status,
    failed,
    processed: (logs ?? []).length,
    synced,
  };
}
