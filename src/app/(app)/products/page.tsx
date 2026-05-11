import { ProductManager } from "@/components/products/product-manager";
import { getProducts } from "@/lib/data/products";
import { requireAuthenticatedProfile } from "@/lib/auth/session";

export default async function ProductsPage() {
  const session = await requireAuthenticatedProfile();
  const products = await getProducts(session.selectedBusiness.id);

  return (
    <>
      <section className="page-title">
        <span className="theme-pill w-fit">{session.selectedBusiness.name}</span>
        <h1>Manajemen produk</h1>
        <p>
          Produk kecantikan, salon, atau barang ritel lainnya dikelola per bisnis.
          Perubahan harga tidak akan mengubah histori transaksi yang sudah tersimpan.
        </p>
      </section>
      <ProductManager
        businessId={session.selectedBusiness.id}
        canManage={session.profile.role === "owner"}
        initialProducts={products}
      />
    </>
  );
}
