create or replace function public.create_order_with_items(
  p_user_id uuid,
  p_restaurant_id uuid,
  p_address_id uuid,
  p_payment_method text,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_items jsonb
)
returns public.orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_order public.orders;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() <> p_user_id then
    raise exception 'User mismatch';
  end if;

  if not exists (
    select 1
    from public.addresses a
    where a.id = p_address_id
      and a.user_id = p_user_id
  ) then
    raise exception 'Address not found for user';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order items cannot be empty';
  end if;

  insert into public.orders (
    user_id,
    restaurant_id,
    address_id,
    status,
    subtotal,
    delivery_fee,
    total,
    payment_method
  )
  values (
    p_user_id,
    p_restaurant_id,
    p_address_id,
    'placed',
    p_subtotal,
    p_delivery_fee,
    p_total,
    p_payment_method
  )
  returning * into new_order;

  insert into public.order_items (
    order_id,
    menu_item_id,
    name,
    price,
    quantity
  )
  select
    new_order.id,
    nullif(item ->> 'menu_item_id', '')::uuid,
    coalesce(item ->> 'name', ''),
    coalesce((item ->> 'price')::numeric, 0),
    coalesce((item ->> 'quantity')::integer, 0)
  from jsonb_array_elements(p_items) as item;

  return new_order;
end;
$$;

grant execute on function public.create_order_with_items(
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  jsonb
) to authenticated;
