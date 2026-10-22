"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** A line keeps a display snapshot. The server reprices everything at checkout. */
export interface CartLine {
  key: string;
  productId: string;
  name: string;
  emoji: string;
  imageUrl: string | null;
  optionIds: string[];
  optionsLabel: string;
  unitPaise: number;
  quantity: number;
  note: string;
}

interface CartApi {
  ready: boolean;
  lines: CartLine[];
  count: number;
  subtotalPaise: number;
  freeAtPaise: number;
  /** Quantity of a product's plain (no options, no note) line. */
  qtyOf: (productId: string) => number;
  totalQtyOf: (productId: string) => number;
  addLine: (line: Omit<CartLine, "key">) => void;
  setQty: (key: string, quantity: number) => void;
  replaceAll: (lines: CartLine[]) => void;
  clear: () => void;
}

const STORAGE_KEY = "blip.cart.v1";
const Ctx = createContext<CartApi | null>(null);

const lineKey = (productId: string, optionIds: string[], note: string) => [productId, [...optionIds].sort().join("+"), note].join("|");

export function CartProvider({ children, freeAtPaise }: { children: ReactNode; freeAtPaise: number }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed)) setLines(parsed.filter((l) => l && typeof l.productId === "string" && l.quantity > 0));
      }
    } catch {
      /* private mode or corrupted storage: start empty */
    }
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setLines(JSON.parse(e.newValue) as CartLine[]);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, ready]);

  const addLine = useCallback<CartApi["addLine"]>((line) => {
    const key = lineKey(line.productId, line.optionIds, line.note);
    setLines((cur) => {
      const found = cur.find((l) => l.key === key);
      if (found) return cur.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + line.quantity), unitPaise: line.unitPaise } : l));
      return [...cur, { ...line, key }];
    });
  }, []);

  const setQty = useCallback((key: string, quantity: number) => {
    setLines((cur) => (quantity <= 0 ? cur.filter((l) => l.key !== key) : cur.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, quantity) } : l))));
  }, []);

  const api = useMemo<CartApi>(() => {
    const plain = (id: string) => lineKey(id, [], "");
    return {
      ready,
      lines,
      count: lines.reduce((a, l) => a + l.quantity, 0),
      subtotalPaise: lines.reduce((a, l) => a + l.unitPaise * l.quantity, 0),
      freeAtPaise,
      qtyOf: (id) => lines.find((l) => l.key === plain(id))?.quantity ?? 0,
      totalQtyOf: (id) => lines.filter((l) => l.productId === id).reduce((a, l) => a + l.quantity, 0),
      addLine,
      setQty,
      replaceAll: setLines,
      clear: () => setLines([]),
    };
  }, [lines, ready, freeAtPaise, addLine, setQty]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart(): CartApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}

export const plainKey = (productId: string) => lineKey(productId, [], "");
