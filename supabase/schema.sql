-- ============================================================
-- Hotel Food Ordering - Supabase SQL Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Food Items Table ─────────────────────────────────────
create table if not exists public.food_items (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null,
  description           text,
  price                 numeric(10,2) not null check (price > 0),
  category              text,
  image_url             text,
  cloudinary_public_id  text,
  is_available          boolean not null default true,
  unavailable_until     date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_food_items_available on public.food_items (is_available);
create index if not exists idx_food_items_category   on public.food_items (category);

-- ─── Orders Table ─────────────────────────────────────────
create table if not exists public.orders (
  id            uuid primary key default uuid_generate_v4(),
  order_number  text not null unique,
  table_number  text not null,
  status        text not null default 'new'
                  check (status in ('new','preparing','ready','completed','cancelled')),
  total_amount  numeric(10,2) not null check (total_amount >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_orders_status     on public.orders (status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

-- ─── Order Items Table ─────────────────────────────────────
create table if not exists public.order_items (
  id              uuid primary key default uuid_generate_v4(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  food_item_id    uuid references public.food_items(id) on delete set null,
  name_snapshot   text not null,
  price_snapshot  numeric(10,2) not null,
  quantity        integer not null check (quantity > 0)
);

create index if not exists idx_order_items_order_id on public.order_items (order_id);

-- ─── Realtime Publication ─────────────────────────────────
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when others then null;
end $$;

-- ─── Row Level Security (RLS) ─────────────────────────────
alter table public.food_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Food items policies
drop policy if exists "Public can read available food items" on public.food_items;
create policy "Public can read available food items"
  on public.food_items for select
  using (true);

drop policy if exists "Admin full access to food items" on public.food_items;
create policy "Admin full access to food items"
  on public.food_items for all
  using (true)
  with check (true);

-- Orders policies
drop policy if exists "Customers can insert orders" on public.orders;
create policy "Customers can insert orders"
  on public.orders for insert
  with check (true);

drop policy if exists "Admin can read all orders" on public.orders;
create policy "Admin can read all orders"
  on public.orders for select
  using (true);

drop policy if exists "Admin can update orders" on public.orders;
create policy "Admin can update orders"
  on public.orders for update
  using (true)
  with check (true);

-- Order items policies
drop policy if exists "Customers can insert order items" on public.order_items;
create policy "Customers can insert order items"
  on public.order_items for insert
  with check (true);

drop policy if exists "Admin can read order items" on public.order_items;
create policy "Admin can read order items"
  on public.order_items for select
  using (true);

-- ─── Updated_at Automatic Trigger ──────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists food_items_updated_at on public.food_items;
create trigger food_items_updated_at
  before update on public.food_items
  for each row execute function public.set_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ─── Initial Menu Items (Seed Dishes with Rupee Prices) ───
insert into public.food_items (name, description, price, category, is_available)
values
  ('Butter Chicken', 'Tender chicken in a rich, creamy tomato and butter gravy', 280, 'Main Course', true),
  ('Paneer Tikka Masala', 'Grilled cottage cheese cubes in a spiced tomato masala', 240, 'Main Course', true),
  ('Dal Makhani', 'Slow-cooked black lentils with cream and aromatic spices', 180, 'Main Course', true),
  ('Garlic Naan', 'Soft leavened flatbread with garlic butter, baked in tandoor', 60, 'Breads', true),
  ('Tandoori Roti', 'Whole wheat bread baked fresh in a clay oven', 35, 'Breads', true),
  ('Veg Biryani', 'Fragrant basmati rice layered with seasonal vegetables and saffron', 200, 'Rice & Biryani', true),
  ('Chicken Biryani', 'Aromatic long-grain rice cooked with tender chicken and whole spices', 320, 'Rice & Biryani', true),
  ('Samosa (2 pcs)', 'Crispy fried pastry filled with spiced potatoes and peas', 50, 'Starters', true),
  ('Chicken Seekh Kebab', 'Minced chicken with herbs and spices, skewered and grilled', 220, 'Starters', true),
  ('Gulab Jamun', 'Soft milk-solid dumplings soaked in rose-flavoured sugar syrup', 90, 'Desserts', true),
  ('Mango Lassi', 'Chilled yogurt drink blended with fresh Alphonso mango pulp', 80, 'Beverages', true),
  ('Masala Chai', 'Hot spiced tea brewed with ginger, cardamom and milk', 40, 'Beverages', true)
on conflict do nothing;
