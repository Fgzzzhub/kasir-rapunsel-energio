"use client";

export function PrintButtons() {
  return (
    <div className="no-print mx-auto mb-4 flex w-full max-w-sm items-center justify-between gap-3">
      <button 
        onClick={() => window.history.back()}
        className="min-h-10 rounded-lg border border-neutral-300 bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50"
        type="button"
      >
        Kembali
      </button>
      <button 
        onClick={() => window.print()}
        className="min-h-10 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-700"
        type="button"
      >
        Cetak Struk
      </button>
    </div>
  );
}
