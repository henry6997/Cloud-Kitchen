"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { paiseToRupeesString, parseRupeesToPaise, type Category, type Product } from "@blip/db";
import { Switch, useToast } from "@blip/ui";
import { deleteProductAction, saveProductAction } from "@/app/actions";
import { ImageUpload } from "./image-upload";

interface OptionDraft { id?: string; name: string; price: string; isAvailable: boolean }
interface GroupDraft { id?: string; name: string; kind: "single" | "multiple"; isRequired: boolean; options: OptionDraft[] }

const toDraft = (p?: Product): GroupDraft[] =>
  (p?.optionGroups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    kind: g.kind,
    isRequired: g.isRequired,
    options: g.options.map((o) => ({ id: o.id, name: o.name, price: paiseToRupeesString(o.priceDeltaPaise), isAvailable: o.isAvailable })),
  }));

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    name: product?.name ?? "",
    categoryId: product?.categoryId ?? categories[0]?.id ?? "",
    price: product ? paiseToRupeesString(product.pricePaise) : "",
    compare: product?.comparePricePaise ? paiseToRupeesString(product.comparePricePaise) : "",
    description: product?.description ?? "",
    emoji: product?.emoji ?? "🍽️",
    tag: product?.tag ?? "",
    prep: String(product?.prepMinutes ?? 20),
    isVeg: product?.isVeg ?? true,
    isAvailable: product?.isAvailable ?? true,
    isPopular: product?.isPopular ?? false,
    isCombo: product?.isCombo ?? false,
    imageUrl: product?.imageUrl ?? null,
  });
  const [groups, setGroups] = useState<GroupDraft[]>(toDraft(product));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((cur) => ({ ...cur, [k]: v }));

  const patchGroup = (i: number, patch: Partial<GroupDraft>) => setGroups((g) => g.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const patchOption = (gi: number, oi: number, patch: Partial<OptionDraft>) =>
    setGroups((g) => g.map((x, k) => (k === gi ? { ...x, options: x.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) } : x)));

  const save = () => {
    setError(null);
    const price = parseRupeesToPaise(f.price);
    if (price === null) return setError("Enter the price in rupees, like 249");
    const compare = f.compare.trim() ? parseRupeesToPaise(f.compare) : null;
    if (f.compare.trim() && compare === null) return setError("The crossed-out price isn't a valid amount");
    const optionGroups: { id?: string; name: string; kind: GroupDraft["kind"]; isRequired: boolean; options: { id?: string; name: string; priceDeltaPaise: number; isAvailable: boolean }[] }[] = [];
    for (const g of groups) {
      const options: { id?: string; name: string; priceDeltaPaise: number; isAvailable: boolean }[] = [];
      for (const o of g.options) {
        const delta = o.price.trim() ? parseRupeesToPaise(o.price) : 0;
        if (delta === null) return setError(`"${o.name || "An option"}" has an invalid price`);
        options.push({ id: o.id, name: o.name, priceDeltaPaise: delta, isAvailable: o.isAvailable });
      }
      optionGroups.push({ id: g.id, name: g.name, kind: g.kind, isRequired: g.isRequired, options });
    }
    start(async () => {
      const res = await saveProductAction({
        id: product?.id,
        categoryId: f.categoryId,
        name: f.name,
        description: f.description,
        pricePaise: price,
        comparePricePaise: compare,
        imageUrl: f.imageUrl,
        emoji: f.emoji || "🍽️",
        isVeg: f.isVeg,
        isAvailable: f.isAvailable,
        isPopular: f.isPopular,
        isCombo: f.isCombo,
        tag: f.tag.trim() || null,
        prepMinutes: Number(f.prep) || 20,
        optionGroups,
      });
      if (!res.ok) return setError(res.error);
      toast("Saved");
      router.push("/products");
      router.refresh();
    });
  };

  const remove = () => {
    if (!product || !window.confirm(`Delete ${product.name}? Past orders keep their details.`)) return;
    start(async () => {
      await deleteProductAction(product.id);
      toast("Dish deleted");
      router.push("/products");
      router.refresh();
    });
  };

  return (
    <form onSubmit={(e) => (e.preventDefault(), save())}>
      <p style={{ margin: "0 0 14px" }}><Link className="link" href="/products" style={{ fontWeight: 400 }}>← All products</Link></p>
      <div className="two">
        <div className="stack">
          <section className="panel">
            <h2 className="panel-h">Details</h2>
            <div className="panel-b formgrid">
              <label className="field full" style={{ marginTop: 0 }}>
                <span>Name</span>
                <input value={f.name} onChange={(e) => set("name", e.target.value)} required maxLength={60} />
              </label>
              <label className="field">
                <span>Category</span>
                <select value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)} required>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Price (₹)</span>
                <input value={f.price} onChange={(e) => set("price", e.target.value)} required inputMode="decimal" placeholder="249" />
              </label>
              <label className="field full">
                <span>Description</span>
                <textarea value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={240} />
              </label>
              <label className="field">
                <span>Crossed-out price (₹, optional)</span>
                <input value={f.compare} onChange={(e) => set("compare", e.target.value)} inputMode="decimal" placeholder="For combos: 620" />
              </label>
              <label className="field">
                <span>Label (optional)</span>
                <input value={f.tag} onChange={(e) => set("tag", e.target.value)} maxLength={24} placeholder="Bestseller" />
              </label>
              <label className="field">
                <span>Ready in (minutes)</span>
                <input value={f.prep} onChange={(e) => set("prep", e.target.value)} inputMode="numeric" />
              </label>
              <label className="field">
                <span>Emoji (shown until a photo is added)</span>
                <input value={f.emoji} onChange={(e) => set("emoji", e.target.value)} maxLength={8} />
              </label>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-h">Options <button type="button" className="btn sm" onClick={() => setGroups((g) => [...g, { name: "", kind: "single", isRequired: false, options: [{ name: "", price: "", isAvailable: true }] }])}>Add a group</button></h2>
            <div className="panel-b">
              {groups.length === 0 ? <p className="hint" style={{ margin: 0 }}>No options. Add a group for portion sizes or add-ons.</p> : null}
              {groups.map((g, gi) => (
                <div key={gi} className="og" style={gi === 0 ? { marginTop: 0 } : undefined}>
                  <div className="formgrid">
                    <label className="field" style={{ marginTop: 0 }}>
                      <span>Group name</span>
                      <input value={g.name} onChange={(e) => patchGroup(gi, { name: e.target.value })} placeholder="Portion, Add-ons…" required />
                    </label>
                    <label className="field" style={{ marginTop: 0 }}>
                      <span>Customer can</span>
                      <select value={g.kind} onChange={(e) => patchGroup(gi, { kind: e.target.value as GroupDraft["kind"] })}>
                        <option value="single">Choose one</option>
                        <option value="multiple">Pick any</option>
                      </select>
                    </label>
                  </div>
                  <label className="opt" style={{ minHeight: 44 }}>
                    <input type="checkbox" checked={g.isRequired} onChange={(e) => patchGroup(gi, { isRequired: e.target.checked })} />
                    <span className="ot">Required</span>
                  </label>
                  {g.options.map((o, oi) => (
                    <div key={oi} className="orow">
                      <input type="text" value={o.name} aria-label="Option name" placeholder="Option" onChange={(e) => patchOption(gi, oi, { name: e.target.value })} required />
                      <input type="text" inputMode="decimal" value={o.price} aria-label="Extra price in rupees" placeholder="+ ₹0" onChange={(e) => patchOption(gi, oi, { price: e.target.value })} />
                      <Switch checked={o.isAvailable} onCheckedChange={(v) => patchOption(gi, oi, { isAvailable: v })} label={`${o.name || "Option"} available`} />
                      <button type="button" className="ib" aria-label="Remove option" onClick={() => patchGroup(gi, { options: g.options.filter((_, j) => j !== oi) })} disabled={g.options.length === 1}>✕</button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button type="button" className="btn sm" onClick={() => patchGroup(gi, { options: [...g.options, { name: "", price: "", isAvailable: true }] })}>Add an option</button>
                    <button type="button" className="btn sm ghost" onClick={() => setGroups((cur) => cur.filter((_, k) => k !== gi))}>Remove group</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <h2 className="panel-h">Photo</h2>
            <div className="panel-b"><ImageUpload value={f.imageUrl} onChange={(u) => set("imageUrl", u)} /></div>
          </section>
          <section className="panel">
            <h2 className="panel-h">Settings</h2>
            <div className="panel-b">
              {([
                ["isAvailable", "Available on the menu"],
                ["isVeg", "Vegetarian"],
                ["isPopular", "Show in Popular right now"],
                ["isCombo", "This is a combo"],
              ] as const).map(([k, label]) => (
                <div key={k} className="swrow">
                  <span>{label}</span>
                  <Switch checked={f[k]} onCheckedChange={(v) => set(k, v)} label={label} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="sticky-actions">
        {error ? <span className="err" role="alert" style={{ margin: "0 auto 0 0", alignSelf: "center" }}>{error}</span> : null}
        {product ? <button type="button" className="btn danger" onClick={remove} disabled={pending}>Delete</button> : null}
        <Link href="/products" className="btn ghost">Cancel</Link>
        <button type="submit" className="btn primary" disabled={pending}>{pending ? "Saving…" : "Save dish"}</button>
      </div>
    </form>
  );
}
