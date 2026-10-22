import { bannerHref, popularPicks, sortCatalog } from "@blip/db";
import { getRepo } from "@blip/db/server";
import { HomeView } from "@/components/home-view";
import { currentUser } from "@/lib/auth";

export default async function HomePage() {
  const repo = getRepo();
  const user = await currentUser();
  const [categories, products, banners, settings, addresses] = await Promise.all([
    repo.getCategories(),
    repo.getProducts(),
    repo.getBanners(),
    repo.getSettings(),
    user ? repo.listAddresses(user.id) : Promise.resolve([]),
  ]);
  const ordered = sortCatalog(products, categories);
  const comboCatIds = new Set(categories.filter((c) => ordered.filter((p) => p.categoryId === c.id).every((p) => p.isCombo)).map((c) => c.id));
  const cats = categories.filter((c) => !comboCatIds.has(c.id)).slice(0, 5);
  const withHref = banners.map((b) => ({ ...b, href: bannerHref(b, categories) }));

  return (
    <HomeView
      firstName={user?.fullName.split(" ")[0] ?? null}
      addressLabel={addresses.find((a) => a.isDefault)?.label ?? addresses[0]?.label ?? null}
      signedIn={!!user}
      categories={cats}
      products={ordered.filter((p) => !p.isCombo)}
      popular={popularPicks(products, categories, 4)}
      combos={ordered.filter((p) => p.isCombo)}
      hero={withHref.filter((b) => b.slot === "hero")}
      strip={withHref.filter((b) => b.slot === "strip")}
      info={{ feePaise: settings.deliveryFeePaise, freeAtPaise: settings.freeDeliveryThresholdPaise, eta: settings.deliveryEtaText }}
    />
  );
}
