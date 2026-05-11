import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { PaymentMethodBadge } from "@/components/ui/badge";

export function TransactionSummary({
  paymentMethod,
  showCommission = true,
  totalAmount,
  subtotalAmount,
  taxAmount = 0,
  serviceChargeAmount = 0,
  taxPercentage = 0,
  serviceChargePercentage = 0,
  totalCommission,
  totalProducts,
  totalServices,
}: {
  paymentMethod?: string;
  showCommission?: boolean;
  totalAmount: number;
  subtotalAmount?: number;
  taxAmount?: number;
  serviceChargeAmount?: number;
  taxPercentage?: number;
  serviceChargePercentage?: number;
  totalCommission: number;
  totalProducts?: number;
  totalServices?: number;
}) {
  const hasBreakdown =
    totalServices !== undefined && totalProducts !== undefined && totalProducts > 0;

  return (
    <div className="theme-card glow-ring space-y-3 p-5">
      {hasBreakdown && (
        <div className="space-y-2 mb-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Total layanan</span>
            <span className="font-semibold text-foreground">
              <RupiahFormatter value={totalServices!} />
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Total produk</span>
            <span className="font-semibold text-foreground">
              <RupiahFormatter value={totalProducts!} />
            </span>
          </div>
        </div>
      )}
      
      {(taxPercentage > 0 || serviceChargePercentage > 0) && (
        <div className="border-t border-[color:var(--border)] pt-3 pb-1 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Subtotal</span>
            <span className="font-semibold text-foreground">
              <RupiahFormatter value={subtotalAmount ?? totalAmount} />
            </span>
          </div>
          {serviceChargePercentage > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Service Charge ({serviceChargePercentage}%)</span>
              <span className="font-semibold text-foreground">
                <RupiahFormatter value={serviceChargeAmount} />
              </span>
            </div>
          )}
          {taxPercentage > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Pajak ({taxPercentage}%)</span>
              <span className="font-semibold text-foreground">
                <RupiahFormatter value={taxAmount} />
              </span>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-[color:var(--border)] pt-3" />

      <div className={`grid gap-4 ${showCommission ? "sm:grid-cols-2" : ""}`}>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Grand Total</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            <RupiahFormatter value={totalAmount} />
          </p>
        </div>
        {showCommission ? (
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Total komisi</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--gold)]">
              <RupiahFormatter value={totalCommission} />
            </p>
          </div>
        ) : null}
      </div>
      {paymentMethod ? (
        <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-3 text-sm">
          <span className="font-medium text-muted-foreground">Metode pembayaran</span>
          <PaymentMethodBadge method={paymentMethod} />
        </div>
      ) : null}
    </div>
  );
}
