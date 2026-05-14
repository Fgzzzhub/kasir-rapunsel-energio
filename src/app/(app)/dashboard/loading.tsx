import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in duration-500 pt-4">
      {/* Page Title Section */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-8 w-64 md:h-10 md:w-80" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <div className="flex flex-wrap gap-3 mt-2">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </section>

      {/* StatCards Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="theme-card p-6 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-8 w-40 mt-2" />
            <Skeleton className="h-4 w-full mt-1" />
          </div>
        ))}
      </section>

      {/* Two Business Summaries */}
      <section className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="px-0 pb-4">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="theme-card-muted p-4">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-6 w-32" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>

      {/* Top Services & Products */}
      <section className="grid gap-6 xl:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="px-0 pb-4">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="theme-card-muted flex items-center justify-between p-4">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>

      {/* Recent Transactions & Best Employees */}
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="px-0 pb-4">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="theme-card-muted flex items-center justify-between p-4 border border-[color:var(--border)]">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <Skeleton className="h-5 w-28" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
