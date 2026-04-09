do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'placed',
      'confirmed',
      'preparing',
      'picked_up',
      'delivered',
      'cancelled'
    );
  end if;
end $$;

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  street text not null,
  city text not null,
  state text not null,
  pincode text not null,
  lat double precision,
  lng double precision,
  is_default boolean not null default false
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id),
  address_id uuid not null references public.addresses (id),
  status public.order_status not null default 'placed',
  subtotal numeric(10,2) not null check (subtotal >= 0),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total numeric(10,2) not null check (total >= 0),
  payment_method text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id),
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  quantity integer not null check (quantity > 0)
);

create index if not exists idx_addresses_user on public.addresses (user_id);
create index if not exists idx_orders_user on public.orders (user_id);
create index if not exists idx_orders_restaurant on public.orders (restaurant_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_order_items_order on public.order_items (order_id);

create or replace function public.handle_order_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.handle_order_updated_at();

alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "addresses_user_read_own"
on public.addresses
for select
using (auth.uid() = user_id);

create policy "addresses_user_insert_own"
on public.addresses
for insert
with check (auth.uid() = user_id);

create policy "addresses_user_update_own"
on public.addresses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "orders_user_or_restaurant_owner_read"
on public.orders
for select
using (
  auth.uid() = user_id
  or (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'restaurant_owner', false)
    and (auth.jwt() ->> 'restaurant_id')::uuid = restaurant_id
  )
);

create policy "orders_user_insert_own"
on public.orders
for insert
with check (auth.uid() = user_id);

create policy "orders_user_update_own"
on public.orders
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "order_items_user_or_restaurant_owner_read"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        o.user_id = auth.uid()
        or (
          coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'restaurant_owner', false)
          and (auth.jwt() ->> 'restaurant_id')::uuid = o.restaurant_id
        )
      )
  )
);

create policy "order_items_user_insert_own"
on public.order_items
for insert
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
  )
);
