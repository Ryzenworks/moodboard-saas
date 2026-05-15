-- ═══════════════════════════════════════════════════
-- MOODBOARD SAAS — DATABASE SCHEMA
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════════

-- ─── Profiles ────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ─── Auto-create profile on signup ───────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, plan)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    'free'
  );
  return new;
end;
$$;

-- Drop trigger if exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Boards ──────────────────────────────────────────
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  cover_url text,
  image_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.boards enable row level security;

create policy "Users can view own boards"
  on public.boards for select
  using (auth.uid() = user_id);

create policy "Users can create own boards"
  on public.boards for insert
  with check (auth.uid() = user_id);

create policy "Users can update own boards"
  on public.boards for update
  using (auth.uid() = user_id);

create policy "Users can delete own boards"
  on public.boards for delete
  using (auth.uid() = user_id);

-- ─── Images ──────────────────────────────────────────
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  url text not null,
  width int,
  height int,
  size_bytes bigint,
  note text default '',
  is_favorite boolean default false,
  palette text[] default '{}',
  sort_order bigint default 0,
  created_at timestamptz default now()
);

alter table public.images enable row level security;

create policy "Users can view own images"
  on public.images for select
  using (auth.uid() = user_id);

create policy "Users can insert own images"
  on public.images for insert
  with check (auth.uid() = user_id);

create policy "Users can update own images"
  on public.images for update
  using (auth.uid() = user_id);

create policy "Users can delete own images"
  on public.images for delete
  using (auth.uid() = user_id);

-- ─── Categories ──────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unique(board_id, name)
);

alter table public.categories enable row level security;

create policy "Users can view own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "Users can create own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- ─── Image ↔ Category junction ──────────────────────
create table if not exists public.image_categories (
  image_id uuid not null references public.images(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (image_id, category_id)
);

alter table public.image_categories enable row level security;

create policy "Users can view own image_categories"
  on public.image_categories for select
  using (
    exists (
      select 1 from public.images
      where images.id = image_categories.image_id
      and images.user_id = auth.uid()
    )
  );

create policy "Users can insert own image_categories"
  on public.image_categories for insert
  with check (
    exists (
      select 1 from public.images
      where images.id = image_categories.image_id
      and images.user_id = auth.uid()
    )
  );

create policy "Users can delete own image_categories"
  on public.image_categories for delete
  using (
    exists (
      select 1 from public.images
      where images.id = image_categories.image_id
      and images.user_id = auth.uid()
    )
  );

-- ─── Subscriptions ───────────────────────────────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  razorpay_subscription_id text,
  razorpay_customer_id text,
  status text default 'active',
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own subscription"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscription"
  on public.subscriptions for update
  using (auth.uid() = user_id);

-- ─── Indexes ─────────────────────────────────────────
create index if not exists idx_boards_user_id on public.boards(user_id);
create index if not exists idx_images_board_id on public.images(board_id);
create index if not exists idx_images_user_id on public.images(user_id);
create index if not exists idx_images_is_favorite on public.images(is_favorite);
create index if not exists idx_categories_board_id on public.categories(board_id);
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);

-- ─── Storage bucket ──────────────────────────────────
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Storage RLS: users can upload to their own folder
create policy "Users can upload images"
  on storage.objects for insert
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view own images"
  on storage.objects for select
  using (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own images"
  on storage.objects for delete
  using (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Public can view images"
  on storage.objects for select
  using (bucket_id = 'images');
