import Link from "next/link";
import { inr, tabOf } from "@blip/db";
import { getRepo } from "@blip/db/server";
import { PayChip, StatusChip } from "@/components/status-chip";
import { formatTime, isToday } from "@/lib/ist";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const repo = getRepo();
  const [orders, notes] = await Promise.all([repo.listOrders(), repo.listNotifications(100)]);
  const unseen = new Set(notes.filter((n) => !n.isRead && n.kind !== "cancelled").map((n) => n.orderId));
  const today = orders.filter((o) => isToday(o.createdAt));
  const live = today.filter((o) => o.status !== "cancelled");
  const sales = live.reduce((a, o) => a + o.totalPaise, 0);
  const needs = orders.filter((o) => o.status === "placed" || o.status === "accepted");
  const cash = orders.filter((o) => o.paymentMethod === "cod" && o.paymentStatus === "pending" && o.status !== "cancelled" && (o.status === "delivered" || o.status === "picked_up"));
  const inKitchen = orders.filter((o) => ["preparing", "ready", "out_for_delivery"].includes(o.status));

  return (
    <>
      <div className="kpis">
        <div className="kpi"><small>Orders today</small><b>{live.length}</b></div>
        <div className="kpi"><small>Sales today</small><b>{inr(sales)}</b></div>
        <div className={`kpi action${needs.length > 0 ? " hot" : ""}`}><small>Need action</small><b>{needs.length}</b></div>
      </div>

      <div className="two mt">
        <section className="panel" aria-labelledby="needs">
          <h2 id="needs" className="panel-h">Orders needing action <Link className="link" style={{ fontWeight: 400, fontSize: 14 }} href="/orders">All orders</Link></h2>
          {needs.length === 0 ? (
            <div className="empty" style={{ padding: "36px 18px" }}><span className="glyph" aria-hidden="true">✓</span><b>All caught up</b>New orders will appear here.</div>
          ) : (
            needs.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className={`trow${unseen.has(o.id) ? " fresh" : ""}`} style={{ ["--cols" as string]: "70px 1fr auto auto", ["--cols-m" as string]: "60px 1fr auto" }}>
                <b>#{o.number}</b>
                <span>{o.customerName}<span className="sub">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span></span>
                <span className="r"><b style={{ fontWeight: 600 }}>{inr(o.totalPaise)}</b><span className="sub">{formatTime(o.createdAt)}</span></span>
                <span className="hide-m"><StatusChip status={o.status} /></span>
              </Link>
            ))
          )}
        </section>

        <div className="stack">
          <section className="panel" aria-labelledby="kitchen">
            <h2 id="kitchen" className="panel-h">In the kitchen <span className="chip">{inKitchen.length}</span></h2>
            {inKitchen.length === 0 ? <p className="hint" style={{ padding: 18, margin: 0 }}>Nothing being prepared right now.</p> : null}
            {inKitchen.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="trow" style={{ ["--cols" as string]: "60px 1fr auto" }}>
                <b>#{o.number}</b>
                <span className="mut">{o.type === "delivery" ? "Delivery" : "Pickup"} · {o.items.reduce((a, i) => a + i.quantity, 0)} items</span>
                <StatusChip status={o.status} />
              </Link>
            ))}
          </section>

          {cash.length > 0 ? (
            <section className="panel" aria-labelledby="cash">
              <h2 id="cash" className="panel-h">Cash not marked collected</h2>
              {cash.map((o) => (
                <Link key={o.id} href={`/orders/${o.id}`} className="trow" style={{ ["--cols" as string]: "60px 1fr auto" }}>
                  <b>#{o.number}</b>
                  <span className="mut">{o.customerName}</span>
                  <PayChip o={o} />
                </Link>
              ))}
            </section>
          ) : null}
        </div>
      </div>
      <p className="hint mt">Counts use the kitchen day in India. Completed today: {today.filter((o) => tabOf(o) === "completed").length}.</p>
    </>
  );
}
