-- 006_add_roles_and_riders.sql
-- Extends schema for role-based access, rider operations, notifications, and realtime.

-- 1) Add role to profiles table
alter table if exists public.profiles
  add column if not exists role text not null default 'customer';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('customer', 'restaurant_owner', 'rider', 'admin'));
  end if;
end;
$$;

-- 2) Restaurant owners table
create table if not exists public.restaurant_owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  is_verified boolean default false,
  created_at timestamptz default now(),
  unique(user_id, restaurant_id)
);

-- 3) Riders table
create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_type text check (vehicle_type in ('bike', 'bicycle', 'scooter')),
  vehicle_number text,
  is_online boolean default false,
  is_verified boolean default false,
  current_lat float,
  current_lng float,
  last_location_update timestamptz,
  rating float default 5.0,
  total_deliveries int default 0,
  created_at timestamptz default now()
);

-- 4) Add rider assignment/payment columns to orders
alter table if exists public.orders
  add column if not exists rider_id uuid references public.riders(id),
  add column if not exists rider_assigned_at timestamptz,
  add column if not exists picked_up_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists payment_status text default 'pending',
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_payment_status_check
      check (payment_status in ('pending', 'paid', 'failed', 'refunded'));
  end if;
end;
$$;

-- 5) Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text check (type in ('order_update', 'promo', 'system')),
  is_read boolean default false,
  order_id uuid references public.orders(id),
  created_at timestamptz default now()
);

-- 6) FCM tokens table
create table if not exists public.fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text check (platform in ('android', 'ios')),
  updated_at timestamptz default now(),
  unique(user_id, token)
);

-- 7) Earnings table for riders
create table if not exists public.rider_earnings (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id) on delete cascade,
  order_id uuid not null references public.orders(id),
  amount float not null,
  paid_at timestamptz default now()
);

-- Helpful indexes
create index if not exists idx_restaurant_owners_user_id on public.restaurant_owners(user_id);
create index if not exists idx_restaurant_owners_restaurant_id on public.restaurant_owners(restaurant_id);
create index if not exists idx_riders_user_id on public.riders(user_id);
create index if not exists idx_orders_rider_id on public.orders(rider_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_fcm_tokens_user_id on public.fcm_tokens(user_id);
create index if not exists idx_rider_earnings_rider_id on public.rider_earnings(rider_id);

-- Enable RLS on new tables
alter table public.restaurant_owners enable row level security;
alter table public.riders enable row level security;
alter table public.notifications enable row level security;
alter table public.fcm_tokens enable row level security;
alter table public.rider_earnings enable row level security;

-- 8) RLS Policies
-- Riders: can update own location and status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'riders'
      AND policyname = 'riders_update_own'
  ) THEN
    CREATE POLICY riders_update_own ON public.riders
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END;
$$;

-- Restaurant owners: can update their restaurant's orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'owners_update_orders'
  ) THEN
    CREATE POLICY owners_update_orders ON public.orders
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.restaurant_owners ro
          WHERE ro.restaurant_id = orders.restaurant_id
            AND ro.user_id = auth.uid()
        )
      );
  END IF;
END;
$$;

-- Riders: can update orders assigned to them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'riders_update_assigned_orders'
  ) THEN
    CREATE POLICY riders_update_assigned_orders ON public.orders
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.riders r
          WHERE r.id = orders.rider_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END;
$$;

-- Notifications: users see only their own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'own_notifications'
  ) THEN
    CREATE POLICY own_notifications ON public.notifications
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END;
$$;

-- 9) Enable Realtime on new tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'riders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;
