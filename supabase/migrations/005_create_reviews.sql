create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (order_id, user_id)
);

create index if not exists idx_reviews_restaurant on public.reviews (restaurant_id);
create index if not exists idx_reviews_order on public.reviews (order_id);

alter table public.reviews enable row level security;

create policy "reviews_public_read"
on public.reviews
for select
using (true);

create policy "reviews_user_insert_one_per_order"
on public.reviews
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.orders o
    where o.id = reviews.order_id
      and o.user_id = auth.uid()
      and o.status = 'delivered'
      and o.restaurant_id = reviews.restaurant_id
  )
);

create policy "reviews_user_update_own"
on public.reviews
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reviews_user_delete_own"
on public.reviews
for delete
using (auth.uid() = user_id);
