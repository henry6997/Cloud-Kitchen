import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { nextStatus, canCancel, isConfirmed } from "../status";
import type { Order, OrderStatus, OptionGroup, Product } from "../types";
import { type DemoDB, seedDemoDB } from "./seed";
import { type Repo, RepoError } from "./repo";

function findRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(/*turbopackIgnore: true*/ path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return process.cwd();
}

export const demoFile = () => process.env.DEMO_DB_PATH ?? path.join(findRoot(), ".data", "demo.json");

export function loadDemo(): DemoDB {
  const file = demoFile();
  if (!fs.existsSync(/*turbopackIgnore: true*/ file)) {
    const fresh = seedDemoDB();
    saveDemo(fresh);
    return fresh;
  }
  return JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as DemoDB;
}

export function saveDemo(db: DemoDB): void {
  const file = demoFile();
  fs.mkdirSync(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(/*turbopackIgnore: true*/ tmp, JSON.stringify(db, null, 2));
  fs.renameSync(/*turbopackIgnore: true*/ tmp, file);
}

function tx<T>(fn: (db: DemoDB) => T): T {
  const db = loadDemo();
  const result = fn(db);
  saveDemo(db);
  return result;
}

const sortBy = <T extends { sortOrder: number }>(list: T[]) => [...list].sort((a, b) => a.sortOrder - b.sortOrder);

function assertTransition(o: Order, next: OrderStatus): void {
  if (next === "cancelled") {
    if (!canCancel(o.type, o.status)) throw new RepoError("This order can no longer be cancelled.");
    return;
  }
  if (nextStatus(o.type, o.status) !== next) throw new RepoError("Orders only move forward one step at a time.");
}

function push(db: DemoDB, kind: "new_order" | "payment" | "cancelled", o: Order): void {
  db.notifications.unshift({ id: randomUUID(), kind, orderId: o.id, orderNumber: o.number, isRead: false, createdAt: new Date().toISOString() });
}

export function createDemoRepo(): Repo {
  return {
    async getCategories(opts) {
      const db = loadDemo();
      return sortBy(db.categories).filter((c) => opts?.includeHidden || c.isVisible);
    },
    async getProducts(opts) {
      const db = loadDemo();
      const visible = new Set(db.categories.filter((c) => c.isVisible).map((c) => c.id));
      return sortBy(db.products).filter((p) => opts?.includeUnavailable || (p.isAvailable && visible.has(p.categoryId)));
    },
    async getProduct(id) {
      return loadDemo().products.find((p) => p.id === id) ?? null;
    },
    async getBanners(opts) {
      return sortBy(loadDemo().banners).filter((b) => opts?.includeInactive || b.isActive);
    },
    async getSettings() {
      return loadDemo().settings;
    },

    async getProfile(userId) {
      const u = loadDemo().users.find((x) => x.id === userId);
      return u ? { id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role } : null;
    },
    async updateProfile(userId, data) {
      tx((db) => {
        const u = db.users.find((x) => x.id === userId);
        if (!u) throw new RepoError("Account not found");
        u.fullName = data.fullName;
        u.phone = data.phone;
      });
    },
    async listAddresses(userId) {
      return loadDemo().addresses.filter((a) => a.userId === userId).sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    },
    async saveAddress(userId, data) {
      return tx((db) => {
        const mine = db.addresses.filter((a) => a.userId === userId);
        const makeDefault = data.isDefault || mine.length === 0;
        if (makeDefault) mine.forEach((a) => (a.isDefault = false));
        const existing = data.id ? db.addresses.find((a) => a.id === data.id && a.userId === userId) : undefined;
        if (existing) {
          Object.assign(existing, { label: data.label, line1: data.line1, line2: data.line2, landmark: data.landmark, pincode: data.pincode, isDefault: makeDefault || existing.isDefault });
          return existing;
        }
        const a = { id: randomUUID(), userId, label: data.label, line1: data.line1, line2: data.line2, landmark: data.landmark, pincode: data.pincode, lat: null, lng: null, isDefault: makeDefault };
        db.addresses.push(a);
        return a;
      });
    },
    async deleteAddress(userId, id) {
      tx((db) => {
        db.addresses = db.addresses.filter((a) => !(a.id === id && a.userId === userId));
        const mine = db.addresses.filter((a) => a.userId === userId);
        if (mine.length && !mine.some((a) => a.isDefault)) mine[0]!.isDefault = true;
      });
    },

    async createOrder(args) {
      return tx((db) => {
        const id = randomUUID();
        const now = new Date().toISOString();
        const order: Order = {
          id,
          number: ++db.orderSeq,
          userId: args.userId,
          customerName: args.customerName,
          customerPhone: args.customerPhone,
          type: args.type,
          status: "placed",
          addressSnapshot: args.address,
          subtotalPaise: args.pricing.subtotalPaise,
          deliveryFeePaise: args.pricing.deliveryFeePaise,
          taxPaise: args.pricing.taxPaise,
          totalPaise: args.pricing.totalPaise,
          paymentMethod: args.paymentMethod,
          paymentStatus: "pending",
          note: args.note,
          riderName: "",
          riderPhone: "",
          cancelReason: "",
          createdAt: now,
          items: args.pricing.lines.map((l) => ({ id: randomUUID(), orderId: id, productId: l.productId, name: l.name, unitPricePaise: l.unitPricePaise, quantity: l.quantity, options: l.options, note: l.note })),
          events: [{ id: randomUUID(), orderId: id, status: "placed", createdAt: now, createdBy: args.userId }],
        };
        db.orders.push(order);
        if (isConfirmed(order)) push(db, "new_order", order);
        return order;
      });
    },
    async getOrder(id) {
      return loadDemo().orders.find((o) => o.id === id) ?? null;
    },
    async listUserOrders(userId) {
      return loadDemo()
        .orders.filter((o) => o.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async listOrders() {
      return loadDemo()
        .orders.filter(isConfirmed)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async updateOrderStatus(id, next, actorId, reason) {
      return tx((db) => {
        const o = db.orders.find((x) => x.id === id);
        if (!o) throw new RepoError("Order not found");
        assertTransition(o, next);
        o.status = next;
        if (next === "cancelled") {
          o.cancelReason = reason ?? "";
          if (o.paymentMethod === "online" && o.paymentStatus === "paid") o.paymentStatus = "refunded";
          push(db, "cancelled", o);
        }
        o.events.push({ id: randomUUID(), orderId: id, status: next, createdAt: new Date().toISOString(), createdBy: actorId, ...(reason ? { reason } : {}) });
        return o;
      });
    },
    async setRider(id, riderName, riderPhone) {
      return tx((db) => {
        const o = db.orders.find((x) => x.id === id);
        if (!o) throw new RepoError("Order not found");
        o.riderName = riderName;
        o.riderPhone = riderPhone;
        return o;
      });
    },
    async setPaymentStatus(id, status) {
      return tx((db) => {
        const o = db.orders.find((x) => x.id === id);
        if (!o) throw new RepoError("Order not found");
        const wasConfirmed = isConfirmed(o);
        o.paymentStatus = status;
        if (!wasConfirmed && isConfirmed(o)) push(db, "payment", o);
        return o;
      });
    },
    async recordPayment(p) {
      tx((db) => {
        db.payments.push({ id: randomUUID(), createdAt: new Date().toISOString(), ...p });
      });
    },
    async findOrderByGatewayOrderId(gatewayOrderId) {
      const db = loadDemo();
      const pay = db.payments.find((p) => p.gatewayOrderId === gatewayOrderId);
      return pay ? (db.orders.find((o) => o.id === pay.orderId) ?? null) : null;
    },

    async listNotifications(limit = 30) {
      return loadDemo().notifications.slice(0, limit);
    },
    async markNotificationsRead(orderId) {
      tx((db) => db.notifications.forEach((n) => {
        if (!orderId || n.orderId === orderId) n.isRead = true;
      }));
    },
    async listCustomers() {
      const db = loadDemo();
      return db.users
        .filter((u) => u.role === "customer")
        .map((u) => {
          const mine = db.orders.filter((o) => o.userId === u.id && isConfirmed(o) && o.status !== "cancelled");
          const last = db.orders.filter((o) => o.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
          return { id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, orderCount: mine.length, spentPaise: mine.reduce((a, o) => a + o.totalPaise, 0), lastOrderAt: last?.createdAt ?? null };
        });
    },
    async listCustomerOrders(userId) {
      return loadDemo()
        .orders.filter((o) => o.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async upsertCategory(data) {
      return tx((db) => {
        const existing = data.id ? db.categories.find((c) => c.id === data.id) : undefined;
        if (existing) {
          Object.assign(existing, { name: data.name, emoji: data.emoji, isVisible: data.isVisible, ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}) });
          return existing;
        }
        const c = { id: randomUUID(), name: data.name, emoji: data.emoji, imageUrl: data.imageUrl ?? null, isVisible: data.isVisible, sortOrder: Math.max(0, ...db.categories.map((x) => x.sortOrder)) + 1 };
        db.categories.push(c);
        return c;
      });
    },
    async deleteCategory(id) {
      tx((db) => {
        if (db.products.some((p) => p.categoryId === id)) throw new RepoError("Move or delete this category's dishes first.");
        db.categories = db.categories.filter((c) => c.id !== id);
      });
    },
    async reorderCategories(ids) {
      tx((db) => ids.forEach((id, i) => {
        const c = db.categories.find((x) => x.id === id);
        if (c) c.sortOrder = i + 1;
      }));
    },
    async upsertProduct(data) {
      return tx((db) => {
        const id = data.id ?? randomUUID();
        const groups: OptionGroup[] = data.optionGroups.map((g) => {
          const gid = g.id ?? randomUUID();
          return { id: gid, productId: id, name: g.name, kind: g.kind, isRequired: g.isRequired, options: g.options.map((o) => ({ id: o.id ?? randomUUID(), groupId: gid, name: o.name, priceDeltaPaise: o.priceDeltaPaise, isAvailable: o.isAvailable })) };
        });
        const existing = db.products.find((p) => p.id === id);
        const base = { categoryId: data.categoryId, name: data.name, description: data.description, pricePaise: data.pricePaise, comparePricePaise: data.comparePricePaise, imageUrl: data.imageUrl, emoji: data.emoji, isVeg: data.isVeg, isAvailable: data.isAvailable, isPopular: data.isPopular, isCombo: data.isCombo, tag: data.tag, prepMinutes: data.prepMinutes, optionGroups: groups };
        if (existing) {
          Object.assign(existing, base);
          return existing;
        }
        const p: Product = { id, ...base, rating: 4.5, ratingCount: 0, sortOrder: Math.max(0, ...db.products.filter((x) => x.categoryId === data.categoryId).map((x) => x.sortOrder)) + 1 };
        db.products.push(p);
        return p;
      });
    },
    async deleteProduct(id) {
      tx((db) => {
        db.products = db.products.filter((p) => p.id !== id);
      });
    },
    async setProductsAvailability(ids, isAvailable) {
      tx((db) => db.products.forEach((p) => {
        if (ids.includes(p.id)) p.isAvailable = isAvailable;
      }));
    },
    async upsertBanner(data) {
      return tx((db) => {
        const existing = data.id ? db.banners.find((b) => b.id === data.id) : undefined;
        if (existing) {
          Object.assign(existing, { label: data.label, imageUrl: data.imageUrl, linkType: data.linkType, linkTarget: data.linkTarget, slot: data.slot, isActive: data.isActive });
          return existing;
        }
        const b = { id: randomUUID(), label: data.label, imageUrl: data.imageUrl, linkType: data.linkType, linkTarget: data.linkTarget, slot: data.slot, isActive: data.isActive, sortOrder: Math.max(0, ...db.banners.filter((x) => x.slot === data.slot).map((x) => x.sortOrder)) + 1 };
        db.banners.push(b);
        return b;
      });
    },
    async deleteBanner(id) {
      tx((db) => {
        db.banners = db.banners.filter((b) => b.id !== id);
      });
    },
    async reorderBanners(slot, ids) {
      tx((db) => ids.forEach((id, i) => {
        const b = db.banners.find((x) => x.id === id && x.slot === slot);
        if (b) b.sortOrder = i + 1;
      }));
    },
    async updateSettings(data) {
      return tx((db) => {
        db.settings = { ...data };
        return db.settings;
      });
    },

    async addPushSub(userId, endpoint, keys) {
      tx((db) => {
        db.pushSubs = db.pushSubs.filter((s) => s.endpoint !== endpoint);
        db.pushSubs.push({ id: randomUUID(), userId, endpoint, keys });
      });
    },
    async listPushSubs(userId) {
      return loadDemo().pushSubs.filter((s) => s.userId === userId);
    },
    async removePushSub(endpoint) {
      tx((db) => {
        db.pushSubs = db.pushSubs.filter((s) => s.endpoint !== endpoint);
      });
    },
  };
}
