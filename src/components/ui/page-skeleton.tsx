import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      {/* Page Title Section Skeleton */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-8 w-64 md:h-10 md:w-80" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-5/6 max-w-xl" />
      </section>

      {/* Toolbar & Add Button Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-10 w-full sm:w-64" />
          <Skeleton className="h-10 w-24 hidden sm:block" />
        </div>
        <Skeleton className="h-10 w-full sm:w-32" />
      </div>

      {/* Mobile/Tablet View: Stacked Cards Skeleton */}
      <div className="flex flex-col space-y-4 md:hidden mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="theme-card p-4 flex flex-col gap-3 border border-[var(--border)] rounded-lg">
            <div className="flex justify-between items-start">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-1/3" />
            <div className="flex justify-end gap-2 mt-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop View: Data Table Skeleton */}
      <div className="hidden md:block table-shell overflow-hidden mt-4">
        <div className="min-w-full text-left text-sm">
          {/* Table Header */}
          <div className="border-b border-[color:var(--border-strong)] flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex-1">
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
          {/* Table Rows */}
          <div className="flex flex-col">
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <div key={rowIndex} className="border-b border-[color:var(--border)]/50 flex last:border-b-0 px-4 py-4">
                 {Array.from({ length: 5 }).map((_, colIndex) => (
                  <div key={colIndex} className="flex-1 pr-4">
                    <Skeleton className="h-4 w-full max-w-[80%]" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
