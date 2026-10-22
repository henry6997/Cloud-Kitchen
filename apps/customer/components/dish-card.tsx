"use client";
import Link from "next/link";
import { inr, type Product } from "@blip/db";
import { Photo, useToast } from "@blip/ui";
import { plainKey, useCart } from "./cart-provider";

export function DishCard({ p, wide = false }: { p: Product; wide?: boolean }) {
  const cart = useCart();
  const toast = useToast();
  const customisable = p.optionGroups.length > 0;
  const q = cart.qtyOf(p.id);

  const add = () => {
    cart.addLine({ productId: p.id, name: p.name, emoji: p.emoji, imageUrl: p.imageUrl, optionIds: [], optionsLabel: "", unitPaise: p.pricePaise, quantity: 1, note: "" });
    toast(`Added ${p.name}`);
  };
  const dec = () => {
    cart.setQty(plainKey(p.id), q - 1);
    toast(`Removed ${p.name}`);
  };

  return (
    <article className={`dish${wide ? " wide" : ""}`}>
      <div className="im" aria-hidden="true">
        <Photo src={p.imageUrl} emoji={p.emoji} />
        {p.tag ? <span className="tag">{p.tag}</span> : null}
      </div>
      <div className="bd">
        <h3><Link href={`/menu/${p.id}`}>{p.name}</Link></h3>
        <p>{p.description.split(".")[0]}</p>
        {p.isCombo ? null : <div className="meta">★ {p.rating} · {p.prepMinutes} min</div>}
        <div className="row">
          <span className="price">
            {inr(p.pricePaise)}
            {p.comparePricePaise ? <s>{inr(p.comparePricePaise)}</s> : null}
          </span>
          {customisable ? (
            <Link className="add" href={`/menu/${p.id}`} aria-label={`Choose options for ${p.name}`}>ADD</Link>
          ) : q > 0 ? (
            <div className="step" role="group" aria-label={`Quantity of ${p.name}`}>
              <button type="button" onClick={dec} aria-label="Remove one">−</button>
              <span aria-live="polite">{q}</span>
              <button type="button" onClick={add} aria-label="Add one">+</button>
            </div>
          ) : (
            <button type="button" className="add" onClick={add} aria-label={`Add ${p.name}`}>ADD</button>
          )}
        </div>
      </div>
    </article>
  );
}

export function DishSkeletons({ n = 4, wide = false }: { n?: number; wide?: boolean }) {
  return Array.from({ length: n }, (_, i) => (
    <div key={i} className={`dish${wide ? " wide" : ""} sk`}>
      <div className="im" />
      <div className="bd"><h3>&nbsp;</h3><p>&nbsp;</p></div>
    </div>
  ));
}
