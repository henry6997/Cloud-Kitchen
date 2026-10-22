import { redirect } from "next/navigation";
import { getRepo } from "@blip/db/server";
import { CheckoutView } from "@/components/checkout-view";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/checkout");
  const repo = getRepo();
  const [products, settings, addresses] = await Promise.all([repo.getProducts({ includeUnavailable: true }), repo.getSettings(), repo.listAddresses(user.id)]);
  return <CheckoutView products={products} settings={settings} addresses={addresses} phone={user.phone} />;
}
