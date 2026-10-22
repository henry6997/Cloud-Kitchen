import { randomUUID } from "node:crypto";
import { priceCart } from "../pricing";
import type { Address, AppNotification, Banner, Category, Order, OptionGroup, Product, Settings } from "../types";
import { hashPassword } from "./password";

export interface DemoUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  role: "customer" | "owner";
  createdAt: string;
}

export interface DemoDB {
  users: DemoUser[];
  addresses: Address[];
  categories: Category[];
  products: Product[];
  banners: Banner[];
  settings: Settings;
  orders: Order[];
  notifications: AppNotification[];
  pushSubs: { id: string; userId: string; endpoint: string; keys: { p256dh: string; auth: string } }[];
  payments: { id: string; orderId: string; gatewayOrderId: string; gatewayPaymentId: string; amountPaise: number; status: string; raw: unknown; createdAt: string }[];
  orderSeq: number;
}

export const DEMO_OWNER_EMAIL = "owner@blip.test";
export const DEMO_CUSTOMER_EMAIL = "priya@example.com";

const R = (n: number) => n * 100;

const portion = (productId: string, largeDelta: number): OptionGroup => ({
  id: `${productId}-portion`,
  productId,
  name: "Portion",
  kind: "single",
  isRequired: true,
  options: [
    { id: `${productId}-reg`, groupId: `${productId}-portion`, name: "Regular", priceDeltaPaise: 0, isAvailable: true },
    { id: `${productId}-lg`, groupId: `${productId}-portion`, name: "Large", priceDeltaPaise: R(largeDelta), isAvailable: true },
  ],
});

const addons = (productId: string, list: [string, number][]): OptionGroup => ({
  id: `${productId}-addons`,
  productId,
  name: "Add-ons",
  kind: "multiple",
  isRequired: false,
  options: list.map(([name, price], i) => ({ id: `${productId}-ao${i}`, groupId: `${productId}-addons`, name, priceDeltaPaise: R(price), isAvailable: true })),
});

type P = Omit<Product, "optionGroups" | "comparePricePaise" | "imageUrl" | "isCombo" | "isPopular" | "tag" | "sortOrder"> &
  Partial<Pick<Product, "comparePricePaise" | "isCombo" | "isPopular" | "tag">> & { groups?: OptionGroup[] };

function product(p: P, sortOrder: number): Product {
  const { groups, ...rest } = p;
  return { comparePricePaise: null, imageUrl: null, isCombo: false, isPopular: false, tag: null, ...rest, sortOrder, optionGroups: groups ?? [] };
}

