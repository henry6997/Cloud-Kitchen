import type { OrderItemOption, OrderType, Product, Settings } from "./types";

export interface CartLineInput {
  productId: string;
  quantity: number;
  optionIds: string[];
  note?: string;
}

export interface PricedLine {
  productId: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
  linePaise: number;
  options: OrderItemOption[];
  note: string;
}

export interface LineError {
  productId: string;
  message: string;
}

export interface Pricing {
  lines: PricedLine[];
  errors: LineError[];
  subtotalPaise: number;
  deliveryFeePaise: number;
  taxPaise: number;
  totalPaise: number;
  /** Paise still needed for free delivery (0 when unlocked or when picking up). */
  freeDeliveryRemainingPaise: number;
  belowMinimum: boolean;
}

export const MAX_QTY = 20;
export const NOTE_MAX = 140;

/**
 * The single source of truth for money. It runs in the browser for display and
 * again on the server before an order is created. Only database prices are used.
 */
export function priceCart(input: {
  lines: CartLineInput[];
  products: Product[];
  settings: Settings;
  type: OrderType;
}): Pricing {
  const { lines, products, settings, type } = input;
  const byId = new Map(products.map((p) => [p.id, p]));
  const priced: PricedLine[] = [];
  const errors: LineError[] = [];

  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p) {
      errors.push({ productId: line.productId, message: "This dish is no longer on the menu." });
      continue;
    }
    if (!p.isAvailable) {
      errors.push({ productId: p.id, message: `${p.name} is unavailable right now.` });
      continue;
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QTY) {
      errors.push({ productId: p.id, message: `Pick between 1 and ${MAX_QTY} of ${p.name}.` });
      continue;
    }

    const chosen = new Set(line.optionIds);
    const options: OrderItemOption[] = [];
    let delta = 0;
    let bad: string | null = null;

    for (const g of p.optionGroups) {
      const picked = g.options.filter((o) => chosen.has(o.id));
      if (picked.some((o) => !o.isAvailable)) bad = `An option in ${g.name} for ${p.name} is unavailable.`;
      if (g.kind === "single" && picked.length > 1) bad = `Choose one ${g.name.toLowerCase()} for ${p.name}.`;
      if (g.isRequired && picked.length === 0) bad = `Choose a ${g.name.toLowerCase()} for ${p.name}.`;
      for (const o of picked) {
        options.push({ group: g.name, name: o.name, priceDeltaPaise: o.priceDeltaPaise });
        delta += o.priceDeltaPaise;
      }
    }
    const known = new Set(p.optionGroups.flatMap((g) => g.options.map((o) => o.id)));
    if ([...chosen].some((id) => !known.has(id))) bad = `An option for ${p.name} no longer exists.`;
    if (bad) {
      errors.push({ productId: p.id, message: bad });
      continue;
    }

    const unit = p.pricePaise + delta;
    priced.push({
      productId: p.id,
      name: p.name,
      quantity: line.quantity,
      unitPricePaise: unit,
      linePaise: unit * line.quantity,
      options,
      note: (line.note ?? "").slice(0, NOTE_MAX),
    });
  }

  const subtotal = priced.reduce((a, l) => a + l.linePaise, 0);
  const free = settings.freeDeliveryThresholdPaise;
  const deliveryFee = type === "delivery" && subtotal > 0 && subtotal < free ? settings.deliveryFeePaise : 0;
  const tax = Math.round((subtotal * settings.gstPercent) / 100);

  return {
    lines: priced,
    errors,
    subtotalPaise: subtotal,
    deliveryFeePaise: deliveryFee,
    taxPaise: tax,
    totalPaise: subtotal + deliveryFee + tax,
    freeDeliveryRemainingPaise: type === "delivery" ? Math.max(0, free - subtotal) : 0,
    belowMinimum: subtotal < settings.minOrderPaise,
  };
}
