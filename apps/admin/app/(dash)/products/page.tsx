import { getRepo } from "@blip/db/server";
import { sortCatalog } from "@blip/db";
import { ProductsView } from "@/components/products-view";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const repo = getRepo();
  const [categories, products] = await Promise.all([repo.getCategories({ includeHidden: true }), repo.getProducts({ includeUnavailable: true })]);
  return <ProductsView products={sortCatalog(products, categories)} categories={categories} />;
}
