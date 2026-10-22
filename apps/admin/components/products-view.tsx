"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { inr, type Category, type Product } from "@blip/db";
import { Photo, SearchIcon, Switch, useToast, VegMark } from "@blip/ui";
import { setAvailabilityAction } from "@/app/actions";

export function ProductsView({ products: initial, categories }: { products: Product[]; categories: Category[] }) {
  const toast = useToast();
  const [products, setProducts] = useState(initial);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [, start] = useTransition();

  const rows = useMemo(
    () => products.filter((p) => (cat === "all" || p.categoryId === cat) && (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))),
    [products, q, cat],
  );
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  const setMany = (ids: string[], value: boolean) => {
    const before = products;
    setProducts((cur) => cur.map((p) => (ids.includes(p.id) ? { ...p, isAvailable: value } : p)));
    start(async () => {
      const res = await setAvailabilityAction(ids, value);
      if (!res.ok) {
        setProducts(before);
        return toast(res.error);
      }
      toast(ids.length === 1 ? (value ? "Available on the menu" : "Hidden from the menu") : `${ids.length} dishes updated`);
    });
  };

  const allOn = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const cols = { ["--cols" as string]: "32px 56px minmax(0,2fr) minmax(0,1fr) 90px 100px 70px", ["--cols-m" as string]: "32px 48px minmax(0,1fr) auto" };

  return (
    <>
      <div className="tools">
        <label className="search">
          <SearchIcon />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes" aria-label="Search dishes" />
        </label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Link href="/products/new" className="btn primary">Add a dish</Link>
      </div>

      {picked.size > 0 ? (
        <div className="panel mt" style={{ marginTop: 0, marginBottom: 12 }}>
          <div className="panel-b" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <b style={{ fontWeight: 500 }}>{picked.size} selected</b>
            <button type="button" className="btn sm" onClick={() => (setMany([...picked], true), setPicked(new Set()))}>Make available</button>
            <button type="button" className="btn sm" onClick={() => (setMany([...picked], false), setPicked(new Set()))}>Mark unavailable</button>
            <button type="button" className="btn sm ghost" onClick={() => setPicked(new Set())}>Clear</button>
          </div>
        </div>
      ) : null}

      <section className="panel" aria-label="Products">
        <div className="trow th" style={cols}>
          <input type="checkbox" aria-label="Select all" checked={allOn} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} style={{ width: 20, height: 20 }} />
          <span /><span>Dish</span><span className="hide-m">Category</span><span className="r hide-m">Price</span><span>Available</span><span />
        </div>
        {rows.length === 0 ? (
          <div className="empty" style={{ padding: "40px 18px" }}><b>No dishes found</b>Try another search or category.</div>
        ) : (
          rows.map((p) => (
            <div key={p.id} className="trow" style={cols}>
              <input
                type="checkbox"
                aria-label={`Select ${p.name}`}
                style={{ width: 20, height: 20 }}
                checked={picked.has(p.id)}
                onChange={(e) => setPicked((cur) => (e.target.checked ? new Set(cur).add(p.id) : (cur.delete(p.id), new Set(cur))))}
              />
              <span className="thumb-s"><Photo src={p.imageUrl} emoji={p.emoji} /></span>
              <span style={{ minWidth: 0 }}>
                <Link href={`/products/${p.id}`} style={{ fontWeight: 500 }}>{p.name}</Link>
                <span className="sub" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ position: "relative", width: 12, height: 12, display: "inline-block" }}><VegMark veg={p.isVeg} /></span>
                  {p.optionGroups.length ? `${p.optionGroups.length} option group${p.optionGroups.length > 1 ? "s" : ""}` : "No options"}
                  {p.isCombo ? " · Combo" : ""}
                </span>
              </span>
              <span className="mut hide-m">{catName(p.categoryId)}</span>
              <span className="r hide-m"><b style={{ fontWeight: 500 }}>{inr(p.pricePaise)}</b></span>
              <span><Switch checked={p.isAvailable} onCheckedChange={(v) => setMany([p.id], v)} label={`${p.name} available`} /></span>
              <span className="r hide-m"><Link className="link" style={{ fontWeight: 400 }} href={`/products/${p.id}`}>Edit</Link></span>
            </div>
          ))
        )}
      </section>
    </>
  );
}
