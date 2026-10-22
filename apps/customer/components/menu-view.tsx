"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { inr, type Category, type Product } from "@blip/db";
import { Photo, SearchIcon, VegMark, useToast } from "@blip/ui";
import { CartButton } from "./cart-button";
import { plainKey, useCart } from "./cart-provider";

type Diet = "all" | "veg" | "nonveg";

function Controls({ p }: { p: Product }) {
  const cart = useCart();
  const toast = useToast();
  const q = cart.qtyOf(p.id);

  if (p.optionGroups.length > 0) {
    const inCart = cart.totalQtyOf(p.id);
    return (
      <>
        <Link className="add" href={`/menu/${p.id}`} aria-label={`Choose options for ${p.name}`}>ADD</Link>
        <span className="meta" style={{ marginTop: 2 }}>{inCart > 0 ? `${inCart} in cart` : "Customisable"}</span>
      </>
    );
  }
  const add = () => {
    cart.addLine({ productId: p.id, name: p.name, emoji: p.emoji, imageUrl: p.imageUrl, optionIds: [], optionsLabel: "", unitPaise: p.pricePaise, quantity: 1, note: "" });
    toast(`Added ${p.name}`);
  };
  return q > 0 ? (
    <div className="step" role="group" aria-label={`Quantity of ${p.name}`}>
      <button type="button" aria-label="Remove one" onClick={() => (cart.setQty(plainKey(p.id), q - 1), toast(`Removed ${p.name}`))}>−</button>
      <span aria-live="polite">{q}</span>
      <button type="button" aria-label="Add one" onClick={add}>+</button>
    </div>
  ) : (
    <button type="button" className="add" aria-label={`Add ${p.name}`} onClick={add}>ADD</button>
  );
}

function Row({ p, open, onToggle }: { p: Product; open: boolean; onToggle: () => void }) {
  return (
    <div className="item">
      <Link href={`/menu/${p.id}`} className="thumb" aria-label={`View ${p.name}`}>
        <Photo src={p.imageUrl} emoji={p.emoji} />
        <VegMark veg={p.isVeg} />
      </Link>
      <div className="info">
        <h3>
          <Link href={`/menu/${p.id}`}>{p.name}</Link>
          {p.tag ? <span className="meta"> · {p.tag}</span> : null}
        </h3>
        <p>{p.description}</p>
        {open ? <div className="meta">★ {p.rating} rating · ready in {p.prepMinutes} min</div> : null}
        <div className="price">
          {inr(p.pricePaise)}
          {p.comparePricePaise ? <s>{inr(p.comparePricePaise)}</s> : null}
        </div>
        <button type="button" className="more" aria-expanded={open} onClick={onToggle}>{open ? "Less" : "Rating and time"}</button>
      </div>
      <div className="act"><Controls p={p} /></div>
    </div>
  );
}

export function MenuView({ categories, products, initialQuery }: { categories: Category[]; products: Product[]; initialQuery: string }) {
  const [diet, setDiet] = useState<Diet>("all");
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState<string | null>(null);
  const [stuck, setStuck] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const visible = products.filter(
    (p) => (diet === "all" || (diet === "veg") === p.isVeg) && (!q || `${p.name} ${p.description} ${categories.find((c) => c.id === p.categoryId)?.name ?? ""}`.toLowerCase().includes(q)),
  );
  const groups = categories.map((c) => ({ c, list: visible.filter((p) => p.categoryId === c.id) })).filter((g) => g.list.length);

  useEffect(() => {
    const onScroll = () => {
      setStuck(window.scrollY > 8);
      let act: string | null = null;
      document.querySelectorAll<HTMLElement>("section.msec").forEach((s) => {
        if (s.getBoundingClientRect().top <= 190) act = s.dataset.cat ?? null;
      });
      if (act) setActive(act);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [groups.length]);

  const current = active && groups.some((g) => g.c.id === active) ? active : (groups[0]?.c.id ?? null);

  return (
    <main className="app app--menu">
      <div className={`head${stuck ? " stuck" : ""}`}>
        <div className="hrow">
          <h1>Menu</h1>
          <CartButton />
        </div>
        <label className="search" style={{ marginTop: 12 }}>
          <SearchIcon />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search biryani, wraps, brownie" aria-label="Search menu" enterKeyHint="search" />
          {query ? <button type="button" className="clr" onClick={() => setQuery("")}>Clear</button> : null}
        </label>
        <div className="veg" role="group" aria-label="Filter by diet">
          {(["all", "veg", "nonveg"] as const).map((d) => (
            <button key={d} type="button" className="pill" aria-pressed={diet === d} onClick={() => setDiet(d)}>
              {d === "all" ? "All" : d === "veg" ? "Veg" : "Non-veg"}
            </button>
          ))}
        </div>
        <nav className="jump" aria-label="Jump to category">
          {groups.map((g) => (
            <button
              key={g.c.id}
              type="button"
              aria-current={current === g.c.id}
              onClick={() => document.getElementById(`c-${g.c.id}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth", block: "start" })}
            >
              {g.c.name}
            </button>
          ))}
        </nav>
      </div>

      {groups.length === 0 ? (
        <div className="empty">
          <b>No dishes match</b>
          Try another word or switch the diet filter.
          <br />
          <button type="button" onClick={() => (setQuery(""), setDiet("all"))}>Show everything</button>
        </div>
      ) : (
        groups.map(({ c, list }) => (
          <section key={c.id} className="msec" id={`c-${c.id}`} data-cat={c.id}>
            <div className="list">
              <div className="sh">
                <h2>{c.name}</h2>
                <span>{list.length} {list.length === 1 ? "dish" : "dishes"}</span>
              </div>
              <div className="group">
                {list.map((p) => <Row key={p.id} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />)}
              </div>
            </div>
          </section>
        ))
      )}
    </main>
  );
}
