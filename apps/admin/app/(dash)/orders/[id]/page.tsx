import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPhone, inr, STATUS_LABEL } from "@blip/db";
import { getRepo } from "@blip/db/server";
import { CashButton, OrderActions, PrintButton } from "@/components/order-actions";
import { PayChip, StatusChip } from "@/components/status-chip";
import { formatDateTime } from "@/lib/ist";

export const metadata = { title: "Order" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepo();
  const [order, settings] = await Promise.all([repo.getOrder(id), repo.getSettings()]);
  if (!order) notFound();
  const cashDue = order.paymentMethod === "cod" && order.paymentStatus === "pending" && order.status !== "cancelled";

  return (
    <>
      <p style={{ margin: "0 0 14px" }}><Link className="link" href="/orders" style={{ fontWeight: 400 }}>← All orders</Link></p>
      <div className="row-between" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>Order #{order.number}</h2>
          <StatusChip status={order.status} />
          <PayChip o={order} />
        </div>
        <PrintButton />
      </div>

      <div className="two">
        <div className="stack">
          <section className="panel" aria-labelledby="items">
            <h2 id="items" className="panel-h">Items <span className="chip">{order.items.reduce((a, i) => a + i.quantity, 0)}</span></h2>
            <div className="panel-b">
              {order.items.map((i) => (
                <div key={i.id} className="itemrow">
                  <div>
                    <b style={{ fontWeight: 500 }}>{i.quantity} × {i.name}</b>
                    {i.options.length ? <small>{i.options.map((o) => o.name).join(", ")}</small> : null}
                    {i.note ? <small>Note: {i.note}</small> : null}
                  </div>
                  <b style={{ fontWeight: 500 }}>{inr(i.unitPricePaise * i.quantity)}</b>
                </div>
              ))}
              <div className="bill" style={{ paddingBottom: 0, marginTop: 8 }}>
                <div className="br"><span>Items</span><b>{inr(order.subtotalPaise)}</b></div>
                <div className="br"><span>{order.type === "delivery" ? "Delivery fee" : "Pickup"}</span><b>{order.deliveryFeePaise ? inr(order.deliveryFeePaise) : "—"}</b></div>
                {order.taxPaise ? <div className="br"><span>GST</span><b>{inr(order.taxPaise)}</b></div> : null}
                <div className="br tot"><span>Total</span><span>{inr(order.totalPaise)}</span></div>
              </div>
              {order.note ? <p className="desc" style={{ marginTop: 14 }}><b style={{ fontWeight: 500, color: "var(--ink)" }}>Kitchen note:</b> {order.note}</p> : null}
            </div>
          </section>

          <section className="panel" aria-labelledby="timeline">
            <h2 id="timeline" className="panel-h">History</h2>
            <div className="panel-b">
              {[...order.events].reverse().map((e) => (
                <div key={e.id} className="itemrow">
                  <div>{STATUS_LABEL[e.status]}{e.reason ? <small>{e.reason}</small> : null}</div>
                  <span className="mut" style={{ color: "var(--mute)", fontSize: 13.5 }}>{formatDateTime(e.createdAt)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="panel" aria-labelledby="status">
            <h2 id="status" className="panel-h">Status</h2>
            <div className="panel-b"><OrderActions order={order} /></div>
          </section>

          <section className="panel" aria-labelledby="cust">
            <h2 id="cust" className="panel-h">Customer</h2>
            <div className="panel-b">
              <b style={{ fontWeight: 500 }}>{order.customerName}</b>
              <div><a className="link" style={{ fontWeight: 400 }} href={`tel:${order.customerPhone}`}>{formatPhone(order.customerPhone)}</a></div>
              <hr className="hr-line" />
              <div className="hint" style={{ margin: 0 }}>{order.type === "delivery" ? "Deliver to" : "Pickup"}</div>
              {order.type === "delivery" && order.addressSnapshot ? (
                <p style={{ margin: "4px 0 0" }}>{order.addressSnapshot.label}: {[order.addressSnapshot.line1, order.addressSnapshot.line2, order.addressSnapshot.landmark].filter(Boolean).join(", ")} · {order.addressSnapshot.pincode}</p>
              ) : (
                <p style={{ margin: "4px 0 0" }}>Customer will collect from the kitchen.</p>
              )}
            </div>
          </section>

          <section className="panel" aria-labelledby="pay">
            <h2 id="pay" className="panel-h">Payment <PayChip o={order} /></h2>
            <div className="panel-b stack">
              <div className="br" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{order.paymentMethod === "cod" ? "Method" : "Method"}</span><b style={{ fontWeight: 500 }}>{order.paymentMethod === "cod" ? "Cash on delivery" : "Online (Cashfree)"}</b>
              </div>
              {cashDue ? (
                <>
                  <div className="kpi" style={{ padding: 14 }}><small>Cash to collect</small><b>{inr(order.totalPaise)}</b></div>
                  <CashButton order={order} />
                </>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <div className="ticket-wrap" aria-hidden="true">
        <h2>{settings.kitchenName}</h2>
        <div>Order #{order.number} · {order.type === "delivery" ? "DELIVERY" : "PICKUP"}</div>
        <div>{formatDateTime(order.createdAt)}</div>
        <hr className="hr-line" />
        {order.items.map((i) => (
          <div key={i.id}>{i.quantity} x {i.name}{i.options.length ? ` (${i.options.map((o) => o.name).join(", ")})` : ""}{i.note ? ` - ${i.note}` : ""}</div>
        ))}
        {order.note ? <div>NOTE: {order.note}</div> : null}
        <hr className="hr-line" />
        <div>Total {inr(order.totalPaise)} · {order.paymentMethod === "cod" ? `COLLECT ${inr(order.totalPaise)}` : "PAID"}</div>
        <div>{order.customerName} {order.customerPhone}</div>
        {order.addressSnapshot ? <div>{[order.addressSnapshot.line1, order.addressSnapshot.line2, order.addressSnapshot.landmark, order.addressSnapshot.pincode].filter(Boolean).join(", ")}</div> : null}
      </div>
    </>
  );
}
