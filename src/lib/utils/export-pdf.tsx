import type { DocumentProps } from "@react-pdf/renderer";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactElement } from "react";

import { APP_NAME } from "@/lib/constants/app";
import type { FinancialReportData, PayrollEmployeeSummary, PayrollReportData } from "@/lib/types/app";
import { formatRupiah } from "@/lib/utils/currency";
import { formatDateLong, formatDateTime } from "@/lib/utils/date";

const styles = StyleSheet.create({
  body: {
    color: "#1f2937",
    fontSize: 10,
    padding: 28,
  },
  header: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    marginBottom: 4,
  },
  label: {
    color: "#6b7280",
    fontSize: 9,
  },
  row: {
    alignItems: "flex-start",
    borderBottom: "1 solid #e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  tableCell: {
    flexGrow: 1,
    paddingRight: 8,
  },
  tableCellNarrow: {
    flexBasis: 70,
    flexGrow: 0,
    textAlign: "right",
  },
  tableHeader: {
    backgroundColor: "#f3f4f6",
    borderBottom: "1 solid #d1d5db",
    fontWeight: 700,
  },
});

function Header({
  generatedAt,
  period,
  scopeLabel,
  title,
}: {
  generatedAt: Date;
  period: string;
  scopeLabel: string;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <Text>{APP_NAME}</Text>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.label}>Bisnis: {scopeLabel}</Text>
      <Text style={styles.label}>Periode: {period}</Text>
      <Text style={styles.label}>Dibuat pada: {formatDateTime(generatedAt)}</Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

function SimpleTable({
  columns,
  rows,
}: {
  columns: Array<{ label: string; narrow?: boolean }>;
  rows: string[][];
}) {
  return (
    <View>
      <View style={[styles.row, styles.tableHeader]}>
        {columns.map((column) => (
          <Text
            key={column.label}
            style={column.narrow ? styles.tableCellNarrow : styles.tableCell}
          >
            {column.label}
          </Text>
        ))}
      </View>
      {rows.map((row, index) => (
        <View key={`${row.join("-")}-${index}`} style={styles.row}>
          {row.map((cell, cellIndex) => (
            <Text
              key={`${cell}-${cellIndex}`}
              style={columns[cellIndex]?.narrow ? styles.tableCellNarrow : styles.tableCell}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function buildPayrollReportDocument({
  generatedAt,
  payroll,
}: {
  generatedAt: Date;
  payroll: PayrollReportData;
}): ReactElement<DocumentProps> {
  const period = `${formatDateLong(payroll.startDate)} - ${formatDateLong(payroll.endDate)}`;

  return (
    <Document title="Laporan Payroll">
      <Page size="A4" style={styles.body}>
        <Header
          generatedAt={generatedAt}
          period={period}
          scopeLabel={payroll.scopeLabel}
          title="Laporan Payroll"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan</Text>
          <SummaryRow label="Total gaji pokok" value={formatRupiah(payroll.summary.totalBaseSalary)} />
          <SummaryRow label="Total komisi" value={formatRupiah(payroll.summary.totalCommission)} />
          <SummaryRow label="Total bonus" value={formatRupiah(payroll.summary.totalBonus)} />
          <SummaryRow label="Total potongan" value={formatRupiah(payroll.summary.totalDeduction)} />
          <SummaryRow label="Total biaya payroll" value={formatRupiah(payroll.summary.totalPayrollCost)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Per Karyawan</Text>
          <SimpleTable
            columns={[
              { label: "Karyawan" },
              { label: "Bisnis" },
              { label: "Komisi", narrow: true },
              { label: "Bersih", narrow: true },
            ]}
            rows={payroll.employees.map((employee) => [
              employee.employeeName,
              employee.businessName,
              formatRupiah(employee.totalCommission),
              formatRupiah(employee.netSalary),
            ])}
          />
        </View>
      </Page>
    </Document>
  );
}

export function buildFinancialReportDocument({
  generatedAt,
  report,
}: {
  generatedAt: Date;
  report: FinancialReportData;
}): ReactElement<DocumentProps> {
  const period = `${formatDateLong(report.startDate)} - ${formatDateLong(report.endDate)}`;

  return (
    <Document title="Laporan Keuangan">
      <Page size="A4" style={styles.body}>
        <Header
          generatedAt={generatedAt}
          period={period}
          scopeLabel={report.scopeLabel}
          title="Laporan Keuangan"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan</Text>
          <SummaryRow label="Gross revenue" value={formatRupiah(report.summary.grossRevenue)} />
          <SummaryRow label="Total transaksi" value={`${report.summary.totalTransactions}`} />
          <SummaryRow label="Total layanan" value={`${report.summary.totalServicesHandled}`} />
          <SummaryRow label="Total komisi" value={formatRupiah(report.summary.totalCommission)} />
          <SummaryRow label="Total pengeluaran" value={formatRupiah(report.summary.totalExpenses)} />
          <SummaryRow
            label="Estimasi laba bersih"
            value={formatRupiah(report.summary.estimatedNetProfit)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pembayaran</Text>
          <SimpleTable
            columns={[
              { label: "Metode" },
              { label: "Transaksi", narrow: true },
              { label: "Total", narrow: true },
            ]}
            rows={report.paymentMethodBreakdown.map((row) => [
              row.method.toUpperCase(),
              `${row.totalTransactions}`,
              formatRupiah(row.totalAmount),
            ])}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Karyawan Teratas</Text>
          <SimpleTable
            columns={[
              { label: "Karyawan" },
              { label: "Bisnis" },
              { label: "Omzet", narrow: true },
              { label: "Komisi", narrow: true },
            ]}
            rows={report.topEmployees.slice(0, 8).map((row) => [
              row.employeeName,
              row.businessName,
              formatRupiah(row.handledRevenue),
              formatRupiah(row.totalCommission),
            ])}
          />
        </View>
      </Page>
    </Document>
  );
}

export function buildSalarySlipDocument({
  employee,
  generatedAt,
  payroll,
}: {
  employee: PayrollEmployeeSummary;
  generatedAt: Date;
  payroll: PayrollReportData;
}): ReactElement<DocumentProps> {
  const period = `${formatDateLong(payroll.startDate)} - ${formatDateLong(payroll.endDate)}`;

  return (
    <Document title={`Slip Gaji ${employee.employeeName}`}>
      <Page size="A4" style={styles.body}>
        <Header
          generatedAt={generatedAt}
          period={period}
          scopeLabel={employee.businessName}
          title={`Slip Gaji ${employee.employeeName}`}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rincian</Text>
          <SummaryRow label="Gaji pokok" value={formatRupiah(employee.baseSalary)} />
          <SummaryRow label="Total komisi" value={formatRupiah(employee.totalCommission)} />
          <SummaryRow label="Total bonus" value={formatRupiah(employee.totalBonus)} />
          <SummaryRow label="Total potongan" value={formatRupiah(employee.totalDeduction)} />
          <SummaryRow label="Gaji bersih" value={formatRupiah(employee.netSalary)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sumber Komisi</Text>
          <SimpleTable
            columns={[
              { label: "Tanggal" },
              { label: "Pelanggan" },
              { label: "Layanan" },
              { label: "Komisi", narrow: true },
            ]}
            rows={employee.commissionItems.slice(0, 15).map((item) => [
              formatDateLong(item.transactionCreatedAt),
              item.customerName,
              item.serviceName,
              formatRupiah(item.commissionAmount),
            ])}
          />
        </View>
      </Page>
    </Document>
  );
}
