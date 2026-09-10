-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this → Run)

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  title text not null,
  description text default '',
  url text default '',
  price text default '',
  image text default '',
  reserved boolean default false,
  reserved_by text,
  created_at timestamptz default now()
);

create index if not exists items_owner_idx on items (owner);

-- Public bucket for uploaded wishlist photos
insert into storage.buckets (id, name, public)
values ('wishlist-images', 'wishlist-images', true)
on conflict (id) do nothing;
