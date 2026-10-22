"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { inr, isFinal, STATUS_LABEL, type Order } from "@blip/db";
import { Empty, useToast } from "@blip/ui";
import { reorderAction } from "@/app/actions";
import { useCart } from "./cart-provider";
import { LocalTime } from "./local-time";

function Card({ o }: { o: Order }) {
  const cart = useCart();
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const cancelled = o.status === "cancelled";
  const done = isFinal(o.type, o.status);

  const reorder = () =>
    start(async () => {
      const { lines, skipped } = await reorderAction(o.id);
      lines.forEach((l) => cart.addLine({ ...l, note: "" }));
      if (!lines.length) return toast("Those dishes aren't available right now");
      toast(skipped.length ? `Added ${lines.length}, skipped ${skipped.length} unavailable` : "Added to your cart");
      router.push("/cart");
    });

  return (
    <div className="ocard">
      <div className="row-between">
        <Link className="stretch" href={`/order/${o.id}`}><b style={{ fontWeight: 500 }}>Order #{o.number}</b></Link>
        <span className={`chip${cancelled ? " bad" : done ? " ok" : " dark"}`}>{STATUS_LABEL[o.status]}</span>
      </div>
      <div className="meta"><LocalTime iso={o.createdAt} kind="datetime" /> · {o.type === "delivery" ? "Delivery" : "Pickup"}</div>
      <p className="lines">{o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}</p>
      <div className="row-between" style={{ marginTop: 10 }}>
        <b style={{ fontWeight: 600 }}>{inr(o.totalPaise)}</b>
        <button type="button" className="btn sm" onClick={reorder} disabled={pending}>{pending ? "Adding…" : "Reorder"}</button>
      </div>
    </div>
  );
}

export function OrdersView({ orders }: { orders: Order[] }) {
  const active = orders.filter((o) => !isFinal(o.type, o.status) && !(o.paymentMethod === "online" && o.paymentStatus === "failed"));
  const past = orders.filter((o) => !active.includes(o));
  return (
    <main className="app app--menu">
      <div className="head"><div className="hrow"><h1>Orders</h1></div></div>
      <div className="list">
        {orders.length === 0 ? (
          <Empty glyph="🍽️" title="No orders yet">
            Your first order will show up here, with a Reorder button for next time.
            <br />
            <Link className="ghost" href="/menu">Browse the menu</Link>
          </Empty>
        ) : (
          <>
            {active.length > 0 ? (
              <>
                <div className="sec"><h2>In progress</h2></div>
                {active.map((o) => <Card key={o.id} o={o} />)}
              </>
            ) : null}
            {past.length > 0 ? (
              <>
                <div className="sec"><h2>Past orders</h2></div>
                {past.map((o) => <Card key={o.id} o={o} />)}
              </>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
