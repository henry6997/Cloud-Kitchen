import { notFound, redirect } from "next/navigation";
import { confirmWithGateway, getRepo } from "@blip/db/server";
import { TrackingView } from "@/components/tracking-view";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Your order" };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string; return?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/order/${id}`);
  const repo = getRepo();
  let order = await repo.getOrder(id);
  if (!order || order.userId !== user.id) notFound();
  if (sp.return && order.paymentMethod === "online" && order.paymentStatus === "pending") {
    await confirmWithGateway(id);
    order = (await repo.getOrder(id)) ?? order;
  }
  const settings = await repo.getSettings();
  return (
    <TrackingView
      order={order}
      settings={{ phone: settings.phone, address: settings.address, kitchenName: settings.kitchenName, deliveryEtaText: settings.deliveryEtaText, pickupEtaMinutes: settings.pickupEtaMinutes }}
      justPlaced={sp.placed === "1" || sp.return === "1"}
      returning={sp.return === "1"}
    />
  );
}
