import type { SupabaseClient } from "@supabase/supabase-js";
import { canCancel, isConfirmed, nextStatus } from "../status";
import type {
  Address,
  AppNotification,
  Banner,
  Category,
  CustomerSummary,
  Order,
  OrderEvent,
  OrderItem,
  OrderStatus,
  OptionGroup,
  PaymentStatus,
  Product,
  Settings,
} from "../types";
import { type Repo, RepoError } from "./repo";

/* Row shapes as they come back from Postgres. */
interface CategoryRow { id: string; name: string; emoji: string; image_url: string | null; sort_order: number; is_visible: boolean }
interface OptionRow { id: string; group_id: string; name: string; price_delta_paise: number; is_available: boolean; sort_order: number }
interface GroupRow { id: string; product_id: string; name: string; kind: "single" | "multiple"; is_required: boolean; sort_order: number; options: OptionRow[] }
interface ProductRow {
  id: string; category_id: string; name: string; description: string; price_paise: number; compare_price_paise: number | null;
  image_url: string | null; emoji: string; is_veg: boolean; is_available: boolean; is_popular: boolean; is_combo: boolean; tag: string | null;
  prep_minutes: number; rating: number; rating_count: number; sort_order: number; option_groups: GroupRow[];
}
interface BannerRow { id: string; image_url: string | null; label: string; link_type: Banner["linkType"]; link_target: string; slot: Banner["slot"]; sort_order: number; is_active: boolean }
interface SettingsRow {
  kitchen_name: string; address: string; phone: string; delivery_fee_paise: number; free_delivery_threshold_paise: number; min_order_paise: number;
  gst_percent: number; delivery_pincodes: string[]; pickup_eta_minutes: number; delivery_eta_text: string; enforce_kitchen_hours: boolean;
}
interface AddressRow { id: string; user_id: string; label: string; line1: string; line2: string; landmark: string; pincode: string; lat: number | null; lng: number | null; is_default: boolean }
interface ItemRow { id: string; order_id: string; product_id: string | null; name_snapshot: string; unit_price_paise: number; quantity: number; options_snapshot: OrderItem["options"]; note: string }
interface EventRow { id: string; order_id: string; status: OrderStatus; reason: string | null; created_at: string; created_by: string | null }
interface OrderRow {
  id: string; number: number; user_id: string; customer_name: string; customer_phone: string; type: Order["type"]; status: OrderStatus;
  address_snapshot: Order["addressSnapshot"]; subtotal_paise: number; delivery_fee_paise: number; tax_paise: number; total_paise: number;
  payment_method: Order["paymentMethod"]; payment_status: PaymentStatus; note: string; rider_name: string; rider_phone: string; cancel_reason: string;
  created_at: string; order_items?: ItemRow[]; order_events?: EventRow[];
}
interface NotificationRow { id: string; kind: AppNotification["kind"]; order_id: string; order_number: number; is_read: boolean; created_at: string }

const PRODUCT_SELECT = "*, option_groups(*, options(*))";
const ORDER_SELECT = "*, order_items(*), order_events(*)";

