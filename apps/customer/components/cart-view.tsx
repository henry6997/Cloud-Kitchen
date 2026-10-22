"use client";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { inr, priceCart, type Product, type Settings } from "@blip/db";
import { Empty, GoalBar, Photo, QtyStepper, useToast } from "@blip/ui";
import { BackButton } from "./detail-view";
import { useCart } from "./cart-provider";

export function CartView({ products, settings }: { products: Product[]; settings: Settings }) {
  const cart = useCart();
  const toast = useToast();

  const rows = useMemo(
    () =>
      cart.lines.map((l) => {
        const priced = priceCart({ lines: [{ productId: l.productId, quantity: l.quantity, optionIds: l.optionIds, note: l.note }], products, settings, type: "delivery" });
        return { line: l, priced: priced.lines[0] ?? null, error: priced.errors[0]?.message ?? null };
      }),
    [cart.lines, products, settings],
  );
  const total = useMemo(
    () => priceCart({ lines: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, optionIds: l.optionIds, note: l.note })), products, settings, type: "delivery" }),
    [cart.lines, products, settings],
  );

  // Menu prices may have changed since the dish was added: refresh the display snapshot.
  useEffect(() => {
    if (!cart.ready) return;
    const stale = rows.some((r) => r.priced && r.priced.unitPricePaise !== r.line.unitPaise);
    if (stale) cart.replaceAll(cart.lines.map((l) => ({ ...l, unitPaise: rows.find((r) => r.line.key === l.key)?.priced?.unitPricePaise ?? l.unitPaise })));
  }, [rows, cart]);

  const hasErrors = rows.some((r) => r.error);
  const free = settings.freeDeliveryThresholdPaise;
  const pct = Math.min(100, Math.round((total.subtotalPaise / free) * 100));
  const short = Math.max(0, settings.minOrderPaise - total.subtotalPaise);

  return (
    <>
      <main className="app app--detail">
        <header className="dtop">
          <BackButton fallback="/menu" label="Back" />
          <span className="ttl show">Your cart</span>
          {cart.count > 0 ? (
            <button type="button" className="link" onClick={() => (cart.clear(), toast("Cart cleared"))}>Clear</button>
          ) : (
            <span className="ib" style={{ visibility: "hidden" }} aria-hidden="true" />
          )}
        </header>

        {!cart.ready ? null : cart.count === 0 ? (
          <Empty glyph="🛍" title="Your cart is empty">
            Add a dish you love and it will show up here.
            <br />
            <Link className="ghost" href="/menu">Browse the menu</Link>
          </Empty>
        ) : (
          <>
            <h1 className="page-title">Your cart</h1>
            <div className="card flat" style={{ paddingTop: 6, paddingBottom: 6 }}>
              {rows.map(({ line: l, priced, error }) => (
                <div key={l.key} className="crow">
                  <div style={{ minWidth: 0 }}>
                    <h3>{l.name}</h3>
                    {l.optionsLabel ? <p>{l.optionsLabel}</p> : null}
                    {l.note ? <p>Note: {l.note}</p> : null}
                    {error ? <p className="err" role="alert" style={{ margin: "4px 0 0" }}>{error}</p> : null}
                  </div>
                  <div className="lp">{priced ? inr(priced.linePaise) : "—"}</div>
                  <button type="button" className="rm" onClick={() => (cart.setQty(l.key, 0), toast(`Removed ${l.name}`))}>Remove</button>
                  {error ? null : (
                    <div className="qty">
                      <QtyStepper name={l.name} qty={l.quantity} onInc={() => cart.setQty(l.key, l.quantity + 1)} onDec={() => cart.setQty(l.key, l.quantity - 1)} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="card flat">
              <GoalBar onCard pct={pct} label={total.subtotalPaise >= free ? "Free delivery unlocked" : `Add ${inr(free - total.subtotalPaise)} more for free delivery`} />
            </div>

            <div className="card bill">
              <h2>Bill</h2>
              <div className="br"><span>Items</span><b>{inr(total.subtotalPaise)}</b></div>
              <div className={`br${total.deliveryFeePaise === 0 ? " free" : ""}`}>
                <span>Delivery</span>
                <b>{total.deliveryFeePaise === 0 ? "Free" : inr(total.deliveryFeePaise)}</b>
              </div>
              {total.taxPaise > 0 ? <div className="br"><span>GST ({settings.gstPercent}%)</span><b>{inr(total.taxPaise)}</b></div> : null}
              <div className="br tot"><span>Total</span><span>{inr(total.totalPaise)}</span></div>
              <p className="hint" style={{ margin: "8px 0 0" }}>Picking up? There's no delivery fee. You'll choose at checkout.</p>
            </div>
          </>
        )}
      </main>

      {cart.ready && cart.count > 0 ? (
        <div className="bar">
          <div className="wrap">
            {hasErrors ? <div className="gm" role="alert" style={{ color: "var(--red)" }}>Remove the unavailable dish to continue</div> : short > 0 ? <div className="gm">Add {inr(short)} more to reach the {inr(settings.minOrderPaise)} minimum</div> : null}
            {hasErrors || short > 0 ? (
              <button type="button" className="cta center" disabled>Checkout</button>
            ) : (
              <Link className="cta" href="/checkout">
                <span>Checkout</span>
                <span>{inr(total.totalPaise)}</span>
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
