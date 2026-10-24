-- ============================================================
-- Hotel Food Ordering - Supabase SQL Schema
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";   -- for daily reset (enable via Supabase Dashboard > Extensions)

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
  -- date (not timestamp) - item is unavailable until this date (exclusive)
  -- null means permanently available (or availability controlled by is_available only)
  unavailable_until     date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Indexes
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

-- Indexes
create index if not exists idx_orders_status     on public.orders (status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

-- ─── Order Items Table ─────────────────────────────────────
create table if not exists public.order_items (
  id              uuid primary key default uuid_generate_v4(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  food_item_id    uuid references public.food_items(id) on delete set null,
  -- Snapshot of item details at order time
  name_snapshot   text not null,
  price_snapshot  numeric(10,2) not null,
  quantity        integer not null check (quantity > 0)
);

create index if not exists idx_order_items_order_id on public.order_items (order_id);

-- ─── Realtime ─────────────────────────────────────────────
-- Enable realtime on orders table (run in Supabase Dashboard > Database > Replication too)
alter publication supabase_realtime add table public.orders;

-- ─── Row Level Security ────────────────────────────────────

-- food_items
alter table public.food_items enable row level security;

-- Public: read available items
create policy "Public can read available food items"
  on public.food_items for select
  using (
    is_available = true
    and (unavailable_until is null or unavailable_until <= current_date)
  );

-- Admin: full access (authenticated users only)
create policy "Admin full access to food items"
  on public.food_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- orders
alter table public.orders enable row level security;

-- Anyone can insert orders (customer ordering)
create policy "Customers can insert orders"
  on public.orders for insert
  with check (true);

-- Admin only: read all orders
create policy "Admin can read all orders"
  on public.orders for select
  using (auth.role() = 'authenticated');

-- Admin only: update order status
create policy "Admin can update orders"
  on public.orders for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- order_items
alter table public.order_items enable row level security;

-- Anyone can insert order items (part of order submission)
create policy "Customers can insert order items"
  on public.order_items for insert
  with check (true);

-- Admin only: read order items
create policy "Admin can read order items"
  on public.order_items for select
  using (auth.role() = 'authenticated');

-- ─── Daily Availability Reset (pg_cron) ────────────────────
-- Runs every day at 00:00 IST (= 18:30 UTC previous day)
-- This restores all items whose unavailable_until <= today
select cron.schedule(
  'daily-menu-reset',
  '30 18 * * *',   -- 18:30 UTC = 00:00 IST
  $$
    update public.food_items
    set
      is_available = true,
      unavailable_until = null,
      updated_at = now()
    where
      is_available = false
      and unavailable_until is not null
      and unavailable_until <= current_date;
  $$
);

-- ─── Updated_at trigger ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger food_items_updated_at
  before update on public.food_items
  for each row execute function public.set_updated_at();

create or replace trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ─── Sample Data (optional, remove before production) ──────
-- insert into public.food_items (name, description, price, category, is_available) values
--   ('Butter Chicken', 'Tender chicken in rich tomato-butter gravy', 280.00, 'Main Course', true),
--   ('Garlic Naan', 'Soft leavened bread with garlic butter', 60.00, 'Breads', true),
--   ('Mango Lassi', 'Refreshing yogurt-based mango drink', 80.00, 'Beverages', true);
