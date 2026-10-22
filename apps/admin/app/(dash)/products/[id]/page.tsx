import { notFound } from "next/navigation";
import { getRepo } from "@blip/db/server";
import { ProductForm } from "@/components/product-form";

export const metadata = { title: "Edit dish" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepo();
  const [product, categories] = await Promise.all([repo.getProduct(id), repo.getCategories({ includeHidden: true })]);
  if (!product) notFound();
  return <ProductForm key={product.id} product={product} categories={categories} />;
}