export function seedCatalog(): { categories: Category[]; products: Product[]; banners: Banner[]; settings: Settings } {
  const categories: Category[] = [
    { id: "cat-biryani", name: "Biryani", emoji: "🍛", imageUrl: "/images/categories/cat-biryani.webp", sortOrder: 1, isVisible: true },
    { id: "cat-bowls", name: "Bowls", emoji: "🥘", imageUrl: "/images/categories/cat-bowls.webp", sortOrder: 2, isVisible: true },
    { id: "cat-wraps", name: "Wraps", emoji: "🌯", imageUrl: "/images/categories/cat-wraps.webp", sortOrder: 3, isVisible: true },
    { id: "cat-burgers", name: "Burgers", emoji: "🍔", imageUrl: "/images/categories/cat-burgers.webp", sortOrder: 4, isVisible: true },
    { id: "cat-desserts", name: "Desserts", emoji: "🍰", imageUrl: "/images/categories/cat-desserts.webp", sortOrder: 5, isVisible: true },
    { id: "cat-combos", name: "Combos", emoji: "🍽️", imageUrl: null, sortOrder: 6, isVisible: true },
  ];

  const biryaniAddons = (id: string) => addons(id, [["Extra raita", 30], ["Extra gravy", 40], ["Boiled egg", 25]]);
  const products: Product[] = [
    product({ id: "p-chicken-biryani", categoryId: "cat-biryani", name: "Chicken Biryani", description: "Basmati rice layered with slow-cooked chicken, saffron and whole spices. Served with cooling raita.", pricePaise: R(249), emoji: "🍛", isVeg: false, isAvailable: true, isPopular: true, tag: "Bestseller", prepMinutes: 30, rating: 4.7, ratingCount: 12500, groups: [portion("p-chicken-biryani", 120), biryaniAddons("p-chicken-biryani")] }, 1),
    product({ id: "p-veg-biryani", categoryId: "cat-biryani", name: "Veg Dum Biryani", description: "Seasonal vegetables, saffron, fried onions", pricePaise: R(219), emoji: "🍛", isVeg: true, isAvailable: true, prepMinutes: 30, rating: 4.5, ratingCount: 4100, groups: [portion("p-veg-biryani", 100), biryaniAddons("p-veg-biryani")] }, 2),
    product({ id: "p-mutton-biryani", categoryId: "cat-biryani", name: "Mutton Biryani", description: "Bone-in mutton, long-grain rice, boiled egg", pricePaise: R(329), emoji: "🍛", isVeg: false, isAvailable: true, prepMinutes: 40, rating: 4.8, ratingCount: 6800, groups: [portion("p-mutton-biryani", 140), biryaniAddons("p-mutton-biryani")] }, 3),
    product({ id: "p-butter-chicken-bowl", categoryId: "cat-bowls", name: "Butter Chicken Bowl", description: "Creamy tomato gravy with steamed rice", pricePaise: R(279), emoji: "🥘", isVeg: false, isAvailable: true, isPopular: true, prepMinutes: 25, rating: 4.6, ratingCount: 8200, groups: [portion("p-butter-chicken-bowl", 90)] }, 1),
    product({ id: "p-quinoa-bowl", categoryId: "cat-bowls", name: "Quinoa Power Bowl", description: "Greens, chickpeas, roasted seeds, lemon dressing", pricePaise: R(229), emoji: "🥗", isVeg: true, isAvailable: true, isPopular: true, tag: "Healthy", prepMinutes: 15, rating: 4.6, ratingCount: 3300 }, 2),
    product({ id: "p-dal-bowl", categoryId: "cat-bowls", name: "Dal Makhani Bowl", description: "Slow-simmered black lentils with butter and rice", pricePaise: R(209), emoji: "🥘", isVeg: true, isAvailable: true, prepMinutes: 20, rating: 4.5, ratingCount: 2900, groups: [portion("p-dal-bowl", 80)] }, 3),
    product({ id: "p-paneer-wrap", categoryId: "cat-wraps", name: "Paneer Tikka Wrap", description: "Grilled paneer, mint chutney, onion, salad", pricePaise: R(189), emoji: "🌯", isVeg: true, isAvailable: true, isPopular: true, tag: "Veg", prepMinutes: 20, rating: 4.5, ratingCount: 5200 }, 1),
    product({ id: "p-chicken-wrap", categoryId: "cat-wraps", name: "Chicken Tikka Wrap", description: "Smoky chicken tikka, garlic sauce, pickled onion", pricePaise: R(199), emoji: "🌯", isVeg: false, isAvailable: true, prepMinutes: 20, rating: 4.6, ratingCount: 4700 }, 2),
    product({ id: "p-smash-burger", categoryId: "cat-burgers", name: "Smash Burger Combo", description: "Double patty, cheese, fries and a drink", pricePaise: R(199), emoji: "🍔", isVeg: false, isAvailable: true, isPopular: true, prepMinutes: 20, rating: 4.4, ratingCount: 6100, groups: [addons("p-smash-burger", [["Extra cheese", 25], ["Extra patty", 60]])] }, 1),
    product({ id: "p-veg-burger", categoryId: "cat-burgers", name: "Veg Crunch Burger", description: "Crisp potato patty, slaw, tangy sauce", pricePaise: R(169), emoji: "🍔", isVeg: true, isAvailable: true, prepMinutes: 20, rating: 4.3, ratingCount: 2400, groups: [addons("p-veg-burger", [["Extra cheese", 25]])] }, 2),
    product({ id: "p-brownie", categoryId: "cat-desserts", name: "Warm Brownie", description: "Dark chocolate with vanilla ice cream", pricePaise: R(129), emoji: "🍫", isVeg: true, isAvailable: true, isPopular: true, prepMinutes: 10, rating: 4.8, ratingCount: 9800 }, 1),
    product({ id: "p-gulab-jamun", categoryId: "cat-desserts", name: "Gulab Jamun (2 pcs)", description: "Soft milk dumplings in cardamom syrup", pricePaise: R(89), emoji: "🍮", isVeg: true, isAvailable: true, prepMinutes: 5, rating: 4.7, ratingCount: 7400 }, 2),
    product({ id: "p-combo-family", categoryId: "cat-combos", name: "Family Biryani Feast", description: "2 biryanis, raita and dessert", pricePaise: R(549), comparePricePaise: R(620), emoji: "🍽️", isVeg: false, isAvailable: true, isCombo: true, tag: "Save ₹71", prepMinutes: 40, rating: 4.7, ratingCount: 1800 }, 1),
    product({ id: "p-combo-wrap", categoryId: "cat-combos", name: "Lunch Wrap Duo", description: "2 wraps with fries", pricePaise: R(329), comparePricePaise: R(360), emoji: "🌯", isVeg: false, isAvailable: true, isCombo: true, tag: "Save ₹31", prepMinutes: 25, rating: 4.5, ratingCount: 1200 }, 2),
    product({ id: "p-combo-burger", categoryId: "cat-combos", name: "Burger and Brownie", description: "Smash burger with a warm brownie", pricePaise: R(299), comparePricePaise: R(328), emoji: "🍔", isVeg: false, isAvailable: true, isCombo: true, tag: "Save ₹29", prepMinutes: 25, rating: 4.6, ratingCount: 1500 }, 3),
  ];

  for (const p of products) p.imageUrl = `/images/products/${p.id}.webp`;

  const banners: Banner[] = [
    { id: "ban-1", imageUrl: "/banners/hero-1.webp", label: "Free delivery over ₹399", linkType: "category", linkTarget: "Biryani", slot: "hero", sortOrder: 1, isActive: true },
    { id: "ban-2", imageUrl: "/banners/hero-2.webp", label: "Warm brownies, fresh out of the oven", linkType: "category", linkTarget: "Desserts", slot: "hero", sortOrder: 2, isActive: true },
    { id: "ban-3", imageUrl: "/banners/hero-3.webp", label: "Biryani for the whole family", linkType: "category", linkTarget: "Combos", slot: "hero", sortOrder: 3, isActive: true },
    { id: "ban-4", imageUrl: "/banners/strip-1.webp", label: "Lunch combos from ₹329", linkType: "category", linkTarget: "Combos", slot: "strip", sortOrder: 1, isActive: true },
  ];

  const settings: Settings = {
    kitchenName: "Blip Kitchen",
    address: "12, 4th Cross, Indiranagar, Bengaluru 560038",
    phone: "+919876543210",
    deliveryFeePaise: R(30),
    freeDeliveryThresholdPaise: R(399),
    minOrderPaise: R(149),
    gstPercent: 5,
    deliveryPincodes: ["560038", "560008", "560075", "560071", "560001"],
    pickupEtaMinutes: 20,
    deliveryEtaText: "30–40 min",
    enforceKitchenHours: false,
  };

  return { categories, products, banners, settings };
}

