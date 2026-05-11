import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getSessionContext } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSessionContext();
  const params = await searchParams;

  if (session.user) {
    redirect("/dashboard");
  }

  const setupMessage =
    params.setup === "1"
      ? "Konfigurasi akses belum aktif. Hubungi administrator sistem."
      : params.inactive === "1"
        ? "Akun Anda belum aktif. Hubungi owner untuk mengaktifkan akses."
        : undefined;

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#0d0b12] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,#0d0b12_0%,#17131f_52%,#102722_100%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-rose-300/60 to-transparent" />

      <div className="mx-auto grid w-full max-w-6xl gap-8 self-center lg:grid-cols-[1fr_440px] lg:items-center">
        <section className="hidden lg:flex min-h-[620px] flex-col justify-between py-6">
          <div>
            <div className="flex items-center gap-4">
              <Image
                alt="Rapunsel Energio"
                className="h-16 w-16 rounded-3xl shadow-2xl shadow-black/30 ring-1 ring-white/15"
                height={64}
                src="/icons/app-icon.jpeg"
                width={64}
              />
              <div>
                <p className="text-sm font-semibold uppercase text-slate-300">
                  Rapunsel & Energio
                </p>
                <p className="text-lg font-semibold text-white">Management Suite</p>
              </div>
            </div>

            <h1 className="mt-16 max-w-2xl font-sans text-5xl font-bold leading-tight text-white md:text-6xl">
              Operasional harian dalam satu ruang kerja.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">
              Pantau transaksi, pelanggan, karyawan, komisi, payroll, dan inventory
              dengan akses terpisah untuk owner dan admin.
            </p>
          </div>

          <div className="grid max-w-2xl grid-cols-3 gap-3 text-sm">
            <div className="border-l border-rose-300/70 pl-4">
              <p className="font-semibold text-white">Rapunsel Salon</p>
              <p className="mt-1 leading-6 text-slate-300">Layanan salon dan penjualan produk.</p>
            </div>
            <div className="border-l border-emerald-400/50 pl-4">
              <p className="font-semibold text-white">Energio Reflexologi</p>
              <p className="mt-1 leading-6 text-slate-300">Layanan wellness dan komisi terapis.</p>
            </div>
            <div className="border-l border-amber-300/60 pl-4">
              <p className="font-semibold text-white">Owner Dashboard</p>
              <p className="mt-1 leading-6 text-slate-300">Ringkasan bisnis dan laporan.</p>
            </div>
          </div>
        </section>

        <LoginForm setupMessage={setupMessage} />
      </div>
    </main>
  );
}
