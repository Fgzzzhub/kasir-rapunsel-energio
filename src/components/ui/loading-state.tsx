export function LoadingState({ message = "Memuat data..." }: { message?: string }) {
  return (
    <div className="theme-card flex min-h-40 items-center justify-center px-6 py-10">
      <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--accent)]" />
        </span>
        <span>{message}</span>
      </div>
    </div>
  );
}