export function seedDemoDB(): DemoDB {
  const cat = seedCatalog();
  const now = Date.now();
  const iso = (ms: number) => new Date(now - ms).toISOString();
  const ownerPassword = process.env.DEMO_OWNER_PASSWORD ?? "owner-demo-123";
  const customerPassword = process.env.DEMO_CUSTOMER_PASSWORD ?? "priya-demo-123";

  const priya: DemoUser = { id: "u-priya", email: DEMO_CUSTOMER_EMAIL, passwordHash: hashPassword(customerPassword), fullName: "Priya Nair", phone: "+919812345678", role: "customer", createdAt: iso(40 * 864e5) };
  const owner: DemoUser = { id: "u-owner", email: DEMO_OWNER_EMAIL, passwordHash: hashPassword(ownerPassword), fullName: "Kitchen Owner", phone: "+919876543210", role: "owner", createdAt: iso(60 * 864e5) };

  const home: Address = { id: "a-home", userId: priya.id, label: "Home", line1: "Flat 402, Lakeview Residency, 5th Main", line2: "Indiranagar", landmark: "Opposite the park", pincode: "560038", lat: null, lng: null, isDefault: true };
  const office: Address = { id: "a-office", userId: priya.id, label: "Work", line1: "3rd Floor, Orion Tech Park, 100 Feet Road", line2: "", landmark: "", pincode: "560008", lat: null, lng: null, isDefault: false };

  const db: DemoDB = { users: [owner, priya], addresses: [home, office], ...cat, orders: [], notifications: [], pushSubs: [], payments: [], orderSeq: 1000 };

  const make = (ago: number, lines: { productId: string; quantity: number; optionIds: string[] }[], status: Order["status"], type: Order["type"], method: Order["paymentMethod"]): void => {
    const pricing = priceCart({ lines, products: cat.products, settings: cat.settings, type });
    const id = randomUUID();
    const number = ++db.orderSeq;
    const created = iso(ago);
    const events = ["placed", "accepted", "preparing", "ready", ...(type === "delivery" ? ["out_for_delivery", "delivered"] : ["picked_up"])] as Order["status"][];
    const upto = events.slice(0, events.indexOf(status) + 1);
    db.orders.push({
      id,
      number,
      userId: priya.id,
      customerName: priya.fullName,
      customerPhone: priya.phone,
      type,
      status,
      addressSnapshot: type === "delivery" ? { label: home.label, line1: home.line1, line2: home.line2, landmark: home.landmark, pincode: home.pincode } : null,
      subtotalPaise: pricing.subtotalPaise,
      deliveryFeePaise: pricing.deliveryFeePaise,
      taxPaise: pricing.taxPaise,
      totalPaise: pricing.totalPaise,
      paymentMethod: method,
      paymentStatus: status === "delivered" || status === "picked_up" ? (method === "cod" ? "collected" : "paid") : method === "cod" ? "pending" : "paid",
      note: "",
      riderName: status === "delivered" || status === "out_for_delivery" ? "Ravi" : "",
      riderPhone: status === "delivered" || status === "out_for_delivery" ? "+919900112233" : "",
      cancelReason: "",
      createdAt: created,
      items: pricing.lines.map((l) => ({ id: randomUUID(), orderId: id, productId: l.productId, name: l.name, unitPricePaise: l.unitPricePaise, quantity: l.quantity, options: l.options, note: l.note })),
      events: upto.map((s, i) => ({ id: randomUUID(), orderId: id, status: s, createdAt: new Date(new Date(created).getTime() + i * 6 * 60_000).toISOString(), createdBy: i === 0 ? priya.id : owner.id })),
    });
  };

  make(6 * 864e5, [{ productId: "p-chicken-biryani", quantity: 1, optionIds: ["p-chicken-biryani-reg", "p-chicken-biryani-ao0"] }, { productId: "p-brownie", quantity: 1, optionIds: [] }], "delivered", "delivery", "online");
  make(2 * 864e5, [{ productId: "p-paneer-wrap", quantity: 2, optionIds: [] }, { productId: "p-gulab-jamun", quantity: 1, optionIds: [] }], "delivered", "delivery", "cod");
  make(35 * 60_000, [{ productId: "p-butter-chicken-bowl", quantity: 1, optionIds: ["p-butter-chicken-bowl-reg"] }, { productId: "p-smash-burger", quantity: 1, optionIds: [] }], "preparing", "delivery", "cod");
  const live = db.orders[db.orders.length - 1];
  if (live) db.notifications.push({ id: randomUUID(), kind: "new_order", orderId: live.id, orderNumber: live.number, isRead: false, createdAt: live.createdAt });

  return db;
}
