import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPhone, inr } from "@blip/db";
import { getRepo } from "@blip/db/server";
import { PayChip, StatusChip } from "@/components/status-chip";
import { formatDateTime } from "@/lib/ist";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepo();
  const profile = await repo.getProfile(id);
  if (!profile || profile.role !== "customer") notFound();
  const orders = (await repo.listCustomerOrders(id)).filter((o) => o.paymentMethod === "cod" || o.paymentStatus !== "pending");
  const spent = orders.filter((o) => o.status !== "cancelled").reduce((a, o) => a + o.totalPaise, 0);

  return (
    <>
      <p style={{ margin: "0 0 14px" }}><Link className="link" href="/customers" style={{ fontWeight: 400 }}>← All customers</Link></p>
      <div className="two">
        <section className="panel" aria-labelledby="hist">
          <h2 id="hist" className="panel-h">Order history <span className="chip">{orders.length}</span></h2>
          {orders.length === 0 ? <p className="hint" style={{ padding: 18, margin: 0 }}>No orders yet.</p> : null}
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="trow" style={{ ["--cols" as string]: "80px minmax(0,1fr) 100px 130px", ["--cols-m" as string]: "64px minmax(0,1fr) auto" }}>
              <b>#{o.number}</b>
              <span className="mut">{formatDateTime(o.createdAt)}<span className="sub">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span></span>
              <span className="r"><b style={{ fontWeight: 500 }}>{inr(o.totalPaise)}</b></span>
              <span className="hide-m"><StatusChip status={o.status} /></span>
            </Link>
          ))}
        </section>
        <section className="panel" aria-labelledby="who">
          <h2 id="who" className="panel-h">Customer</h2>
          <div className="panel-b">
            <b style={{ fontWeight: 500 }}>{profile.fullName}</b>
            <div><a className="link" style={{ fontWeight: 400 }} href={`tel:${profile.phone}`}>{formatPhone(profile.phone)}</a></div>
            <div className="mut" style={{ color: "var(--mute)" }}>{profile.email}</div>
            <hr className="hr-line" />
            <div className="kpi" style={{ padding: 14 }}><small>Total spent</small><b>{inr(spent)}</b></div>
            {orders[0] ? <p className="hint" style={{ marginBottom: 0 }}>Latest payment: <PayChip o={orders[0]} /></p> : null}
          </div>
        </section>
      </div>
    </>
  );
}
