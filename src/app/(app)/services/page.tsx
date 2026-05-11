import { ServiceManager } from "@/components/services/service-manager";
import { getServices } from "@/lib/data/services";
import { requireAuthenticatedProfile } from "@/lib/auth/session";

export default async function ServicesPage() {
  const session = await requireAuthenticatedProfile();
  const services = await getServices({
    businessId: session.selectedBusiness.id,
  });

  return (
    <>
      <section className="page-title">
        <span className="theme-pill w-fit">{session.selectedBusiness.name}</span>
        <h1>Manajemen layanan</h1>
        <p>
          Harga, deskripsi, dan durasi layanan dikelola per bisnis. Perubahan harga tidak akan
          mengubah histori transaksi yang sudah tersimpan.
        </p>
      </section>
      <ServiceManager
        businessId={session.selectedBusiness.id}
        canManage={session.profile.role === "owner"}
        initialServices={services}
      />
    </>
  );
}
