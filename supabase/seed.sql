-- Restaurants (Prayagraj area)
insert into public.restaurants (
  id, name, description, cuisine_type, rating, delivery_time_min, min_order_amount,
  delivery_fee, image_url, is_open, lat, lng
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'Sangam Spice Kitchen',
    'Authentic North Indian and Mughlai favorites near Civil Lines.',
    'Indian',
    4.5,
    34,
    199,
    29,
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
    true,
    25.4484,
    81.8337
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Dragon Ghat Wok',
    'Street-style Indo-Chinese bowls, noodles, and momos.',
    'Chinese',
    4.3,
    30,
    149,
    25,
    'https://images.unsplash.com/photo-1512058564366-18510be2db19',
    true,
    25.4328,
    81.8463
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Yamuna Oven Pizza Co.',
    'Hand-tossed pizzas, cheesy sides, and baked desserts.',
    'Pizza',
    4.4,
    32,
    249,
    39,
    'https://images.unsplash.com/photo-1513104890138-7c749659a591',
    true,
    25.4359,
    81.8341
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Nawab Dum Biryani',
    'Lucknowi-style dum biryani and kebab platters.',
    'Biryani',
    4.6,
    36,
    229,
    35,
    'https://images.unsplash.com/photo-1563379091339-03246963d29a',
    true,
    25.4235,
    81.8394
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Allahabad Quick Bites',
    'Burgers, wraps, fries, and shakes for late-night cravings.',
    'Fast Food',
    4.2,
    24,
    129,
    20,
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    true,
    25.4511,
    81.8279
  )
on conflict (id) do nothing;

