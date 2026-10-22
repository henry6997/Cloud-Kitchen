"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { inr, type Banner, type Category, type Product } from "@blip/db";
import { SearchIcon } from "@blip/ui";
import { CartButton } from "./cart-button";
import { DishCard } from "./dish-card";

type HomeBanner = Banner & { href: string | null };

interface Props {
  firstName: string | null;
  addressLabel: string | null;
  signedIn: boolean;
  categories: Category[];
  products: Product[];
  popular: Product[];
  combos: Product[];
  hero: HomeBanner[];
  strip: HomeBanner[];
  info: { feePaise: number; freeAtPaise: number; eta: string };
}

function Slide({ b, label }: { b: HomeBanner; label: string }) {
  const inner = b.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={b.imageUrl} alt={b.label} loading="lazy" />
  ) : (
    <span>{b.label || label}</span>
  );
  const cls = `slide${b.imageUrl ? " has-img" : ""}`;
  return b.href ? (
    <Link href={b.href} className={cls} aria-label={b.label || label}>{inner}</Link>
  ) : (
    <div className={cls} role="group" aria-label={b.label || label}>{inner}</div>
  );
}

export function HomeView({ firstName, addressLabel, signedIn, categories, products, popular, combos, hero, strip, info }: Props) {
  const router = useRouter();
  const [cat, setCat] = useState<string | null>(null);
  const [greet, setGreet] = useState("Hello");
  const [slide, setSlide] = useState(0);
  const slides = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = new Date().getHours();
    setGreet(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const selected = categories.find((c) => c.id === cat) ?? null;
  const list = selected ? products.filter((p) => p.categoryId === selected.id).slice(0, 4) : popular;

  return (
    <main className="app app--home">
      <header className="top">
        <div className="loc">
          <small>Deliver to</small>
          <Link className="addr" href={signedIn ? "/account#addresses" : "/login?next=/account"}>{addressLabel ?? "Set location"} ▾</Link>
        </div>
        <CartButton />
      </header>

      <h1 className="greet">{firstName ? `${greet}, ${firstName}` : greet}</h1>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
          router.push(q ? `/menu?q=${encodeURIComponent(q)}` : "/menu");
        }}
      >
        <label className="search">
          <SearchIcon />
          <input type="search" name="q" placeholder="Search biryani, wraps, combos" aria-label="Search dishes" enterKeyHint="search" />
        </label>
      </form>

      {hero.length > 0 ? (
        <section className="banner" aria-label="Promotions">
          <div
            className="slides"
            ref={slides}
            onScroll={(e) => {
              const el = e.currentTarget;
              setSlide(Math.round(el.scrollLeft / el.clientWidth));
            }}
          >
            {hero.map((b, i) => <Slide key={b.id} b={b} label={`Banner ${i + 1}`} />)}
          </div>
          {hero.length > 1 ? (
            <div className="dots" aria-hidden="true">
              {hero.map((b, i) => <i key={b.id} className={i === slide ? "on" : ""} />)}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="status">
        <span className="dotg" aria-hidden="true" />
        <span><b>Kitchen is open</b> · Delivery in {info.eta} · Delivery {inr(info.feePaise)} under {inr(info.freeAtPaise)}</span>
      </div>

      <nav className="cats" aria-label="Categories">
        {categories.map((c) => (
          <button key={c.id} type="button" className="cat" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
            <span className="c" aria-hidden="true">{c.imageUrl ? <img src={c.imageUrl} alt="" loading="lazy" /> : c.emoji}</span>
            {c.name}
          </button>
        ))}
      </nav>

      <div className="sec">
        <h2>{selected ? `${selected.name} right now` : "Popular right now"}</h2>
        <Link href={selected ? `/menu#c-${selected.id}` : "/menu"}>View all →</Link>
      </div>
      <div className="grid" aria-live="polite">
        {list.length ? list.map((p) => <DishCard key={p.id} p={p} />) : <p className="meta" style={{ gridColumn: "1/-1" }}>No dishes in this category today.</p>}
      </div>

      {strip.length > 0 ? (
        <section className="banner banner2" aria-label="Offers">
          <div className="slides">{strip.map((b, i) => <Slide key={b.id} b={b} label={`Banner ${i + 4}`} />)}</div>
        </section>
      ) : null}

      {combos.length > 0 ? (
        <>
          <div className="sec">
            <h2>Combos and offers</h2>
            <Link href={`/menu#c-${combos[0]?.categoryId}`}>View all →</Link>
          </div>
          <div className="hs">{combos.map((p) => <DishCard key={p.id} p={p} wide />)}</div>
        </>
      ) : null}
    </main>
  );
}
