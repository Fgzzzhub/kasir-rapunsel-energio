"use client";

import type { ReactNode } from "react";

import { formatRupiah } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/date";

type ReceiptService = {
  id: string;
  service_name_snapshot: string;
  employee_name_snapshot: string;
  price_snapshot: string | number;
};

type ReceiptProduct = {
  id: string;
  product_name_snapshot: string;
  qty: number;
  price_snapshot: string | number;
  subtotal: string | number;
};

export type ReceiptData = {
  businessName: string;
  businessSlug: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string | null;
  notes?: string | null;
  paymentMethod: string;
  totalAmount: string | number;
  taxAmount: string | number;
  serviceChargeAmount: string | number;
  transactionId: string;
  services: ReceiptService[];
  products: ReceiptProduct[];
  receiptFooterText?: string | null;
};

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : parseFloat(v) || 0;
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(-8).toUpperCase();
}

function paymentLabel(method: string) {
  switch (method) {
    case "cash":
      return "CASH";
    case "transfer":
      return "TRANSFER";
    case "qris":
      return "QRIS";
    default:
      return "LAINNYA";
  }
}

function businessFooter(slug: string) {
  if (slug === "rapunsel-salon") {
    return "Terima kasih telah berkunjung ke Rapunsel Salon.";
  }

  return "Terima kasih telah berkunjung ke Energio Reflexologi.";
}

function ReceiptRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={strong ? "receipt-row receipt-row-strong" : "receipt-row"}>
      <span className="receipt-label">{label}</span>
      <span className="receipt-value">{value}</span>
    </div>
  );
}

function ReceiptDivider({ strong = false }: { strong?: boolean }) {
  return <div className={strong ? "receipt-divider-solid" : "receipt-divider"} />;
}

function ReceiptSectionTitle({ children }: { children: ReactNode }) {
  return <div className="receipt-section-title">{children}</div>;
}

export function Receipt({ data }: { data: ReceiptData }) {
  const totalServices = data.services.reduce(
    (sum, service) => sum + toNum(service.price_snapshot),
    0,
  );
  const totalProducts = data.products.reduce(
    (sum, product) => sum + toNum(product.subtotal),
    0,
  );
  const grandTotal = toNum(data.totalAmount);

  return (
    <div className="receipt-container">
      <div className="receipt-header">
        <div className="receipt-business-name">{data.businessName}</div>
        <div className="receipt-title">STRUK TRANSAKSI</div>
        <div className="receipt-meta">#{shortId(data.transactionId)}</div>
        <div className="receipt-meta">{formatDateTime(data.createdAt)}</div>
      </div>

      <ReceiptDivider />

      <ReceiptRow label="Pelanggan" value={data.customerName} />
      {data.customerPhone ? (
        <ReceiptRow label="Telepon" value={data.customerPhone} />
      ) : null}
      <ReceiptRow label="Pembayaran" value={paymentLabel(data.paymentMethod)} />

      {data.services.length > 0 ? (
        <>
          <ReceiptDivider />
          <ReceiptSectionTitle>LAYANAN</ReceiptSectionTitle>
          {data.services.map((service) => (
            <div key={service.id} className="receipt-item">
              <div className="receipt-item-name">{service.service_name_snapshot}</div>
              <div className="receipt-item-line">
                <div className="receipt-item-sub">oleh {service.employee_name_snapshot}</div>
                <div className="receipt-item-price">
                  {formatRupiah(toNum(service.price_snapshot))}
                </div>
              </div>
            </div>
          ))}
          <ReceiptRow
            label="Subtotal Layanan"
            value={formatRupiah(totalServices)}
            strong
          />
        </>
      ) : null}

      {data.products.length > 0 ? (
        <>
          <ReceiptDivider />
          <ReceiptSectionTitle>PRODUK</ReceiptSectionTitle>
          {data.products.map((product) => (
            <div key={product.id} className="receipt-item">
              <div className="receipt-item-name">{product.product_name_snapshot}</div>
              <div className="receipt-item-line">
                <div className="receipt-item-sub">
                  {product.qty} x {formatRupiah(toNum(product.price_snapshot))}
                </div>
                <div className="receipt-item-price">
                  {formatRupiah(toNum(product.subtotal))}
                </div>
              </div>
            </div>
          ))}
          <ReceiptRow
            label="Subtotal Produk"
            value={formatRupiah(totalProducts)}
            strong
          />
        </>
      ) : null}

      <ReceiptDivider />
      
      <ReceiptRow label="Subtotal" value={formatRupiah(grandTotal - toNum(data.taxAmount) - toNum(data.serviceChargeAmount))} />
      
      {toNum(data.serviceChargeAmount) > 0 && (
        <ReceiptRow label="Service Charge" value={formatRupiah(toNum(data.serviceChargeAmount))} />
      )}
      
      {toNum(data.taxAmount) > 0 && (
        <ReceiptRow label="Pajak" value={formatRupiah(toNum(data.taxAmount))} />
      )}

      <ReceiptDivider strong />

      <div className="receipt-total">
        <span>TOTAL</span>
        <span>{formatRupiah(grandTotal)}</span>
      </div>

      {data.notes ? (
        <>
          <ReceiptDivider />
          <div className="receipt-notes">Catatan: {data.notes}</div>
        </>
      ) : null}

      <ReceiptDivider />

      <div className="receipt-footer">
        {data.receiptFooterText ? (
          <div className="whitespace-pre-wrap">{data.receiptFooterText}</div>
        ) : (
          <>
            <div>Terima kasih!</div>
            <div>{businessFooter(data.businessSlug)}</div>
          </>
        )}
      </div>
    </div>
  );
}
