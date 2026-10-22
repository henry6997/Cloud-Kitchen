import { sortCatalog } from "@blip/db";
import { getRepo } from "@blip/db/server";
import { MenuView } from "@/components/menu-view";

export const metadata = { title: "Menu" };

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const repo = getRepo();
  const [categories, products] = await Promise.all([repo.getCategories(), repo.getProducts()]);
  return <MenuView categories={categories} products={sortCatalog(products, categories)} initialQuery={(q ?? "").slice(0, 60)} />;
}
