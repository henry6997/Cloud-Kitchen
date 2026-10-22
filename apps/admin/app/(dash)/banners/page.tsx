import { getRepo } from "@blip/db/server";
import { BannersView } from "@/components/banners-view";

export const metadata = { title: "Banners" };

export default async function BannersPage() {
  const repo = getRepo();
  const [banners, categories, products] = await Promise.all([repo.getBanners({ includeInactive: true }), repo.getCategories({ includeHidden: true }), repo.getProducts({ includeUnavailable: true })]);
  return <BannersView banners={banners} categories={categories} products={products} />;
}
