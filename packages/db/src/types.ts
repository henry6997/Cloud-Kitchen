export type Role = "customer" | "owner";
export type OrderType = "delivery" | "pickup";
export type OrderStatus = "placed" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "picked_up" | "cancelled";
export type PaymentMethod = "online" | "cod";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "collected";

export interface Category {
  id: string;
  name: string;
  emoji: string;
  /** Round photo for the home category circles; the emoji shows until one is set. */
  imageUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
}

export interface OptionItem {
  id: string;
  groupId: string;
  name: string;
  priceDeltaPaise: number;
  isAvailable: boolean;
}

export interface OptionGroup {
  id: string;
  productId: string;
  name: string;
  kind: "single" | "multiple";
  isRequired: boolean;
  options: OptionItem[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  pricePaise: number;
  comparePricePaise: number | null;
  imageUrl: string | null;
  /** Placeholder shown when there is no photo yet. */
  emoji: string;
  isVeg: boolean;
  isAvailable: boolean;
  isPopular: boolean;
  isCombo: boolean;
  tag: string | null;
  prepMinutes: number;
  rating: number;
  ratingCount: number;
  sortOrder: number;
  optionGroups: OptionGroup[];
}

export interface Banner {
  id: string;
  imageUrl: string | null;
  label: string;
  linkType: "none" | "category" | "product" | "url";
  linkTarget: string;
  slot: "hero" | "strip";
  sortOrder: number;
  isActive: boolean;
}

export interface Settings {
  kitchenName: string;
  address: string;
  phone: string;
  deliveryFeePaise: number;
  freeDeliveryThresholdPaise: number;
  minOrderPaise: number;
  gstPercent: number;
  deliveryPincodes: string[];
  pickupEtaMinutes: number;
  deliveryEtaText: string;
  /** Single flag so kitchen hours can be enforced later without a redesign. */
  enforceKitchenHours: boolean;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  line1: string;
  line2: string;
  landmark: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
}

export interface AddressSnapshot {
  label: string;
  line1: string;
  line2: string;
  landmark: string;
  pincode: string;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
}

export interface OrderItemOption {
  group: string;
  name: string;
  priceDeltaPaise: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  unitPricePaise: number;
  quantity: number;
  options: OrderItemOption[];
  note: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  status: OrderStatus;
  createdAt: string;
  createdBy: string | null;
  reason?: string;
}

export interface Order {
  id: string;
  number: number;
  userId: string;
  customerName: string;
  customerPhone: string;
  type: OrderType;
  status: OrderStatus;
  addressSnapshot: AddressSnapshot | null;
  subtotalPaise: number;
  deliveryFeePaise: number;
  taxPaise: number;
  totalPaise: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  note: string;
  riderName: string;
  riderPhone: string;
  cancelReason: string;
  createdAt: string;
  items: OrderItem[];
  events: OrderEvent[];
}

export interface AppNotification {
  id: string;
  kind: "new_order" | "payment" | "cancelled";
  orderId: string;
  orderNumber: number;
  isRead: boolean;
  createdAt: string;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface CustomerSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  orderCount: number;
  spentPaise: number;
  lastOrderAt: string | null;
}
