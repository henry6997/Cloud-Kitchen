"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Banner, Category, Product } from "@blip/db";
import { Switch, useToast } from "@blip/ui";
import { deleteBannerAction, reorderBannersAction, saveBannerAction } from "@/app/actions";
import { ImageUpload } from "./image-upload";

type Draft = Omit<Banner, "id" | "sortOrder"> & { id?: string };

function Card({ banner, slot, index, count, categories, products, onMove, onDone }: { banner: Draft; slot: "hero" | "strip"; index: number; count: number; categories: Category[]; products: Product[]; onMove: (d: -1 | 1) => void; onDone?: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [b, setB] = useState(banner);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(b) !== JSON.stringify(banner);

  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveBannerAction({ id: b.id, label: b.label, imageUrl: b.imageUrl, linkType: b.linkType, linkTarget: b.linkTarget, slot, isActive: b.isActive });
      if (!res.ok) return setError(res.error);
      toast("Banner saved");
      onDone?.();
      router.refresh();
    });

  return (
    <div className="bcard">
      <div className={`banner-prev${slot === "strip" ? " strip" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {b.imageUrl ? <img src={b.imageUrl} alt={b.label} /> : <span>{slot === "hero" ? "Hero · 16:8" : "Strip · 16:5"}</span>}
      </div>
      <ImageUpload label="Image" value={b.imageUrl} onChange={(u) => setB({ ...b, imageUrl: u })} hint={slot === "hero" ? "Best at 16:8" : "Best at 16:5"} />
      <label className="field" style={{ marginTop: 0 }}>
        <span>Caption (read aloud by screen readers)</span>
        <input value={b.label} onChange={(e) => setB({ ...b, label: e.target.value })} maxLength={60} />
      </label>
      <label className="field" style={{ marginTop: 0 }}>
        <span>Tapping it opens</span>
        <select value={b.linkType} onChange={(e) => setB({ ...b, linkType: e.target.value as Banner["linkType"], linkTarget: "" })}>
          <option value="none">Nothing</option>
          <option value="category">A category</option>
          <option value="product">A dish</option>
          <option value="url">A web address</option>
        </select>
      </label>
      {b.linkType === "category" ? (
        <select aria-label="Category" value={b.linkTarget} onChange={(e) => setB({ ...b, linkTarget: e.target.value })} style={{ minHeight: 48, border: "1px solid var(--line)", borderRadius: 12, background: "var(--bg)", padding: "0 10px" }}>
          <option value="">Choose…</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      ) : null}
      {b.linkType === "product" ? (
        <select aria-label="Dish" value={b.linkTarget} onChange={(e) => setB({ ...b, linkTarget: e.target.value })} style={{ minHeight: 48, border: "1px solid var(--line)", borderRadius: 12, background: "var(--bg)", padding: "0 10px" }}>
          <option value="">Choose…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      ) : null}
      {b.linkType === "url" ? <input aria-label="Web address" value={b.linkTarget} onChange={(e) => setB({ ...b, linkTarget: e.target.value })} placeholder="https://…" style={{ minHeight: 48, border: "1px solid var(--line)", borderRadius: 12, background: "var(--bg)", padding: "0 12px" }} /> : null}
      <div className="row-between">
        <span className="sw-inline"><Switch checked={b.isActive} onCheckedChange={(v) => setB({ ...b, isActive: v })} label="Banner active" /> {b.isActive ? "Showing" : "Hidden"}</span>
        <span style={{ display: "flex", gap: 6 }}>
          <button type="button" className="ib" aria-label="Move earlier" disabled={!b.id || index === 0} onClick={() => onMove(-1)}>←</button>
          <button type="button" className="ib" aria-label="Move later" disabled={!b.id || index === count - 1} onClick={() => onMove(1)}>→</button>
        </span>
      </div>
      {error ? <p className="err" role="alert" style={{ margin: 0 }}>{error}</p> : null}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn primary sm" onClick={save} disabled={pending || (!dirty && !!b.id)}>{pending ? "Saving…" : b.id ? "Save changes" : "Add banner"}</button>
        {b.id ? (
          <button type="button" className="btn ghost sm" disabled={pending} onClick={() => window.confirm("Delete this banner?") && start(async () => { await deleteBannerAction(b.id!); toast("Banner deleted"); router.refresh(); })}>Delete</button>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, slot, banners, categories, products }: { title: string; slot: "hero" | "strip"; banners: Banner[]; categories: Category[]; products: Product[] }) {
  const router = useRouter();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [, start] = useTransition();
  const blank: Draft = { label: "", imageUrl: null, linkType: "none", linkTarget: "", slot, isActive: true };

  const move = (i: number, d: -1 | 1) => {
    const ids = banners.map((b) => b.id);
    [ids[i], ids[i + d]] = [ids[i + d]!, ids[i]!];
    start(async () => {
      await reorderBannersAction(slot, ids);
      toast("Order saved");
      router.refresh();
    });
  };

  return (
    <section className="mt" aria-label={title}>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{title}</h2>
        <button type="button" className="btn sm" onClick={() => setAdding(true)} disabled={adding}>Add a banner</button>
      </div>
      <div className="bgrid">
        {banners.map((b, i) => <Card key={b.id + b.imageUrl + b.label} banner={b} slot={slot} index={i} count={banners.length} categories={categories} products={products} onMove={(d) => move(i, d)} />)}
        {adding ? <Card key="new" banner={blank} slot={slot} index={0} count={0} categories={categories} products={products} onMove={() => undefined} onDone={() => setAdding(false)} /> : null}
      </div>
      {banners.length === 0 && !adding ? <p className="hint">No banners yet. The home screen keeps a quiet placeholder.</p> : null}
    </section>
  );
}

export function BannersView({ banners, categories, products }: { banners: Banner[]; categories: Category[]; products: Product[] }) {
  return (
    <>
      <p className="hint" style={{ marginTop: 0 }}>Banners come from here to the customer home screen. Hero banners swipe at the top (16:8); the strip sits between the dishes and combos (16:5).</p>
      <Section title="Hero banners" slot="hero" banners={banners.filter((b) => b.slot === "hero")} categories={categories} products={products} />
      <Section title="Strip banner" slot="strip" banners={banners.filter((b) => b.slot === "strip")} categories={categories} products={products} />
    </>
  );
}
