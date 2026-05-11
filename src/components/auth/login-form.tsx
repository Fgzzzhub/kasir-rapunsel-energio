"use client";

import { Lock, LogIn, Mail, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AuthFormState } from "@/lib/auth/actions";
import { signInAction } from "@/lib/auth/actions";

const initialState: AuthFormState = {};

export function LoginForm({ setupMessage }: { setupMessage?: string }) {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <Card className="mx-auto w-full max-w-md border-white/10 bg-[#15111d]/95 p-0 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl">
      <CardHeader className="mb-0 gap-5 border-b border-white/10 px-6 py-7 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Image
            alt="Rapunsel Energio"
            className="h-12 w-12 rounded-2xl ring-1 ring-white/15"
            height={48}
            src="/icons/app-icon.jpeg"
            width={48}
          />
          <div className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Akses aman
          </div>
        </div>
        <div>
          <CardTitle className="font-sans text-3xl font-bold text-white">Masuk ke dashboard</CardTitle>
          <CardDescription className="mt-2 text-slate-300">
            Gunakan akun yang sudah terdaftar untuk mengelola operasional bisnis.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-6 py-7 sm:px-8">
        <form action={formAction} className="space-y-5">
          <div className="form-field">
            <label className="text-sm font-semibold text-slate-200" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                autoComplete="email"
                className="h-12 border-white/10 bg-white text-slate-950 placeholder:text-slate-500 pl-11"
                id="email"
                name="email"
                placeholder="nama@email.com"
                required
                type="email"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="text-sm font-semibold text-slate-200" htmlFor="password">
              Kata sandi
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                autoComplete="current-password"
                className="h-12 border-white/10 bg-white text-slate-950 placeholder:text-slate-500 pl-11"
                id="password"
                name="password"
                placeholder="Masukkan kata sandi"
                required
                type="password"
              />
            </div>
          </div>

          {setupMessage ? (
            <div className="rounded-xl border border-amber-500/25 bg-[var(--warning-soft)] px-4 py-3 text-sm leading-6 text-amber-300">
              {setupMessage}
            </div>
          ) : null}

          {state.error ? (
            <div className="rounded-xl border border-[color:var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
              {state.error}
            </div>
          ) : null}

          <Button
            className="h-12 w-full gap-2 bg-[#d84b76] text-base text-white shadow-lg shadow-rose-950/30 hover:bg-[#e45c86]"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Memproses..." : "Masuk"}
            <LogIn className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
