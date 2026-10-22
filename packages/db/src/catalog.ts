import type { Category, Product } from "./types";

/** Category order first, then each product's own order inside its category. */
export function sortCatalog(products: Product[], categories: Category[]): Product[] {
  const rank = new Map(categories.map((c) => [c.id, c.sortOrder]));
  return [...products].sort((a, b) => (rank.get(a.categoryId) ?? 99) - (rank.get(b.categoryId) ?? 99) || a.sortOrder - b.sortOrder);
}

/** "Popular right now": one favourite per category first, then fill up to `n`. */
export function popularPicks(products: Product[], categories: Category[], n = 4): Product[] {
  const ordered = sortCatalog(products.filter((p) => p.isPopular && !p.isCombo && p.isAvailable), categories);
  const firsts: Product[] = [];
  const seen = new Set<string>();
  for (const p of ordered) if (!seen.has(p.categoryId)) (seen.add(p.categoryId), firsts.push(p));
  const rest = ordered.filter((p) => !firsts.includes(p));
  return [...firsts, ...rest].slice(0, n);
}

/** Related picks for "Goes well with": other categories first, popular ones ahead. */
export function pairings(product: Product, products: Product[], categories: Category[], n = 3): Product[] {
  const others = sortCatalog(products.filter((p) => p.id !== product.id && p.isAvailable && !p.isCombo), categories);
  const diff = others.filter((p) => p.categoryId !== product.categoryId);
  const ranked = [...diff.filter((p) => p.isPopular), ...diff.filter((p) => !p.isPopular)];
  return ranked.slice(0, n);
}

export function bannerHref(b: { linkType: string; linkTarget: string }, categories: Category[]): string | null {
  switch (b.linkType) {
    case "category": {
      const c = categories.find((x) => x.name.toLowerCase() === b.linkTarget.toLowerCase() || x.id === b.linkTarget);
      return c ? `/menu#c-${c.id}` : "/menu";
    }
    case "product":
      return `/menu/${b.linkTarget}`;
    case "url":
      return /^(https?:\/\/|\/)/.test(b.linkTarget) ? b.linkTarget : null;
    default:
      return null;
  }
}
