import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/api";
import { getExpenses } from "@/lib/data/expenses";
import { getCustomers, type CustomerSort } from "@/lib/data/customers";
import { getPayrollReport } from "@/lib/data/payroll";
import { getFinancialReport } from "@/lib/data/reports";
import { getTransactions } from "@/lib/data/transactions";
import {
  createExpenseWorkbook,
  createCustomerWorkbook,
  createFinancialWorkbook,
  createPayrollWorkbook,
  createTransactionWorkbook,
} from "@/lib/utils/export";
import {
  buildFinancialReportDocument,
  buildPayrollReportDocument,
  buildSalarySlipDocument,
} from "@/lib/utils/export-pdf";
import { getMonthInputValue, getMonthRangeFromInput, getPresetRange } from "@/lib/utils/date";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fileResponse(buffer: Buffer, fileName: string, contentType: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": contentType,
    },
  });
}

function getScope(role: "owner" | "admin", scopeParam: string | null) {
  return role === "owner" && scopeParam === "combined" ? "combined" : "selected";
}

function toNodeBuffer(value: ArrayBuffer | Buffer) {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  const auth = await requireApiAuth(
    kind === "transactions" || kind === "customers" ? ["owner", "admin"] : ["owner"],
  );

  if (auth instanceof NextResponse) {
    return auth;
  }

  const url = new URL(request.url);
  const businessId = url.searchParams.get("businessId");
  const businessName = url.searchParams.get("businessName") || "Semua Bisnis";
  const scope = getScope(auth.profile.role, url.searchParams.get("scope"));
  const generatedAt = new Date();

  if (!businessId) {
    return NextResponse.json(
      {
        error: "businessId wajib dikirim.",
      },
      { status: 400 },
    );
  }

  const month = url.searchParams.get("month") || getMonthInputValue();
  const monthlyRange = getMonthRangeFromInput(month);
  const defaultStartDate = monthlyRange.startDate;
  const defaultEndDate = monthlyRange.endDate;
  const startDate = url.searchParams.get("startDate") || defaultStartDate;
  const endDate = url.searchParams.get("endDate") || defaultEndDate;

  if (kind === "transactions") {
    const transactions = await getTransactions({
      businessId,
      employeeId: url.searchParams.get("employeeId") ?? undefined,
      endDate,
      paymentMethod: url.searchParams.get("paymentMethod") ?? undefined,
      role: auth.profile.role,
      scope,
      search: url.searchParams.get("search") ?? undefined,
      startDate,
    });
    const workbook = await createTransactionWorkbook({
      endDate,
      generatedAt,
      includeCommission: auth.profile.role === "owner",
      scopeLabel: scope === "combined" ? "Semua Bisnis" : businessName,
      startDate,
      transactions,
    });

    return fileResponse(
      toNodeBuffer((await workbook.xlsx.writeBuffer()) as ArrayBuffer | Buffer),
      `transaksi-${scope === "combined" ? "semua-bisnis" : slugify(businessName)}-${startDate.slice(0, 7)}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }

  if (kind === "customers") {
    const { customers } = await getCustomers({
      businessId,
      filters: {
        businessId: url.searchParams.get("businessIdFilter") ?? undefined,
        endDate: url.searchParams.get("endDate") ?? undefined,
        phone: url.searchParams.get("phone") ?? undefined,
        search: url.searchParams.get("search") ?? undefined,
        sort: (url.searchParams.get("sort") as CustomerSort | null) ?? "newest",
        startDate: url.searchParams.get("startDate") ?? undefined,
      },
      role: auth.profile.role,
    });
    const workbook = await createCustomerWorkbook({
      customers,
      generatedAt,
      scopeLabel: scope === "combined" ? "Semua Bisnis" : businessName,
    });

    return fileResponse(
      toNodeBuffer((await workbook.xlsx.writeBuffer()) as ArrayBuffer | Buffer),
      `customer-${scope === "combined" ? "semua-bisnis" : slugify(businessName)}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }

  if (kind === "expenses") {
    const { expenses } = await getExpenses({
      businessId,
      endDate,
      role: auth.profile.role,
      scope,
      search: url.searchParams.get("search") ?? undefined,
      startDate,
    });
    const workbook = await createExpenseWorkbook({
      endDate,
      expenses,
      generatedAt,
      scopeLabel: scope === "combined" ? "Semua Bisnis" : businessName,
      startDate,
    });

    return fileResponse(
      toNodeBuffer((await workbook.xlsx.writeBuffer()) as ArrayBuffer | Buffer),
      `pengeluaran-${scope === "combined" ? "semua-bisnis" : slugify(businessName)}-${startDate.slice(0, 7)}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }

  if (kind === "payroll" || kind === "salary-slip") {
    const payroll = await getPayrollReport({
      businessId,
      businessName,
      endDate,
      role: auth.profile.role,
      scope,
      startDate,
    });

    if (kind === "salary-slip") {
      const employeeId = url.searchParams.get("employeeId");
      const employee = payroll.employees.find((item) => item.employeeId === employeeId);

      if (!employee) {
        return NextResponse.json(
          {
            error: "Karyawan slip gaji tidak ditemukan.",
          },
          { status: 404 },
        );
      }

      const pdfBuffer = await renderToBuffer(
        buildSalarySlipDocument({
          employee,
          generatedAt,
          payroll,
        }),
      );

      return fileResponse(
        pdfBuffer,
        `slip-gaji-${slugify(employee.employeeName)}-${startDate.slice(0, 7)}.pdf`,
        "application/pdf",
      );
    }

    if (url.searchParams.get("format") === "pdf") {
      const pdfBuffer = await renderToBuffer(
        buildPayrollReportDocument({
          generatedAt,
          payroll,
        }),
      );

      return fileResponse(
        pdfBuffer,
        `payroll-${scope === "combined" ? "semua-bisnis" : slugify(businessName)}-${startDate.slice(0, 7)}.pdf`,
        "application/pdf",
      );
    }

    const workbook = await createPayrollWorkbook({
      generatedAt,
      payroll,
    });

    return fileResponse(
      toNodeBuffer((await workbook.xlsx.writeBuffer()) as ArrayBuffer | Buffer),
      `payroll-${scope === "combined" ? "semua-bisnis" : slugify(businessName)}-${startDate.slice(0, 7)}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }

  const reportRange = getPresetRange({
    date: url.searchParams.get("date") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
    month: url.searchParams.get("month") ?? undefined,
    preset: url.searchParams.get("preset") ?? undefined,
    startDate: url.searchParams.get("startDate") ?? undefined,
  });
  const report = await getFinancialReport({
    businessId,
    businessName,
    endDate: reportRange.endDate,
    role: auth.profile.role,
    scope,
    startDate: reportRange.startDate,
  });

  if (kind === "commission") {
    const workbook = await createFinancialWorkbook({
      generatedAt,
      report,
    });

    return fileResponse(
      toNodeBuffer((await workbook.xlsx.writeBuffer()) as ArrayBuffer | Buffer),
      `komisi-${scope === "combined" ? "semua-bisnis" : slugify(businessName)}-${reportRange.startDate.slice(0, 7)}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }

  if (kind !== "financial") {
    return NextResponse.json(
      {
        error: "Jenis export tidak dikenal.",
      },
      { status: 404 },
    );
  }

  if (url.searchParams.get("format") === "pdf") {
    const pdfBuffer = await renderToBuffer(
      buildFinancialReportDocument({
        generatedAt,
        report,
      }),
    );

    return fileResponse(
      pdfBuffer,
      `laporan-keuangan-${scope === "combined" ? "semua-bisnis" : slugify(businessName)}-${reportRange.startDate.slice(0, 7)}.pdf`,
      "application/pdf",
    );
  }

  const workbook = await createFinancialWorkbook({
    generatedAt,
    report,
  });

  return fileResponse(
    toNodeBuffer((await workbook.xlsx.writeBuffer()) as ArrayBuffer | Buffer),
    `laporan-keuangan-${scope === "combined" ? "semua-bisnis" : slugify(businessName)}-${reportRange.startDate.slice(0, 7)}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
