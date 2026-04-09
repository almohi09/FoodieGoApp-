alter table public.orders
  add column if not exists rider_lat double precision,
  add column if not exists rider_lng double precision,
  add column if not exists rider_name text,
  add column if not exists rider_phone text;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;
