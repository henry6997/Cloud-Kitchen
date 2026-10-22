"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { formatPhone, inr, priceCart, type Address, type OrderType, type PaymentMethod, type Product, type Settings } from "@blip/db";
import { Empty, useToast } from "@blip/ui";
import { placeOrderAction } from "@/app/actions";
import { AddressSheet } from "./address-sheet";
import { openCashfree } from "./cashfree";
import { useCart } from "./cart-provider";
import { BackButton } from "./detail-view";

export function CheckoutView({ products, settings, addresses: initialAddresses, phone }: { products: Product[]; settings: Settings; addresses: Address[]; phone: string }) {
  const router = useRouter();
  const cart = useCart();
  const toast = useToast();
  const [type, setType] = useState<OrderType>("delivery");
  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressId, setAddressId] = useState(initialAddresses.find((a) => a.isDefault)?.id ?? initialAddresses[0]?.id ?? "");
  const [method, setMethod] = useState<PaymentMethod>("cod");
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  const pricing = useMemo(
    () => priceCart({ lines: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, optionIds: l.optionIds, note: l.note })), products, settings, type }),
    [cart.lines, products, settings, type],
  );
  const address = addresses.find((a) => a.id === addressId);
  const unserviceable = type === "delivery" && !!address && settings.deliveryPincodes.length > 0 && !settings.deliveryPincodes.includes(address.pincode);
  const short = Math.max(0, settings.minOrderPaise - pricing.subtotalPaise);
  const blocked = pricing.errors.length > 0 || short > 0 || (type === "delivery" && (!address || unserviceable));

  const place = () => {
    setError(null);
    start(async () => {
      const res = await placeOrderAction({
        type,
        addressId: type === "delivery" ? addressId : undefined,
        paymentMethod: method,
        note,
        lines: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, optionIds: l.optionIds, note: l.note })),
      });
      if (!res.ok) {
        if (res.needsLogin) return router.push("/login?next=/checkout");
        setError(res.error);
        return toast(res.error);
      }
      setDone(true);
      cart.clear();
      if (res.next === "cashfree" && res.sessionId) {
        try {
          return await openCashfree(res.sessionId, res.mode ?? "sandbox");
        } catch {
          return router.push(`/order/${res.orderId}?placed=1`);
        }
      }
      router.push(res.next === "demo-pay" ? `/pay/${res.orderId}` : `/order/${res.orderId}?placed=1`);
    });
  };

  if (cart.ready && cart.count === 0 && !pending && !done) {
    return (
      <main className="app app--detail">
        <header className="dtop"><BackButton fallback="/menu" /><span className="ttl show">Checkout</span><span className="ib" style={{ visibility: "hidden" }} aria-hidden="true" /></header>
        <Empty glyph="🛍" title="Your cart is empty">
          Add something tasty first.
          <br />
          <Link className="ghost" href="/menu">Browse the menu</Link>
        </Empty>
      </main>
    );
  }

  const payLabel = type === "delivery" ? "Cash on delivery" : "Pay at pickup";

  return (
    <>
      <main className="app app--detail">
        <header className="dtop">
          <BackButton fallback="/cart" label="Back to cart" />
          <span className="ttl show">Checkout</span>
          <span className="ib" style={{ visibility: "hidden" }} aria-hidden="true" />
        </header>

        <div className="pills" role="group" aria-label="Delivery or pickup" style={{ marginTop: 6 }}>
          <button type="button" className="pill" style={{ flex: 1 }} aria-pressed={type === "delivery"} onClick={() => setType("delivery")}>Delivery</button>
          <button type="button" className="pill" style={{ flex: 1 }} aria-pressed={type === "pickup"} onClick={() => setType("pickup")}>Pickup</button>
        </div>

        {type === "delivery" ? (
          <fieldset className="card" style={{ marginLeft: 0, marginRight: 0 }}>
            <legend><h2 style={{ margin: 0 }}>Deliver to <span>{settings.deliveryEtaText}</span></h2></legend>
            <p className="hint">Choose one</p>
            {addresses.map((a) => (
              <label key={a.id} className="opt">
                <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                <span className="ot">
                  <span>{a.label}</span>
                  <small>{[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")} · {a.pincode}</small>
                </span>
              </label>
            ))}
            <button type="button" className="more" onClick={() => setSheet(true)}>{addresses.length ? "Add a new address" : "Add your delivery address"}</button>
            {unserviceable ? <p className="err" role="alert" style={{ margin: "0 0 12px" }}>We don't deliver to {address?.pincode} yet. Try pickup or another address.</p> : null}
          </fieldset>
        ) : (
          <div className="card flat">
            <h2>Pick up from <span>~{settings.pickupEtaMinutes} min</span></h2>
            <p className="desc" style={{ marginTop: 8 }}>{settings.kitchenName}<br />{settings.address}</p>
            <p style={{ margin: "10px 0 0" }}><a className="link" href={`tel:${settings.phone}`}>Call kitchen · {formatPhone(settings.phone)}</a></p>
          </div>
        )}

        <fieldset className="card" style={{ marginLeft: 0, marginRight: 0 }}>
          <legend><h2 style={{ margin: 0 }}>Payment</h2></legend>
          <p className="hint">Choose one</p>
          <label className="opt">
            <input type="radio" name="pay" checked={method === "online"} onChange={() => setMethod("online")} />
            <span className="ot"><span>Pay now</span><small>UPI, cards, netbanking</small></span>
          </label>
          <label className="opt">
            <input type="radio" name="pay" checked={method === "cod"} onChange={() => setMethod("cod")} />
            <span className="ot"><span>{payLabel}</span><small>{type === "delivery" ? "Pay the rider in cash or UPI" : "Pay at the counter"}</small></span>
          </label>
        </fieldset>

        <div className="card flat">
          <button type="button" className="more" aria-expanded={noteOpen} onClick={() => setNoteOpen((o) => !o)}>{noteOpen ? "Hide note" : "Add a note for the kitchen"}</button>
          {noteOpen ? (
            <>
              <textarea className="note" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ring the bell twice, no cutlery…" aria-label="Note for the kitchen" />
              <span className="cnt">{note.length} / 140</span>
            </>
          ) : null}
        </div>

        <div className="card bill">
          <h2>Summary <span>{cart.count} {cart.count === 1 ? "item" : "items"}</span></h2>
          {pricing.lines.map((l, i) => (
            <div key={i} className="br"><span>{l.quantity} × {l.name}</span><b>{inr(l.linePaise)}</b></div>
          ))}
          <div className="br" style={{ borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 10 }}><span>Items</span><b>{inr(pricing.subtotalPaise)}</b></div>
          <div className={`br${pricing.deliveryFeePaise === 0 ? " free" : ""}`}>
            <span>{type === "delivery" ? "Delivery" : "Pickup"}</span>
            <b>{type === "pickup" ? "No fee" : pricing.deliveryFeePaise === 0 ? "Free" : inr(pricing.deliveryFeePaise)}</b>
          </div>
          {pricing.taxPaise > 0 ? <div className="br"><span>GST ({settings.gstPercent}%)</span><b>{inr(pricing.taxPaise)}</b></div> : null}
          <div className="br tot"><span>To pay</span><span>{inr(pricing.totalPaise)}</span></div>
          <p className="hint" style={{ margin: "8px 0 0" }}>Contact: {formatPhone(phone)}</p>
        </div>
      </main>

      <div className="bar">
        <div className="wrap">
          {pricing.errors[0] && !done ? <div className="gm" role="alert" style={{ color: "var(--red)" }}>{pricing.errors[0].message} <Link className="link" href="/cart" style={{ minHeight: 0 }}>Fix in cart</Link></div> : null}
          {error ? <div className="gm" role="alert" style={{ color: "var(--red)" }}>{error}</div> : null}
          {short > 0 && !done ? <div className="gm">Add {inr(short)} more to reach the {inr(settings.minOrderPaise)} minimum</div> : null}
          <button type="button" className="cta" disabled={blocked || pending || done} onClick={place}>
            <span>{pending || done ? "Placing your order…" : method === "online" ? "Pay now" : "Place order"}</span>
            <span>{inr(pricing.totalPaise)}</span>
          </button>
        </div>
      </div>

      <AddressSheet
        open={sheet}
        onOpenChange={setSheet}
        onSaved={(a) => {
          setAddresses((cur) => [a, ...cur.filter((x) => x.id !== a.id).map((x) => (a.isDefault ? { ...x, isDefault: false } : x))]);
          setAddressId(a.id);
          toast("Address saved");
        }}
      />
    </>
  );
}
