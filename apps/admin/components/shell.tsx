"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { BRAND, type AppNotification } from "@blip/db";
import { getBrowserSupabase } from "@blip/db/browser";
import { ToastProvider, useToast } from "@blip/ui";
import { logoutAction, markNotificationsReadAction } from "@/app/actions";

const NAV = [
  { href: "/", icon: "⌂", label: "Today" },
  { href: "/orders", icon: "◷", label: "Orders", badge: true },
  { href: "/products", icon: "☰", label: "Products" },
  { href: "/categories", icon: "▤", label: "Categories" },
  { href: "/banners", icon: "▣", label: "Banners" },
  { href: "/customers", icon: "◯", label: "Customers" },
  { href: "/settings", icon: "⚙", label: "Settings" },
];

interface Live {
  unread: number;
  items: AppNotification[];
}
const LiveCtx = createContext<Live>({ unread: 0, items: [] });
export const useLive = () => useContext(LiveCtx);

/** Short two-note chime from Web Audio, so no sound file is needed. */
function chime(ctx: AudioContext) {
  const t = ctx.currentTime;
  [660, 880].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    o.type = "sine";
    g.gain.setValueAtTime(0.0001, t + i * 0.16);
    g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.16 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.22);
    o.connect(g).connect(ctx.destination);
    o.start(t + i * 0.16);
    o.stop(t + i * 0.16 + 0.25);
  });
}

function Inner({ children, owner, initial }: { children: ReactNode; owner: { name: string; email: string }; initial: Live }) {
  const path = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [live, setLive] = useState<Live>(initial);
  const [sound, setSound] = useState(true);
  const ctx = useRef<AudioContext | null>(null);
  const seen = useRef<string | null>(initial.items[0]?.id ?? null);

  useEffect(() => {
    try {
      setSound(localStorage.getItem("blip.admin.sound") !== "off");
    } catch {
      /* ignore */
    }
    // Browsers only allow sound after a first tap; unlock it quietly.
    const unlock = () => {
      ctx.current ??= new AudioContext();
      void ctx.current.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Live;
      setLive(data);
      const newest = data.items[0];
      if (newest && newest.id !== seen.current) {
        const fresh = seen.current !== null || data.items.length > 0;
        seen.current = newest.id;
        if (fresh && !newest.isRead) {
          toast(newest.kind === "cancelled" ? `Order #${newest.orderNumber} was cancelled` : `New order #${newest.orderNumber}`);
          if (sound && ctx.current) chime(ctx.current);
        }
        router.refresh();
      }
    } catch {
      /* network blip: try again on the next tick */
    }
  }, [router, toast, sound]);

  useEffect(() => {
    const sb = getBrowserSupabase();
    const ch = sb?.channel("admin-notifications").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => void refresh()).subscribe();
    const timer = setInterval(() => void refresh(), sb ? 30_000 : 5_000);
    return () => {
      clearInterval(timer);
      if (sb && ch) void sb.removeChannel(ch);
    };
  }, [refresh]);

  useEffect(() => setOpen(false), [path]);

  const title = NAV.find((n) => (n.href === "/" ? path === "/" : path.startsWith(n.href)))?.label ?? "Dashboard";

  return (
    <LiveCtx.Provider value={live}>
      <div className="ad">
        <aside className={`side${open ? " open" : ""}`} aria-label="Main">
          <div className="brand">{BRAND.name}</div>
          <nav className="nav">
            {NAV.map((n) => {
              const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}>
                  <i aria-hidden="true">{n.icon}</i>
                  {n.label}
                  {n.badge && live.unread > 0 ? <span className="cnt-b" aria-label={`${live.unread} new`}>{live.unread}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="foot">
            <b>{owner.name}</b>
            {owner.email}
            <form action={logoutAction} style={{ marginTop: 10 }}>
              <button type="submit" className="btn sm block">Sign out</button>
            </form>
          </div>
        </aside>
        <div className={`scrim${open ? " open" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />

        <div className="main">
          <header className="topbar">
            <button type="button" className="ib burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>☰</button>
            <h1>{title}</h1>
            <div className="relw">
              <button type="button" className="ib" aria-label={`Notifications, ${live.unread} unread`} aria-expanded={bell} onClick={() => setBell((b) => !b)}>
                <span aria-hidden="true">🔔</span>
                {live.unread > 0 ? <span className="bdg">{live.unread}</span> : null}
              </button>
              {bell ? (
                <div className="pop" role="dialog" aria-label="Notifications">
                  <h3>
                    Notifications
                    <span style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="link"
                        style={{ fontWeight: 400, fontSize: 13 }}
                        onClick={() => {
                          const next = !sound;
                          setSound(next);
                          try {
                            localStorage.setItem("blip.admin.sound", next ? "on" : "off");
                          } catch {
                            /* ignore */
                          }
                        }}
                      >
                        Sound {sound ? "on" : "off"}
                      </button>
                      {live.unread > 0 ? (
                        <button type="button" className="link" style={{ fontWeight: 400, fontSize: 13 }} onClick={async () => (await markNotificationsReadAction(), void refresh())}>Mark read</button>
                      ) : null}
                    </span>
                  </h3>
                  {live.items.length === 0 ? <p className="hint" style={{ padding: 16, margin: 0 }}>Nothing yet. New orders appear here.</p> : null}
                  {live.items.slice(0, 8).map((n) => (
                    <Link key={n.id} href={`/orders/${n.orderId}`} className={n.isRead ? "" : "unread"} onClick={() => setBell(false)}>
                      {n.kind === "cancelled" ? "Cancelled" : n.kind === "payment" ? "Paid" : "New order"} · #{n.orderNumber}
                      <small>{new Date(n.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</small>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </header>
          <div className="content">{children}</div>
        </div>
      </div>
    </LiveCtx.Provider>
  );
}

export function Shell(props: { children: ReactNode; owner: { name: string; email: string }; initial: Live }) {
  return (
    <ToastProvider flow>
      <Inner {...props} />
    </ToastProvider>
  );
}
