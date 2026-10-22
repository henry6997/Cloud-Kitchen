-- Blip cloud kitchen: initial schema, RLS and realtime.
-- Money is stored as integer paise. Orders snapshot names, prices, options and addresses.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer', 'owner')),
  created_at timestamptz not null default now()
);

-- Role is always 'customer' on sign-up. The owner is promoted by hand (see README).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.raw_user_meta_data ->> 'phone', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;

-- --------------------------------------------------------------- addresses
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  line1 text not null,
  line2 text not null default '',
  landmark text not null default '',
  pincode text not null,
  lat double precision,
  lng double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

-- ----------------------------------------------------------------- catalog
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '🍽️',
  image_url text,
  sort_order int not null default 0,
  is_visible boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null,
  description text not null default '',
  price_paise int not null check (price_paise >= 0),
  compare_price_paise int,
  image_url text,
  emoji text not null default '🍽️',
  is_veg boolean not null default true,
  is_available boolean not null default true,
  is_popular boolean not null default false,
  is_combo boolean not null default false,
  tag text,
  prep_minutes int not null default 20,
  rating numeric(2, 1) not null default 4.5,
  rating_count int not null default 0,
  sort_order int not null default 0
);
create index products_category_idx on public.products (category_id, sort_order);

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('single', 'multiple')),
  is_required boolean not null default false,
  sort_order int not null default 0
);
create index option_groups_product_idx on public.option_groups (product_id);

create table public.options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.option_groups (id) on delete cascade,
  name text not null,
  price_delta_paise int not null default 0,
  is_available boolean not null default true,
  sort_order int not null default 0
);
create index options_group_idx on public.options (group_id);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  label text not null default '',
  link_type text not null default 'none' check (link_type in ('none', 'category', 'product', 'url')),
  link_target text not null default '',
  slot text not null check (slot in ('hero', 'strip')),
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.settings (
  id boolean primary key default true check (id), -- single row
  kitchen_name text not null,
  address text not null default '',
  phone text not null default '',
  delivery_fee_paise int not null default 3000,
  free_delivery_threshold_paise int not null default 39900,
  min_order_paise int not null default 14900,
  gst_percent numeric(4, 2) not null default 0,
  delivery_pincodes text[] not null default '{}',
  pickup_eta_minutes int not null default 20,
  delivery_eta_text text not null default '30–40 min',
  enforce_kitchen_hours boolean not null default false
);

-- ------------------------------------------------------------------ orders
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint not null unique default nextval('public.order_number_seq'),
  user_id uuid not null references public.profiles (id),
  customer_name text not null default '',
  customer_phone text not null default '',
  type text not null check (type in ('delivery', 'pickup')),
  status text not null default 'placed' check (status in ('placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'picked_up', 'cancelled')),
  address_snapshot jsonb,
  subtotal_paise int not null,
  delivery_fee_paise int not null default 0,
  tax_paise int not null default 0,
  total_paise int not null,
  payment_method text not null check (payment_method in ('online', 'cod')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'collected')),
  note text not null default '',
  rider_name text not null default '',
  rider_phone text not null default '',
  cancel_reason text not null default '',
  created_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid,
  name_snapshot text not null,
  unit_price_paise int not null,
  quantity int not null check (quantity > 0),
  options_snapshot jsonb not null default '[]',
  note text not null default ''
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  reason text,
  created_at timestamptz not null default now(),
  created_by uuid
);
create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  gateway_order_id text not null,
  gateway_payment_id text,
  amount_paise int not null,
  status text not null,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index payments_gateway_idx on public.payments (gateway_order_id);
-- Idempotent webhooks: one row per gateway payment id.
create unique index payments_gateway_payment_uniq on public.payments (gateway_payment_id) where gateway_payment_id is not null;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('new_order', 'payment', 'cancelled')),
  order_id uuid not null references public.orders (id) on delete cascade,
  order_number bigint not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.push_subs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

create table public.passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text[],
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.banners enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subs enable row level security;
alter table public.passkeys enable row level security;

-- profiles: read and edit your own (never the role column), owner reads all.
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_owner());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;

-- addresses: strictly your own.
create policy addresses_all on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- public menu: anyone reads, only the owner writes.
create policy categories_read on public.categories for select using (true);
create policy categories_write on public.categories for all using (public.is_owner()) with check (public.is_owner());
create policy products_read on public.products for select using (true);
create policy products_write on public.products for all using (public.is_owner()) with check (public.is_owner());
create policy option_groups_read on public.option_groups for select using (true);
create policy option_groups_write on public.option_groups for all using (public.is_owner()) with check (public.is_owner());
create policy options_read on public.options for select using (true);
create policy options_write on public.options for all using (public.is_owner()) with check (public.is_owner());
create policy banners_read on public.banners for select using (is_active or public.is_owner());
create policy banners_write on public.banners for all using (public.is_owner()) with check (public.is_owner());
create policy settings_read on public.settings for select using (true);
create policy settings_write on public.settings for all using (public.is_owner()) with check (public.is_owner());

-- orders: customers read their own. Creating an order goes through the server
-- (service role) so totals can never be forged from a browser.
create policy orders_select on public.orders for select using (user_id = auth.uid() or public.is_owner());
create policy orders_owner_update on public.orders for update using (public.is_owner()) with check (public.is_owner());
create policy order_items_select on public.order_items for select using (
  public.is_owner() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy order_events_select on public.order_events for select using (
  public.is_owner() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy order_events_owner_insert on public.order_events for insert with check (public.is_owner());

create policy payments_owner_select on public.payments for select using (public.is_owner());
create policy notifications_owner on public.notifications for all using (public.is_owner()) with check (public.is_owner());
create policy push_subs_own on public.push_subs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy passkeys_select on public.passkeys for select using (user_id = auth.uid());
create policy passkeys_delete on public.passkeys for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------- realtime
alter publication supabase_realtime add table public.orders, public.notifications;

-- ----------------------------------------------------------------- storage
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict do nothing;
create policy product_images_read on storage.objects for select using (bucket_id = 'product-images');
create policy product_images_owner_write on storage.objects for all using (bucket_id = 'product-images' and public.is_owner()) with check (bucket_id = 'product-images' and public.is_owner());
