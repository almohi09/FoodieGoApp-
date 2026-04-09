create or replace function public.is_admin(_uid uuid)
returns boolean
language sql
stable
as $$
  select
    coalesce((auth.jwt() ->> 'role') = 'service_role', false)
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cuisine_type text not null,
  rating numeric(2,1) not null default 0.0 check (rating >= 0 and rating <= 5),
  delivery_time_min integer not null check (delivery_time_min > 0),
  min_order_amount numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  image_url text,
  is_open boolean not null default true,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

alter table public.restaurants enable row level security;

create policy "restaurants_public_read"
on public.restaurants
for select
using (true);

create policy "restaurants_admin_insert"
on public.restaurants
for insert
with check (public.is_admin(auth.uid()));

create policy "restaurants_admin_update"
on public.restaurants
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "restaurants_admin_delete"
on public.restaurants
for delete
using (public.is_admin(auth.uid()));
