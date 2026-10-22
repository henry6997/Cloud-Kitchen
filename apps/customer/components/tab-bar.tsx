"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", icon: "⌂", label: "Home", on: (p: string) => p === "/" },
  { href: "/menu", icon: "☰", label: "Menu", on: (p: string) => p.startsWith("/menu") },
  { href: "/orders", icon: "◷", label: "Orders", on: (p: string) => p.startsWith("/order") },
  { href: "/account", icon: "◯", label: "Account", on: (p: string) => p.startsWith("/account") },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.on(path) ? "page" : undefined}>
          <i aria-hidden="true">{t.icon}</i>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
