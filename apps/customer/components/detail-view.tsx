"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { inr, type Product } from "@blip/db";
import { BackIcon, Photo, useToast } from "@blip/ui";
import { CartButton } from "./cart-button";
import { useCart } from "./cart-provider";

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n));

export function BackButton({ fallback = "/menu", label = "Back" }: { fallback?: string; label?: string }) {
  const router = useRouter();
  return (
    <button type="button" className="ib" aria-label={label} onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}>
      <BackIcon />
    </button>
  );
}

export function DetailView({ product: p, related }: { product: Product; related: Product[] }) {
  const cart = useCart();
  const toast = useToast();
  const [picked, setPicked] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(p.optionGroups.map((g) => [g.id, g.kind === "single" && g.isRequired ? [g.options.find((o) => o.isAvailable)?.id ?? ""] : []])),
  );
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const optionIds = useMemo(() => Object.values(picked).flat().filter(Boolean), [picked]);
  const chosen = p.optionGroups.flatMap((g) => g.options.filter((o) => optionIds.includes(o.id)));
  const unit = p.pricePaise + chosen.reduce((a, o) => a + o.priceDeltaPaise, 0);
  const missing = p.optionGroups.find((g) => g.isRequired && !(picked[g.id] ?? []).length);
  const projected = cart.subtotalPaise + unit * qty;
  const remaining = cart.freeAtPaise - projected;

  const toggle = (gid: string, oid: string, single: boolean) =>
    setPicked((cur) => {
      const now = cur[gid] ?? [];
      return { ...cur, [gid]: single ? [oid] : now.includes(oid) ? now.filter((x) => x !== oid) : [...now, oid] };
    });

  const add = () => {
    cart.addLine({ productId: p.id, name: p.name, emoji: p.emoji, imageUrl: p.imageUrl, optionIds, optionsLabel: chosen.map((o) => o.name).join(", "), unitPaise: unit, quantity: qty, note: note.trim() });
    toast(`Added ${qty} × ${p.name}`);
    setDone(true);
    setTimeout(() => setDone(false), 1200);
    setQty(1);
  };

  return (
    <>
      <main className="app app--detail">
        <header className={`dtop${stuck ? " stuck" : ""}`}>
          <BackButton label="Back to menu" />
          <span className="ttl" aria-hidden="true">{p.name}</span>
          <CartButton icon="svg" />
        </header>

        <div className="hero" aria-hidden="true">
          <Photo src={p.imageUrl} emoji={p.emoji} />
          {p.tag ? <span className="tag">{p.tag}</span> : null}
          <span className={`vm${p.isVeg ? " veg-on" : ""}`} title={p.isVeg ? "Veg" : "Non-veg"} />
        </div>

        <h1>{p.name}</h1>
        <div className="facts">
          <span>★ {p.rating} ({compact(p.ratingCount)} ratings)</span>
          <span>Ready in {p.prepMinutes}–{p.prepMinutes + 5} min</span>
        </div>
        <p className="desc">{p.description}</p>
        <div className="price-row">
          <span className="price">
            {inr(p.pricePaise)}
            <small>base price</small>
          </span>
        </div>

        {p.optionGroups.map((g) => (
          <fieldset key={g.id} className="card" style={{ marginLeft: 0, marginRight: 0 }}>
            <legend>
              <h2 style={{ margin: 0 }}>
                {g.name} <span>{g.isRequired ? "Required" : "Optional"}</span>
              </h2>
            </legend>
            <p className="hint">{g.kind === "single" ? "Choose one" : "Pick any"}</p>
            <div>
              {g.options.map((o) => (
                <label key={o.id} className="opt">
                  <input
                    type={g.kind === "single" ? "radio" : "checkbox"}
                    name={g.id}
                    value={o.id}
                    disabled={!o.isAvailable}
                    checked={(picked[g.id] ?? []).includes(o.id)}
                    onChange={() => toggle(g.id, o.id, g.kind === "single")}
                  />
                  <span className="ot"><span>{o.name}</span>{o.isAvailable ? null : <small>Unavailable today</small>}</span>
                  <span className="op">{o.priceDeltaPaise ? `+${inr(o.priceDeltaPaise)}` : g.kind === "single" ? "Included" : ""}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="card flat">
          <button type="button" className="more" aria-expanded={noteOpen} aria-controls="note" onClick={() => setNoteOpen((o) => !o)}>
            {noteOpen ? "Hide note" : "Add a note for the kitchen"}
          </button>
          {noteOpen ? (
            <div id="note">
              <textarea className="note" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Less spicy, no onion, etc." aria-label="Note for the kitchen" autoFocus />
              <span className="cnt">{note.length} / 140</span>
            </div>
          ) : null}
        </div>

        {related.length > 0 ? (
          <>
            <h2 className="sec-h">Goes well with</h2>
            <div className="hs" style={{ scrollSnapType: "none" }}>
              {related.map((r) => (
                <Link key={r.id} href={`/menu/${r.id}`} className="rel">
                  <div className="im" aria-hidden="true"><Photo src={r.imageUrl} emoji={r.emoji} /></div>
                  <b>{r.name}</b>
                  <span className="p">{inr(r.pricePaise)}</span>
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </main>

      <div className="bar">
        <div className="wrap">
          <div className={`gm${remaining <= 0 ? " ok" : ""}`} aria-live="polite">
            {remaining <= 0 ? "Free delivery unlocked" : `Add ${inr(remaining)} more for free delivery`}
          </div>
          <div className="brow">
            <div className="step" role="group" aria-label="Quantity">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
              <span aria-live="polite">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Increase quantity">+</button>
            </div>
            <button type="button" className={`cta${done ? " done" : ""}`} onClick={add} disabled={!p.isAvailable || !!missing}>
              <span>{!p.isAvailable ? "Unavailable right now" : done ? "Added to cart ✓" : "Add to cart"}</span>
              <span>{inr(unit * qty)}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
