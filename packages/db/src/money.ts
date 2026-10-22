/** Money is stored as integer paise and shown with en-IN grouping (1,25,000). */
const whole = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const frac = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function inr(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return sign + "₹" + (abs % 100 === 0 ? whole.format(abs / 100) : frac.format(abs / 100));
}

/** Postel's law: accept "249", "249.5", "₹ 1,249" and save clean paise. */
export function parseRupeesToPaise(input: string | number): number | null {
  if (typeof input === "number") return Number.isFinite(input) && input >= 0 ? Math.round(input * 100) : null;
  const cleaned = input.replace(/[₹,\s]/g, "").replace(/^rs\.?/i, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export const paiseToRupeesString = (paise: number): string => (paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2));
