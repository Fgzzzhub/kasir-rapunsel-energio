import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { Receipt, type ReceiptData } from "@/components/receipt/receipt";
import { PrintButtons } from "@/components/receipt/print-buttons";
import { getTransactionById } from "@/lib/data/transactions";
import { getServiceEmployeeNames } from "@/lib/utils/transaction-services";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuthenticatedProfile();
  const { id } = await params;
  const transaction = await getTransactionById({
    businessId: session.selectedBusiness.id,
    id,
    role: session.profile.role,
  });

  const supabase = await createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("business_settings")
    .select("receipt_footer_text")
    .eq("business_id", transaction.business_id)
    .single();

  const receiptData: ReceiptData = {
    businessName: transaction.business?.name ?? "Bisnis Tidak Diketahui",
    businessSlug: transaction.business?.slug ?? "",
    createdAt: transaction.created_at,
    customerName: transaction.customer_name,
    customerPhone: transaction.customer_phone,
    notes: transaction.notes,
    paymentMethod: transaction.payment_method,
    totalAmount: transaction.total_amount,
    taxAmount: transaction.tax_amount ?? 0,
    serviceChargeAmount: transaction.service_charge_amount ?? 0,
    receiptFooterText: settings?.receipt_footer_text,
    transactionId: transaction.id,
    services: transaction.transaction_services.map((s) => ({
      id: s.id,
      service_name_snapshot: s.service_name_snapshot,
      employee_name_snapshot: getServiceEmployeeNames(s),
      price_snapshot: s.price_snapshot,
    })),
    products: (transaction.transaction_products ?? []).map((p) => ({
      id: p.id,
      product_name_snapshot: p.product_name_snapshot,
      qty: p.qty,
      price_snapshot: p.price_snapshot,
      subtotal: p.subtotal,
    })),
  };

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 text-neutral-950 print:bg-white print:p-0">
      <PrintButtons />

      <div className="receipt-print-area mx-auto">
        <div className="receipt-paper">
          <Receipt data={receiptData} />
        </div>
      </div>
    </main>
  );
}
