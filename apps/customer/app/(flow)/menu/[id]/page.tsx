import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pairings } from "@blip/db";
import { getRepo } from "@blip/db/server";
import { DetailView } from "@/components/detail-view";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getRepo().getProduct(id);
  return { title: p?.name ?? "Dish" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepo();
  const product = await repo.getProduct(id);
  if (!product) notFound();
  const [categories, products] = await Promise.all([repo.getCategories(), repo.getProducts()]);
  return <DetailView key={product.id} product={product} related={pairings(product, products, categories, 3)} />;
}
