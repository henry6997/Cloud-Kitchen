"use client";
import { useEffect, useState } from "react";
import type { Order } from "@blip/db";
import { getBrowserSupabase } from "@blip/db/browser";

/** Live order status: Supabase Realtime when configured, otherwise a short poll. */
export function useLiveOrder(initial: Order): Order {
  const [order, setOrder] = useState(initial);

  useEffect(() => setOrder(initial), [initial]);

  useEffect(() => {
    const id = initial.id;
    const sb = getBrowserSupabase();
    const refresh = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
        if (res.ok) setOrder((await res.json()) as Order);
      } catch {
        /* offline: keep the last known state */
      }
    };
    const channel = sb?.channel(`order-${id}`).on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => void refresh()).subscribe();
    const timer = setInterval(() => void refresh(), sb ? 30_000 : 4_000);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      if (sb && channel) void sb.removeChannel(channel);
    };
  }, [initial.id]);

  return order;
}
