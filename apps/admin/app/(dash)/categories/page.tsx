import { getRepo } from "@blip/db/server";
import { CategoriesView } from "@/components/categories-view";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const repo = getRepo();
  const [categories, products] = await Promise.all([repo.getCategories({ includeHidden: true }), repo.getProducts({ includeUnavailable: true })]);
  const counts: Record<string, number> = {};
  for (const p of products) counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1;
  return <CategoriesView categories={categories} counts={counts} />;
}
