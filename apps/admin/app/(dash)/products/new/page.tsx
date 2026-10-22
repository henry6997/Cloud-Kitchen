import { getRepo } from "@blip/db/server";
import { ProductForm } from "@/components/product-form";

export const metadata = { title: "New dish" };

export default async function NewProduct() {
  const categories = await getRepo().getCategories({ includeHidden: true });
  return <ProductForm categories={categories} />;
}
