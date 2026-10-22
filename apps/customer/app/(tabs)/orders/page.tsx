import Link from "next/link";
import { getRepo } from "@blip/db/server";
import { OrdersView } from "@/components/orders-view";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await currentUser();
  if (!user) {
    return (
      <main className="app app--menu">
        <div className="head"><div className="hrow"><h1>Orders</h1></div></div>
        <div className="list">
          <div className="empty">
            <span className="glyph" aria-hidden="true">◷</span>
            <b>Sign in to see your orders</b>
            Track what's cooking and reorder your favourites.
            <br />
            <Link className="ghost" href="/login?next=/orders">Sign in</Link>
          </div>
        </div>
      </main>
    );
  }
  const orders = (await getRepo().listUserOrders(user.id)).filter((o) => !(o.paymentMethod === "online" && o.paymentStatus === "pending" && o.status === "cancelled"));
  return <OrdersView orders={orders} />;
}
