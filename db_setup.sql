-- ============================================================
--  Tavari Egypt — Full Database Setup  (idempotent, single pass)
-- ============================================================

-- 1) TABLES (final schema, no post-create alters)
create table if not exists public.trips (
  id text primary key,
  title text not null,
  base_price numeric not null default 0,
  pdf_url text,
  image_urls text[] not null default '{}',
  is_best_seller boolean not null default false,
  start_date date,
  end_date date,
  dates_label text,
  description text,
  itinerary jsonb,
  accommodation text,
  solo_message text,
  included text[],
  excluded text[],
  payment_methods text[],
  refund_policy text,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id text references public.trips(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  num_persons int not null default 1,
  total_price numeric not null default 0,
  receipt_url text,
  status text not null default 'pending_verification',
  created_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text,
  customer_email text,
  trip_interest text,
  interested_trip text,
  num_persons int not null default 1,
  notes text,
  status text not null default 'pending_contact',
  trip_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  trip_title text,
  rating int,
  quote text,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id bigint generated always as identity primary key,
  image_url text,
  caption text,
  position integer default 0
);

-- 2) ROW LEVEL SECURITY
alter table public.trips enable row level security;
alter table public.gallery enable row level security;
alter table public.reviews enable row level security;
alter table public.bookings enable row level security;
alter table public.inquiries enable row level security;

-- 3) PUBLIC READ POLICIES
drop policy if exists "trips public read" on public.trips;
create policy "trips public read" on public.trips for select using (true);

drop policy if exists "gallery public read" on public.gallery;
create policy "gallery public read" on public.gallery for select using (true);

drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read" on public.reviews for select using (true);

-- 4) ANONYMOUS INSERT POLICIES (forms)
drop policy if exists "bookings anon insert" on public.bookings;
create policy "bookings anon insert" on public.bookings for insert with check (true);

drop policy if exists "inquiries anon insert" on public.inquiries;
create policy "inquiries anon insert" on public.inquiries for insert with check (true);

-- 5) STORAGE BUCKETS + POLICIES
insert into storage.buckets (id, name, public)
values ('payment-receipts','payment-receipts', true)
on conflict (id) do nothing;

drop policy if exists "receipts anon upload" on storage.objects;
create policy "receipts anon upload"
  on storage.objects for insert with check (bucket_id='payment-receipts');

drop policy if exists "receipts public read" on storage.objects;
create policy "receipts public read"
  on storage.objects for select using (bucket_id='payment-receipts');

insert into storage.buckets (id, name, public)
values ('trip-media','trip-media', true)
on conflict (id) do nothing;

drop policy if exists "trip-media public read" on storage.objects;
create policy "trip-media public read"
  on storage.objects for select using (bucket_id='trip-media');
