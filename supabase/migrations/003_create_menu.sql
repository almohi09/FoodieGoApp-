create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  unique (restaurant_id, name)
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  is_veg boolean not null default false
);

create index if not exists idx_menu_categories_restaurant on public.menu_categories (restaurant_id);
create index if not exists idx_menu_items_restaurant on public.menu_items (restaurant_id);
create index if not exists idx_menu_items_category on public.menu_items (category_id);

alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

create policy "menu_categories_public_read"
on public.menu_categories
for select
using (true);

create policy "menu_items_public_read"
on public.menu_items
for select
using (true);
