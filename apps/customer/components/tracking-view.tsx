"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { chainFor, formatPhone, inr, isConfirmed, STATUS_LABEL, type Order, type Settings } from "@blip/db";
import { useToast } from "@blip/ui";
import { retryPaymentAction } from "@/app/actions";
import { openCashfree } from "./cashfree";
import { BackButton } from "./detail-view";
import { LocalTime } from "./local-time";
import { PushPrompt } from "./push-prompt";
import { useLiveOrder } from "./use-live-order";

const SUB: Partial<Record<Order["status"], string>> = {
  placed: "Waiting for the kitchen",
  accepted: "The kitchen has your order",
  preparing: "Cooking fresh",
  ready: "Packed and ready",
  out_for_delivery: "On the way to you",
  delivered: "Enjoy your meal",
  picked_up: "Enjoy your meal",
};

export function TrackingView({ order: initial, settings, justPlaced, returning }: { order: Order; settings: Pick<Settings, "phone" | "address" | "kitchenName" | "deliveryEtaText" | "pickupEtaMinutes">; justPlaced: boolean; returning: boolean }) {
  const order = useLiveOrder(initial);
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const chain = chainFor(order.type);
  const idx = chain.indexOf(order.status);
  const cancelled = order.status === "cancelled";
  const final = !cancelled && idx === chain.length - 1;
  const confirmed = isConfirmed(order);
  const awaitingPayment = order.paymentMethod === "online" && order.paymentStatus !== "paid" && order.paymentStatus !== "refunded" && !cancelled;
  const eventAt = (s: string) => order.events.find((e) => e.status === s)?.createdAt;

  const pay = () => {
    setError(null);
    start(async () => {
      const res = await retryPaymentAction(order.id);
      if (!res.ok) return setError(res.error);
      if (res.next === "demo-pay") return router.push(`/pay/${order.id}`);
      if (res.next === "cashfree" && res.sessionId) {
        try {
          await openCashfree(res.sessionId, res.mode ?? "sandbox");
        } catch {
          setError("Couldn't open the payment window. Try again.");
        }
      }
    });
  };

  const eta = cancelled || final ? null : order.type === "delivery" ? settings.deliveryEtaText : `Ready in ~${settings.pickupEtaMinutes} min`;

  return (
    <main className="app app--detail app--tabs-only">
      <header className="dtop">
        <BackButton fallback="/orders" label="Back to orders" />
        <span className="ttl show">Order #{order.number}</span>
        <span className="ib" style={{ visibility: "hidden" }} aria-hidden="true" />
      </header>

      {justPlaced && confirmed && !cancelled && order.status === "placed" ? (
        <div className="confirm" role="status">
          <span className="tick" aria-hidden="true">✓</span>
          <h1>{order.paymentMethod === "online" ? "Payment received" : "Order placed"}</h1>
          <p className="desc" style={{ marginTop: 6 }}>The kitchen has your order. You can follow it right here.</p>
        </div>
      ) : (
        <h1 className="page-title">{cancelled ? "Order cancelled" : final ? (order.type === "delivery" ? "Delivered" : "Picked up") : awaitingPayment ? "Waiting for payment" : STATUS_LABEL[order.status]}</h1>
      )}

      {justPlaced && confirmed && !cancelled ? <PushPrompt /> : null}

      {awaitingPayment ? (
        <div className="card flat">
          <h2>{order.paymentStatus === "failed" ? "Payment didn't go through" : returning ? "Confirming your payment…" : "Complete your payment"}</h2>
          <p className="desc" style={{ marginTop: 6 }}>Your order is saved but the kitchen only sees it once {inr(order.totalPaise)} is paid.</p>
          {error ? <p className="err" role="alert">{error}</p> : null}
          <button type="button" className="btn primary block" style={{ marginTop: 14 }} onClick={pay} disabled={pending}>{pending ? "Opening…" : order.paymentStatus === "failed" ? "Try again" : "Pay now"}</button>
        </div>
      ) : null}

      {cancelled ? (
        <div className="card flat">
          <h2>Cancelled by the kitchen</h2>
          {order.cancelReason ? <p className="desc" style={{ marginTop: 6 }}>{order.cancelReason}</p> : null}
          {order.paymentMethod === "online" && order.paymentStatus === "refunded" ? <p className="desc">Your payment will be refunded to the original method.</p> : null}
        </div>
      ) : confirmed ? (
        <div className="card flat">
          <div className="eta">
            <h2 style={{ margin: 0, display: "block" }}>{final ? "All done" : "Status"}</h2>
            {eta ? <b>{eta}</b> : null}
          </div>
          <ol className="trk" aria-label="Order progress">
            {chain.map((s, i) => {
              const state = i < idx || final ? "done" : i === idx ? "now" : "";
              const at = eventAt(s);
              return (
                <li key={s} className={state} aria-current={state === "now" ? "step" : undefined}>
                  <span className="d" aria-hidden="true">{state === "done" ? "✓" : ""}</span>
                  <span className="tx">
                    {STATUS_LABEL[s]}
                    <small>{at ? <LocalTime iso={at} /> : SUB[s] ?? ""}{at && state === "now" && SUB[s] ? ` · ${SUB[s]}` : ""}</small>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      {order.type === "delivery" && !cancelled && order.riderName ? (
        <div className="card flat">
          <h2>Your rider</h2>
          <div className="row-between" style={{ marginTop: 8 }}>
            <div><b style={{ fontWeight: 500 }}>{order.riderName}</b>{order.riderPhone ? <div className="meta" style={{ marginTop: 0 }}>{formatPhone(order.riderPhone)}</div> : null}</div>
            {order.riderPhone ? <a className="btn sm" href={`tel:${order.riderPhone}`}>Call rider</a> : null}
          </div>
        </div>
      ) : null}

      <div className="card flat">
        <h2>{order.type === "delivery" ? "Delivering to" : "Pick up from"}</h2>
        <p className="desc" style={{ marginTop: 8 }}>
          {order.type === "delivery" && order.addressSnapshot ? (
            <>{order.addressSnapshot.label}: {[order.addressSnapshot.line1, order.addressSnapshot.line2, order.addressSnapshot.landmark].filter(Boolean).join(", ")} · {order.addressSnapshot.pincode}</>
          ) : (
            <>{settings.kitchenName}<br />{settings.address}</>
          )}
        </p>
        <a className="btn block" style={{ marginTop: 12 }} href={`tel:${settings.phone}`}>Call kitchen</a>
      </div>

      <div className="card bill">
        <h2>Your order <span>#{order.number} · <LocalTime iso={order.createdAt} kind="datetime" /></span></h2>
        {order.items.map((it) => (
          <div key={it.id} className="br" style={{ alignItems: "flex-start" }}>
            <span style={{ minWidth: 0 }}>
              {it.quantity} × {it.name}
              {it.options.length ? <span className="meta" style={{ display: "block", marginTop: 0 }}>{it.options.map((o) => o.name).join(", ")}</span> : null}
            </span>
            <b>{inr(it.unitPricePaise * it.quantity)}</b>
          </div>
        ))}
        <div className="br" style={{ borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 10 }}><span>Items</span><b>{inr(order.subtotalPaise)}</b></div>
        <div className="br"><span>{order.type === "delivery" ? "Delivery" : "Pickup"}</span><b>{order.deliveryFeePaise ? inr(order.deliveryFeePaise) : order.type === "delivery" ? "Free" : "No fee"}</b></div>
        {order.taxPaise > 0 ? <div className="br"><span>GST</span><b>{inr(order.taxPaise)}</b></div> : null}
        <div className="br tot"><span>Total</span><span>{inr(order.totalPaise)}</span></div>
        <p className="hint" style={{ margin: "8px 0 0" }}>
          {order.paymentMethod === "cod"
            ? order.paymentStatus === "collected" ? "Paid in cash" : `Pay ${inr(order.totalPaise)} on ${order.type === "delivery" ? "delivery" : "pickup"}`
            : order.paymentStatus === "paid" ? "Paid online" : order.paymentStatus === "refunded" ? "Refunded" : "Online payment pending"}
          {order.note ? ` · Note: ${order.note}` : ""}
        </p>
      </div>

      <p style={{ textAlign: "center", marginTop: 20 }}>
        <Link className="link" href="/menu" onClick={() => toast("Back to the menu")}>Order something else</Link>
      </p>
    </main>
  );
}
