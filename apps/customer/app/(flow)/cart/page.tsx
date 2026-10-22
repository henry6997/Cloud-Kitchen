import { getRepo } from "@blip/db/server";
import { CartView } from "@/components/cart-view";

export const metadata = { title: "Your cart" };

export default async function CartPage() {
  const repo = getRepo();
  const [products, settings] = await Promise.all([repo.getProducts({ includeUnavailable: true }), repo.getSettings()]);
  return <CartView products={products} settings={settings} />;
}