const asCategory = (r: CategoryRow): Category => ({ id: r.id, name: r.name, emoji: r.emoji, imageUrl: r.image_url, sortOrder: r.sort_order, isVisible: r.is_visible });
const asGroup = (g: GroupRow): OptionGroup => ({
  id: g.id, productId: g.product_id, name: g.name, kind: g.kind, isRequired: g.is_required,
  options: [...g.options].sort((a, b) => a.sort_order - b.sort_order).map((o) => ({ id: o.id, groupId: o.group_id, name: o.name, priceDeltaPaise: o.price_delta_paise, isAvailable: o.is_available })),
});
const asProduct = (r: ProductRow): Product => ({
  id: r.id, categoryId: r.category_id, name: r.name, description: r.description, pricePaise: r.price_paise, comparePricePaise: r.compare_price_paise,
  imageUrl: r.image_url, emoji: r.emoji, isVeg: r.is_veg, isAvailable: r.is_available, isPopular: r.is_popular, isCombo: r.is_combo, tag: r.tag,
  prepMinutes: r.prep_minutes, rating: Number(r.rating), ratingCount: r.rating_count, sortOrder: r.sort_order,
  optionGroups: [...r.option_groups].sort((a, b) => a.sort_order - b.sort_order).map(asGroup),
});
const asBanner = (r: BannerRow): Banner => ({ id: r.id, imageUrl: r.image_url, label: r.label, linkType: r.link_type, linkTarget: r.link_target, slot: r.slot, sortOrder: r.sort_order, isActive: r.is_active });
const asSettings = (r: SettingsRow): Settings => ({
  kitchenName: r.kitchen_name, address: r.address, phone: r.phone, deliveryFeePaise: r.delivery_fee_paise, freeDeliveryThresholdPaise: r.free_delivery_threshold_paise,
  minOrderPaise: r.min_order_paise, gstPercent: Number(r.gst_percent), deliveryPincodes: r.delivery_pincodes, pickupEtaMinutes: r.pickup_eta_minutes,
  deliveryEtaText: r.delivery_eta_text, enforceKitchenHours: r.enforce_kitchen_hours,
});
const asAddress = (r: AddressRow): Address => ({ id: r.id, userId: r.user_id, label: r.label, line1: r.line1, line2: r.line2, landmark: r.landmark, pincode: r.pincode, lat: r.lat, lng: r.lng, isDefault: r.is_default });
const asOrder = (r: OrderRow): Order => ({
  id: r.id, number: Number(r.number), userId: r.user_id, customerName: r.customer_name, customerPhone: r.customer_phone, type: r.type, status: r.status,
  addressSnapshot: r.address_snapshot, subtotalPaise: r.subtotal_paise, deliveryFeePaise: r.delivery_fee_paise, taxPaise: r.tax_paise, totalPaise: r.total_paise,
  paymentMethod: r.payment_method, paymentStatus: r.payment_status, note: r.note, riderName: r.rider_name, riderPhone: r.rider_phone, cancelReason: r.cancel_reason,
  createdAt: r.created_at,
  items: (r.order_items ?? []).map((i): OrderItem => ({ id: i.id, orderId: i.order_id, productId: i.product_id ?? "", name: i.name_snapshot, unitPricePaise: i.unit_price_paise, quantity: i.quantity, options: i.options_snapshot, note: i.note })),
  events: (r.order_events ?? [])
    .map((e): OrderEvent => ({ id: e.id, orderId: e.order_id, status: e.status, createdAt: e.created_at, createdBy: e.created_by, ...(e.reason ? { reason: e.reason } : {}) }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
});
const asNotification = (r: NotificationRow): AppNotification => ({ id: r.id, kind: r.kind, orderId: r.order_id, orderNumber: Number(r.order_number), isRead: r.is_read, createdAt: r.created_at });

function ok<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new RepoError(res.error.message);
  if (res.data === null) throw new RepoError("Not found");
  return res.data;
}
function check(res: { error: { message: string } | null }): void {
  if (res.error) throw new RepoError(res.error.message);
}

/** Server-side repo. Pass a service-role client; every caller checks the actor first. */
export function createSupabaseRepo(sb: SupabaseClient): Repo {
  const loadOrder = async (id: string): Promise<Order> => asOrder(ok(await sb.from("orders").select(ORDER_SELECT).eq("id", id).single<OrderRow>()));
  const notify = async (kind: AppNotification["kind"], o: Order): Promise<void> => {
    check(await sb.from("notifications").insert({ kind, order_id: o.id, order_number: o.number }));
  };

  return {
    async getCategories(opts) {
      let q = sb.from("categories").select("*").order("sort_order");
      if (!opts?.includeHidden) q = q.eq("is_visible", true);
      return ok(await q.returns<CategoryRow[]>()).map(asCategory);
    },
    async getProducts(opts) {
      let q = sb.from("products").select(PRODUCT_SELECT).order("sort_order");
      if (!opts?.includeUnavailable) q = q.eq("is_available", true);
      const rows = ok(await q.returns<ProductRow[]>());
      if (opts?.includeUnavailable) return rows.map(asProduct);
      const visible = new Set((await this.getCategories()).map((c) => c.id));
      return rows.filter((r) => visible.has(r.category_id)).map(asProduct);
    },
    async getProduct(id) {
      const res = await sb.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle<ProductRow>();
      check(res);
      return res.data ? asProduct(res.data) : null;
    },
    async getBanners(opts) {
      let q = sb.from("banners").select("*").order("sort_order");
      if (!opts?.includeInactive) q = q.eq("is_active", true);
      return ok(await q.returns<BannerRow[]>()).map(asBanner);
    },
    async getSettings() {
      return asSettings(ok(await sb.from("settings").select("*").single<SettingsRow>()));
    },

    async getProfile(userId) {
      const res = await sb.from("profiles").select("*").eq("id", userId).maybeSingle<{ id: string; email: string; full_name: string; phone: string; role: "customer" | "owner" }>();
      check(res);
      return res.data ? { id: res.data.id, email: res.data.email, fullName: res.data.full_name, phone: res.data.phone, role: res.data.role } : null;
    },
    async updateProfile(userId, data) {
      check(await sb.from("profiles").update({ full_name: data.fullName, phone: data.phone }).eq("id", userId));
    },
    async listAddresses(userId) {
      return ok(await sb.from("addresses").select("*").eq("user_id", userId).order("is_default", { ascending: false }).returns<AddressRow[]>()).map(asAddress);
    },
    async saveAddress(userId, data) {
      const existing = await sb.from("addresses").select("id").eq("user_id", userId);
      check(existing);
      const makeDefault = data.isDefault || (existing.data?.length ?? 0) === 0;
      if (makeDefault) check(await sb.from("addresses").update({ is_default: false }).eq("user_id", userId));
      const row = { user_id: userId, label: data.label, line1: data.line1, line2: data.line2, landmark: data.landmark, pincode: data.pincode, is_default: makeDefault };
      const res = data.id
        ? await sb.from("addresses").update(row).eq("id", data.id).eq("user_id", userId).select("*").single<AddressRow>()
        : await sb.from("addresses").insert(row).select("*").single<AddressRow>();
      return asAddress(ok(res));
    },
    async deleteAddress(userId, id) {
      check(await sb.from("addresses").delete().eq("id", id).eq("user_id", userId));
    },

    async createOrder(args) {
      const o = ok(
        await sb
          .from("orders")
          .insert({
            user_id: args.userId, customer_name: args.customerName, customer_phone: args.customerPhone, type: args.type, address_snapshot: args.address,
            subtotal_paise: args.pricing.subtotalPaise, delivery_fee_paise: args.pricing.deliveryFeePaise, tax_paise: args.pricing.taxPaise, total_paise: args.pricing.totalPaise,
            payment_method: args.paymentMethod, note: args.note,
          })
          .select("*")
          .single<OrderRow>(),
      );
      check(
        await sb.from("order_items").insert(
          args.pricing.lines.map((l) => ({ order_id: o.id, product_id: l.productId, name_snapshot: l.name, unit_price_paise: l.unitPricePaise, quantity: l.quantity, options_snapshot: l.options, note: l.note })),
        ),
      );
      check(await sb.from("order_events").insert({ order_id: o.id, status: "placed", created_by: args.userId }));
      const order = await loadOrder(o.id);
      if (isConfirmed(order)) await notify("new_order", order);
      return order;
    },
    async getOrder(id) {
      const res = await sb.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle<OrderRow>();
      check(res);
      return res.data ? asOrder(res.data) : null;
    },
    async listUserOrders(userId) {
      return ok(await sb.from("orders").select(ORDER_SELECT).eq("user_id", userId).order("created_at", { ascending: false }).returns<OrderRow[]>()).map(asOrder);
    },
    async listOrders() {
      const all = ok(await sb.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(500).returns<OrderRow[]>()).map(asOrder);
      return all.filter(isConfirmed);
    },
    async updateOrderStatus(id, next, actorId, reason) {
      const o = await loadOrder(id);
      if (next === "cancelled" ? !canCancel(o.type, o.status) : nextStatus(o.type, o.status) !== next) throw new RepoError("That status change is not allowed.");
      const patch: Record<string, unknown> = { status: next };
      if (next === "cancelled") {
        patch.cancel_reason = reason ?? "";
        if (o.paymentMethod === "online" && o.paymentStatus === "paid") patch.payment_status = "refunded";
      }
      check(await sb.from("orders").update(patch).eq("id", id));
      check(await sb.from("order_events").insert({ order_id: id, status: next, reason: reason ?? null, created_by: actorId }));
      const updated = await loadOrder(id);
      if (next === "cancelled") await notify("cancelled", updated);
      return updated;
    },
    async setRider(id, riderName, riderPhone) {
      check(await sb.from("orders").update({ rider_name: riderName, rider_phone: riderPhone }).eq("id", id));
      return loadOrder(id);
    },
    async setPaymentStatus(id, status) {
      const before = await loadOrder(id);
      check(await sb.from("orders").update({ payment_status: status }).eq("id", id));
      const after = await loadOrder(id);
      if (!isConfirmed(before) && isConfirmed(after)) await notify("payment", after);
      return after;
    },
    async recordPayment(p) {
      const res = await sb.from("payments").upsert(
        { order_id: p.orderId, gateway_order_id: p.gatewayOrderId, gateway_payment_id: p.gatewayPaymentId || null, amount_paise: p.amountPaise, status: p.status, raw: p.raw },
        { onConflict: "gateway_payment_id", ignoreDuplicates: false },
      );
      check(res);
    },
    async findOrderByGatewayOrderId(gatewayOrderId) {
      const res = await sb.from("payments").select("order_id").eq("gateway_order_id", gatewayOrderId).limit(1).maybeSingle<{ order_id: string }>();
      check(res);
      return res.data ? this.getOrder(res.data.order_id) : null;
    },

    async listNotifications(limit = 30) {
      return ok(await sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(limit).returns<NotificationRow[]>()).map(asNotification);
    },
    async markNotificationsRead(orderId) {
      const q = sb.from("notifications").update({ is_read: true }).eq("is_read", false);
      check(await (orderId ? q.eq("order_id", orderId) : q));
    },
    async listCustomers() {
      const profiles = ok(await sb.from("profiles").select("*").eq("role", "customer").returns<{ id: string; email: string; full_name: string; phone: string }[]>());
      const orders = (await this.listOrders()).filter((o) => o.status !== "cancelled");
      const all = ok(await sb.from("orders").select("user_id, created_at").returns<{ user_id: string; created_at: string }[]>());
      return profiles.map((p): CustomerSummary => {
        const mine = orders.filter((o) => o.userId === p.id);
        const last = all.filter((o) => o.user_id === p.id).map((o) => o.created_at).sort().pop() ?? null;
        return { id: p.id, fullName: p.full_name, email: p.email, phone: p.phone, orderCount: mine.length, spentPaise: mine.reduce((a, o) => a + o.totalPaise, 0), lastOrderAt: last };
      });
    },
    async listCustomerOrders(userId) {
      return this.listUserOrders(userId);
    },

    async upsertCategory(d) {
      const row = { name: d.name, emoji: d.emoji, is_visible: d.isVisible, ...(d.imageUrl !== undefined ? { image_url: d.imageUrl } : {}) };
      const res = d.id ? await sb.from("categories").update(row).eq("id", d.id).select("*").single<CategoryRow>() : await sb.from("categories").insert({ ...row, sort_order: 999 }).select("*").single<CategoryRow>();
      return asCategory(ok(res));
    },
    async deleteCategory(id) {
      const used = await sb.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
      check(used);
      if ((used.count ?? 0) > 0) throw new RepoError("Move or delete this category's dishes first.");
      check(await sb.from("categories").delete().eq("id", id));
    },
    async reorderCategories(ids) {
      for (const [i, id] of ids.entries()) check(await sb.from("categories").update({ sort_order: i + 1 }).eq("id", id));
    },
    async upsertProduct(d) {
      const row = {
        category_id: d.categoryId, name: d.name, description: d.description, price_paise: d.pricePaise, compare_price_paise: d.comparePricePaise, image_url: d.imageUrl,
        emoji: d.emoji, is_veg: d.isVeg, is_available: d.isAvailable, is_popular: d.isPopular, is_combo: d.isCombo, tag: d.tag, prep_minutes: d.prepMinutes,
      };
      const saved = ok(d.id ? await sb.from("products").update(row).eq("id", d.id).select("id").single<{ id: string }>() : await sb.from("products").insert(row).select("id").single<{ id: string }>());
      // Replace option groups wholesale; order snapshots keep past orders intact.
      check(await sb.from("option_groups").delete().eq("product_id", saved.id));
      for (const [gi, g] of d.optionGroups.entries()) {
        const group = ok(await sb.from("option_groups").insert({ product_id: saved.id, name: g.name, kind: g.kind, is_required: g.isRequired, sort_order: gi }).select("id").single<{ id: string }>());
        check(await sb.from("options").insert(g.options.map((o, oi) => ({ group_id: group.id, name: o.name, price_delta_paise: o.priceDeltaPaise, is_available: o.isAvailable, sort_order: oi }))));
      }
      const full = await this.getProduct(saved.id);
      if (!full) throw new RepoError("Could not save the dish");
      return full;
    },
    async deleteProduct(id) {
      check(await sb.from("products").delete().eq("id", id));
    },
    async setProductsAvailability(ids, isAvailable) {
      check(await sb.from("products").update({ is_available: isAvailable }).in("id", ids));
    },
    async upsertBanner(d) {
      const row = { label: d.label, image_url: d.imageUrl, link_type: d.linkType, link_target: d.linkTarget, slot: d.slot, is_active: d.isActive };
      const res = d.id ? await sb.from("banners").update(row).eq("id", d.id).select("*").single<BannerRow>() : await sb.from("banners").insert({ ...row, sort_order: 999 }).select("*").single<BannerRow>();
      return asBanner(ok(res));
    },
    async deleteBanner(id) {
      check(await sb.from("banners").delete().eq("id", id));
    },
    async reorderBanners(slot, ids) {
      for (const [i, id] of ids.entries()) check(await sb.from("banners").update({ sort_order: i + 1 }).eq("id", id).eq("slot", slot));
    },
    async updateSettings(d) {
      const row = {
        id: true, kitchen_name: d.kitchenName, address: d.address, phone: d.phone, delivery_fee_paise: d.deliveryFeePaise, free_delivery_threshold_paise: d.freeDeliveryThresholdPaise,
        min_order_paise: d.minOrderPaise, gst_percent: d.gstPercent, delivery_pincodes: d.deliveryPincodes, pickup_eta_minutes: d.pickupEtaMinutes, delivery_eta_text: d.deliveryEtaText,
        enforce_kitchen_hours: d.enforceKitchenHours,
      };
      return asSettings(ok(await sb.from("settings").upsert(row).select("*").single<SettingsRow>()));
    },

    async addPushSub(userId, endpoint, keys) {
      check(await sb.from("push_subs").upsert({ user_id: userId, endpoint, keys }, { onConflict: "endpoint" }));
    },
    async listPushSubs(userId) {
      const rows = ok(await sb.from("push_subs").select("*").eq("user_id", userId).returns<{ id: string; user_id: string; endpoint: string; keys: { p256dh: string; auth: string } }[]>());
      return rows.map((r) => ({ id: r.id, userId: r.user_id, endpoint: r.endpoint, keys: r.keys }));
    },
    async removePushSub(endpoint) {
      check(await sb.from("push_subs").delete().eq("endpoint", endpoint));
    },
  };
}
