import Link from "next/link";
import { inr, tabOf, type OrderTab } from "@blip/db";
import { getRepo } from "@blip/db/server";
import { PayChip, StatusChip } from "@/components/status-chip";
import { formatDateTime } from "@/lib/ist";

export const metadata = { title: "Orders" };

const TABS: { key: OrderTab; label: string; dot: string }[] = [
  { key: "new", label: "New", dot: "var(--s-new-bar)" },
  { key: "preparing", label: "Preparing", dot: "var(--s-prep-bar)" },
  { key: "ready", label: "Ready", dot: "var(--s-ready-bar)" },
  { key: "out", label: "Out for delivery", dot: "var(--s-out-bar)" },
  { key: "completed", label: "Completed", dot: "var(--s-done-bar)" },
  { key: "cancelled", label: "Cancelled", dot: "var(--s-bad-bar)" },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const current: OrderTab = TABS.some((t) => t.key === tab) ? (tab as OrderTab) : "new";
  const repo = getRepo();
  const [orders, notes] = await Promise.all([repo.listOrders(), repo.listNotifications(100)]);
  const unseen = new Set(notes.filter((n) => !n.isRead && n.kind !== "cancelled").map((n) => n.orderId));
  const counts = Object.fromEntries(TABS.map((t) => [t.key, orders.filter((o) => tabOf(o) === t.key).length])) as Record<OrderTab, number>;
  const list = orders.filter((o) => tabOf(o) === current);
  const cols = { ["--cols" as string]: "76px minmax(0,1.1fr) minmax(0,1.8fr) 84px 90px 150px 150px", ["--cols-md" as string]: "76px minmax(0,1fr) 90px 150px 150px", ["--cols-m" as string]: "64px minmax(0,1fr) auto auto" };

  return (
    <>
      <nav className="htabs" aria-label="Order status">
        {TABS.map((t) => (
          <Link key={t.key} href={`/orders?tab=${t.key}`} aria-current={t.key === current ? "page" : undefined}>
            <i className="dot" style={{ ["--dot" as string]: t.dot }} aria-hidden="true" />
            {t.label}
            <span className={`n${t.key === "new" && counts.new > 0 ? " hot" : ""}`}>{counts[t.key]}</span>
          </Link>
        ))}
      </nav>

      <section className="panel" aria-label={`${TABS.find((t) => t.key === current)?.label} orders`}>
        <div className="trow th" style={cols}>
          <span>Order</span><span>Customer</span><span className="hide-md">Items</span><span className="hide-md">Type</span><span className="r">Total</span><span>Payment</span><span>Status</span>
        </div>
        {list.length === 0 ? (
          <div className="empty" style={{ padding: "48px 18px" }}><span className="glyph" aria-hidden="true">🍽️</span><b>No {TABS.find((t) => t.key === current)?.label.toLowerCase()} orders</b>They'll show up here as they move along.</div>
        ) : (
          list.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className={`trow${unseen.has(o.id) ? " fresh" : ""}`} style={cols}>
              <span><b>#{o.number}</b><span className="sub">{formatDateTime(o.createdAt)}</span></span>
              <span>{o.customerName}<span className="sub">{o.customerPhone}</span></span>
              <span className="mut hide-m hide-md" style={{ minWidth: 0 }}>{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span>
              <span className="hide-m hide-md">{o.type === "delivery" ? "Delivery" : "Pickup"}</span>
              <span className="r"><b style={{ fontWeight: 600 }}>{inr(o.totalPaise)}</b></span>
              <span className="hide-m"><PayChip o={o} /></span>
              <span><StatusChip status={o.status} /></span>
            </Link>
          ))
        )}
      </section>
    </>
  );
}
