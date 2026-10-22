import { notFound, redirect } from "next/navigation";
import { inr } from "@blip/db";
import { getRepo, isDemoMode } from "@blip/db/server";
import { demoPayAction } from "@/app/actions";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Demo payment" };

/** Stand-in for Cashfree while no gateway keys are configured. Never reachable in production. */
export default async function DemoPayPage({ params }: { params: Promise<{ orderId: string }> }) {
  if (!isDemoMode()) notFound();
  const { orderId } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");
  const order = await getRepo().getOrder(orderId);
  if (!order || order.userId !== user.id) notFound();
  if (order.paymentStatus === "paid") redirect(`/order/${orderId}?placed=1`);

  return (
    <main className="app app--detail">
      <header className="dtop"><span className="ttl show" style={{ textAlign: "left" }}>Demo payment</span></header>
      <div className="card flat" style={{ marginTop: 18 }}>
        <h2>Order #{order.number} <span>Demo gateway</span></h2>
        <p className="desc" style={{ marginTop: 8 }}>No Cashfree keys are set, so this screen stands in for the real payment window. Add the keys to the environment to switch to Cashfree.</p>
        <div className="br" style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 0", fontWeight: 600, fontSize: 18 }}>
          <span>Amount</span><span>{inr(order.totalPaise)}</span>
        </div>
        <form action={demoPayAction.bind(null, orderId, "success")} style={{ marginTop: 16 }}>
          <button type="submit" className="btn primary block">Pay {inr(order.totalPaise)}</button>
        </form>
        <form action={demoPayAction.bind(null, orderId, "fail")} style={{ marginTop: 10 }}>
          <button type="submit" className="btn ghost block">Simulate a failed payment</button>
        </form>
      </div>
    </main>
  );
}
