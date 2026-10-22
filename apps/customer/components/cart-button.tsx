"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BagIcon } from "@blip/ui";
import { useCart } from "./cart-provider";

export function CartButton({ icon = "emoji" }: { icon?: "emoji" | "svg" }) {
  const { count, ready } = useCart();
  const [bump, setBump] = useState(false);
  const prev = useRef(count);
  useEffect(() => {
    const grew = count > prev.current;
    prev.current = count;
    if (!grew) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 200);
    return () => clearTimeout(t);
  }, [count]);
  const n = ready ? count : 0;
  return (
    <Link href="/cart" className="ib" aria-label={`Cart, ${n} ${n === 1 ? "item" : "items"}`}>
      {icon === "svg" ? <BagIcon /> : <span aria-hidden="true">🛍</span>}
      <span className={`bdg${bump ? " bump" : ""}`} hidden={n === 0}>{n}</span>
    </Link>
  );
}
