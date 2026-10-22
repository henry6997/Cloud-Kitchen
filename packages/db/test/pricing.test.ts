import { describe, expect, it } from "vitest";
import { inr, normalizePhone, parseRupeesToPaise, priceCart } from "../src";
import { seedCatalog } from "../src/server/seed";

const { products, settings } = seedCatalog();
const run = (lines: Parameters<typeof priceCart>[0]["lines"], type: "delivery" | "pickup" = "delivery") => priceCart({ lines, products, settings, type });

describe("priceCart", () => {
  it("adds option deltas to the unit price and multiplies by quantity", () => {
    const p = run([{ productId: "p-chicken-biryani", quantity: 2, optionIds: ["p-chicken-biryani-lg", "p-chicken-biryani-ao0"] }]);
    expect(p.errors).toEqual([]);
    expect(p.lines[0]!.unitPricePaise).toBe(24900 + 12000 + 3000);
    expect(p.subtotalPaise).toBe(39900 * 2);
  });

  it("charges the delivery fee under the threshold and waives it at or above it", () => {
    expect(run([{ productId: "p-brownie", quantity: 2, optionIds: [] }]).deliveryFeePaise).toBe(3000);
    const free = run([{ productId: "p-mutton-biryani", quantity: 2, optionIds: ["p-mutton-biryani-reg"] }]);
    expect(free.subtotalPaise).toBeGreaterThanOrEqual(settings.freeDeliveryThresholdPaise);
    expect(free.deliveryFeePaise).toBe(0);
  });

  it("never charges delivery for pickup", () => {
    expect(run([{ productId: "p-brownie", quantity: 1, optionIds: [] }], "pickup").deliveryFeePaise).toBe(0);
  });

  it("computes GST on the subtotal and rounds to whole paise", () => {
    const p = run([{ productId: "p-gulab-jamun", quantity: 3, optionIds: [] }]);
    expect(p.taxPaise).toBe(Math.round((8900 * 3 * settings.gstPercent) / 100));
    expect(p.totalPaise).toBe(p.subtotalPaise + p.deliveryFeePaise + p.taxPaise);
  });

  it("rejects a missing required choice, unknown options and unavailable dishes", () => {
    expect(run([{ productId: "p-chicken-biryani", quantity: 1, optionIds: [] }]).errors[0]?.message).toMatch(/portion/i);
    expect(run([{ productId: "p-brownie", quantity: 1, optionIds: ["made-up"] }]).errors).toHaveLength(1);
    const off = products.map((p) => (p.id === "p-brownie" ? { ...p, isAvailable: false } : p));
    expect(priceCart({ lines: [{ productId: "p-brownie", quantity: 1, optionIds: [] }], products: off, settings, type: "pickup" }).errors).toHaveLength(1);
  });

  it("ignores prices the client may try to send and bounds quantity", () => {
    const tampered = { productId: "p-brownie", quantity: 1, optionIds: [], pricePaise: 1 } as never;
    expect(run([tampered]).subtotalPaise).toBe(12900);
    expect(run([{ productId: "p-brownie", quantity: 99, optionIds: [] }]).errors).toHaveLength(1);
  });

  it("flags carts under the minimum order", () => {
    expect(run([{ productId: "p-gulab-jamun", quantity: 1, optionIds: [] }]).belowMinimum).toBe(true);
  });
});

describe("money and phone helpers", () => {
  it("formats rupees with en-IN grouping", () => {
    expect(inr(12500000)).toBe("₹1,25,000");
    expect(inr(24900)).toBe("₹249");
    expect(inr(24950)).toBe("₹249.50");
  });
  it("parses messy rupee input", () => {
    expect(parseRupeesToPaise("₹ 1,249")).toBe(124900);
    expect(parseRupeesToPaise("249.5")).toBe(24950);
    expect(parseRupeesToPaise("abc")).toBeNull();
  });
  it("normalises Indian phone numbers", () => {
    for (const raw of ["98765 43210", "+91 98765-43210", "09876543210", "919876543210"]) expect(normalizePhone(raw)).toBe("+919876543210");
    expect(normalizePhone("12345")).toBeNull();
  });
});