-- Menu categories
insert into public.menu_categories (id, restaurant_id, name, sort_order) values
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Starters', 1),
  ('a1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Main Course', 2),
  ('a1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Breads', 3),

  ('a2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Noodles', 1),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Rice Bowls', 2),
  ('a2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'Momos', 3),

  ('a3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'Classic Pizza', 1),
  ('a3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'Special Pizza', 2),
  ('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Sides', 3),

  ('a4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', 'Biryani', 1),
  ('a4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444444', 'Kebabs', 2),
  ('a4444444-4444-4444-4444-444444444443', '44444444-4444-4444-4444-444444444444', 'Raita & Sides', 3),

  ('a5555555-5555-5555-5555-555555555551', '55555555-5555-5555-5555-555555555555', 'Burgers', 1),
  ('a5555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555555', 'Wraps', 2),
  ('a5555555-5555-5555-5555-555555555553', '55555555-5555-5555-5555-555555555555', 'Fries & Shakes', 3)
on conflict (id) do nothing;

-- Menu items
insert into public.menu_items (
  id, category_id, restaurant_id, name, description, price, image_url, is_available, is_veg
) values
  -- Sangam Spice Kitchen
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Paneer Tikka', 'Chargrilled cottage cheese cubes with masala.', 289, 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8', true, true),
  ('b1111111-1111-1111-1111-111111111112', 'a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Chicken Malai Kebab', 'Creamy tandoori kebab with mild spices.', 349, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0', true, false),
  ('b1111111-1111-1111-1111-111111111113', 'a1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Butter Chicken', 'Rich tomato gravy with tender chicken.', 379, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398', true, false),
  ('b1111111-1111-1111-1111-111111111114', 'a1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Dal Makhani', 'Slow-cooked black lentils with cream.', 279, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d', true, true),
  ('b1111111-1111-1111-1111-111111111115', 'a1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Butter Naan', 'Soft tandoor naan brushed with butter.', 55, 'https://images.unsplash.com/photo-1626074353765-517a681e40be', true, true),
  ('b1111111-1111-1111-1111-111111111116', 'a1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Garlic Naan', 'Naan topped with garlic and coriander.', 65, 'https://images.unsplash.com/photo-1601050690597-df0568f70950', true, true),

  -- Dragon Ghat Wok
  ('b2222222-2222-2222-2222-222222222221', 'a2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Hakka Noodles', 'Wok-tossed noodles with veggies.', 199, 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841', true, true),
  ('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Chicken Schezwan Noodles', 'Spicy schezwan tossed chicken noodles.', 249, 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1', true, false),
  ('b2222222-2222-2222-2222-222222222223', 'a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Veg Manchurian Rice Bowl', 'Fried rice topped with manchurian gravy.', 229, 'https://images.unsplash.com/photo-1512058564366-18510be2db19', true, true),
  ('b2222222-2222-2222-2222-222222222224', 'a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Chilli Chicken Rice Bowl', 'Rice bowl with spicy chilli chicken.', 269, 'https://images.unsplash.com/photo-1628294896516-1fbc8f86a40e', true, false),
  ('b2222222-2222-2222-2222-222222222225', 'a2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'Steamed Veg Momos', 'Soft dumplings with herb filling.', 169, 'https://images.unsplash.com/photo-1666190092159-3171cf0fbb12', true, true),
  ('b2222222-2222-2222-2222-222222222226', 'a2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'Fried Chicken Momos', 'Crispy momos served with hot dip.', 199, 'https://images.unsplash.com/photo-1701579231308-7f9f9d70371f', true, false),

  -- Yamuna Oven Pizza Co.
  ('b3333333-3333-3333-3333-333333333331', 'a3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'Margherita', 'Classic tomato, basil, and mozzarella.', 299, 'https://images.unsplash.com/photo-1598023696416-0193a0bcd302', true, true),
  ('b3333333-3333-3333-3333-333333333332', 'a3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'Farmhouse', 'Veg-loaded pizza with olives and capsicum.', 379, 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c', true, true),
  ('b3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'Pepperoni Blast', 'Double pepperoni with extra cheese.', 429, 'https://images.unsplash.com/photo-1628840042765-356cda07504e', true, false),
  ('b3333333-3333-3333-3333-333333333334', 'a3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'Paneer Tandoori Pizza', 'Indian masala paneer pizza.', 409, 'https://images.unsplash.com/photo-1571066811602-716837d681de', true, true),
  ('b3333333-3333-3333-3333-333333333335', 'a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Cheesy Garlic Bread', 'Garlic bread with mozzarella filling.', 189, 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c', true, true),
  ('b3333333-3333-3333-3333-333333333336', 'a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Choco Lava Cake', 'Warm chocolate center dessert.', 119, 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e', true, true),

  -- Nawab Dum Biryani
  ('b4444444-4444-4444-4444-444444444441', 'a4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', 'Chicken Dum Biryani', 'Fragrant basmati and slow-cooked chicken.', 319, 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a', true, false),
  ('b4444444-4444-4444-4444-444444444442', 'a4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', 'Mutton Dum Biryani', 'Signature mutton biryani in handi.', 429, 'https://images.unsplash.com/photo-1701579231347-6fbdbf2db3ab', true, false),
  ('b4444444-4444-4444-4444-444444444443', 'a4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444444', 'Seekh Kebab', 'Juicy minced meat kebabs.', 299, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd', true, false),
  ('b4444444-4444-4444-4444-444444444444', 'a4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444444', 'Paneer Reshmi Kebab', 'Creamy paneer kebabs grilled in tandoor.', 269, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0', true, true),
  ('b4444444-4444-4444-4444-444444444445', 'a4444444-4444-4444-4444-444444444443', '44444444-4444-4444-4444-444444444444', 'Boondi Raita', 'Cooling yogurt with boondi.', 79, 'https://images.unsplash.com/photo-1584270354949-1f03fbe5736a', true, true),
  ('b4444444-4444-4444-4444-444444444446', 'a4444444-4444-4444-4444-444444444443', '44444444-4444-4444-4444-444444444444', 'Mirchi Salan', 'Hyderabadi side gravy.', 89, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0', true, true),

  -- Allahabad Quick Bites
  ('b5555555-5555-5555-5555-555555555551', 'a5555555-5555-5555-5555-555555555551', '55555555-5555-5555-5555-555555555555', 'Classic Chicken Burger', 'Grilled chicken patty with house sauce.', 179, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd', true, false),
  ('b5555555-5555-5555-5555-555555555552', 'a5555555-5555-5555-5555-555555555551', '55555555-5555-5555-5555-555555555555', 'Crispy Veg Burger', 'Crunchy veggie patty with lettuce.', 149, 'https://images.unsplash.com/photo-1550547660-d9450f859349', true, true),
  ('b5555555-5555-5555-5555-555555555553', 'a5555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555555', 'Paneer Tikka Wrap', 'Soft wrap loaded with paneer tikka.', 169, 'https://images.unsplash.com/photo-1644464262167-ff66f7f6f6a6', true, true),
  ('b5555555-5555-5555-5555-555555555554', 'a5555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555555', 'Peri Peri Chicken Wrap', 'Spicy peri peri chicken wrap.', 199, 'https://images.unsplash.com/photo-1598679253544-2c97992403ea', true, false),
  ('b5555555-5555-5555-5555-555555555555', 'a5555555-5555-5555-5555-555555555553', '55555555-5555-5555-5555-555555555555', 'Loaded Fries', 'Cheesy fries with jalapenos.', 139, 'https://images.unsplash.com/photo-1576107232684-1279f390859f', true, true),
  ('b5555555-5555-5555-5555-555555555556', 'a5555555-5555-5555-5555-555555555553', '55555555-5555-5555-5555-555555555555', 'Chocolate Thick Shake', 'Rich chocolate milkshake.', 129, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699', true, true)
on conflict (id) do nothing;
