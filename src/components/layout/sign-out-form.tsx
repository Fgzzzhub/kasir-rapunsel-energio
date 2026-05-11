import { LogOut } from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";

export function SignOutForm() {
  return (
    <form action={signOutAction}>
      <button
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[var(--surface-hover)] px-4 py-2 text-sm font-semibold text-foreground-secondary hover:bg-[var(--surface-elevated)] transition-colors"
        type="submit"
      >
        <LogOut className="h-4 w-4" />
        Keluar
      </button>
    </form>
  );
}
