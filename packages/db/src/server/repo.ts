import type { AddressInput, BannerInput, CategoryInput, ProductInput, SettingsInput } from "../schemas";
import type { Pricing } from "../pricing";
import type {
  Address,
  AddressSnapshot,
  AppNotification,
  Banner,
  Category,
  CustomerSummary,
  Order,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  Product,
  Profile,
  PushSubscriptionRecord,
  Settings,
} from "../types";

export interface NewOrderArgs {
  userId: string;
  customerName: string;
  customerPhone: string;
  type: OrderType;
  paymentMethod: PaymentMethod;
  note: string;
  address: AddressSnapshot | null;
  pricing: Pricing;
}

/** Everything the two apps need from storage. Demo (file) and Supabase both implement it. */
export interface Repo {
  // catalog
  getCategories(opts?: { includeHidden?: boolean }): Promise<Category[]>;
  getProducts(opts?: { includeUnavailable?: boolean }): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  getBanners(opts?: { includeInactive?: boolean }): Promise<Banner[]>;
  getSettings(): Promise<Settings>;

  // customers
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, data: { fullName: string; phone: string }): Promise<void>;
  listAddresses(userId: string): Promise<Address[]>;
  saveAddress(userId: string, data: AddressInput): Promise<Address>;
  deleteAddress(userId: string, id: string): Promise<void>;

  // orders
  createOrder(args: NewOrderArgs): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  listUserOrders(userId: string): Promise<Order[]>;
  listOrders(): Promise<Order[]>;
  updateOrderStatus(id: string, next: OrderStatus, actorId: string, reason?: string): Promise<Order>;
  setRider(id: string, riderName: string, riderPhone: string): Promise<Order>;
  setPaymentStatus(id: string, status: PaymentStatus): Promise<Order>;
  recordPayment(p: { orderId: string; gatewayOrderId: string; gatewayPaymentId: string; amountPaise: number; status: string; raw: unknown }): Promise<void>;
  findOrderByGatewayOrderId(gatewayOrderId: string): Promise<Order | null>;

  // dashboard
  listNotifications(limit?: number): Promise<AppNotification[]>;
  markNotificationsRead(orderId?: string): Promise<void>;
  listCustomers(): Promise<CustomerSummary[]>;
  listCustomerOrders(userId: string): Promise<Order[]>;

  // admin catalog
  upsertCategory(data: CategoryInput): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  reorderCategories(ids: string[]): Promise<void>;
  upsertProduct(data: ProductInput): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  setProductsAvailability(ids: string[], isAvailable: boolean): Promise<void>;
  upsertBanner(data: BannerInput): Promise<Banner>;
  deleteBanner(id: string): Promise<void>;
  reorderBanners(slot: "hero" | "strip", ids: string[]): Promise<void>;
  updateSettings(data: SettingsInput): Promise<Settings>;

  // push
  addPushSub(userId: string, endpoint: string, keys: { p256dh: string; auth: string }): Promise<void>;
  listPushSubs(userId: string): Promise<PushSubscriptionRecord[]>;
  removePushSub(endpoint: string): Promise<void>;
}

export class RepoError extends Error {}
