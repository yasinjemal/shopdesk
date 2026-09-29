-- ShopDesk storage for the Vercel deployment (Supabase Postgres).
-- Mirrors the Cloudflare D1 schema in drizzle/0000_quick_mandrill.sql so saved workspace JSON is identical.
-- Run once in the Supabase SQL editor. Create the private Storage bucket "shopdesk-photos" separately (see README).

create table if not exists public.poster_workspaces (
  owner text primary key,
  data text not null,               -- the same JSON string that D1 stores
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.product_photos (
  id uuid primary key,
  owner text not null,
  mime text not null,
  bytes integer not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_photos_owner on public.product_photos (owner);

-- Only the server (service-role key, which bypasses RLS) may touch these tables.
alter table public.poster_workspaces enable row level security;
alter table public.product_photos enable row level security;
revoke all on public.poster_workspaces, public.product_photos from anon, authenticated;

-- Atomic compare-and-swap save, equivalent to the D1 upsert in the Worker.
-- Returns the new revision, or NULL when the revision is stale (the API then answers 409).
create or replace function public.shopdesk_save_workspace(p_owner text, p_data text, p_revision integer, p_studio boolean)
returns integer
language plpgsql
security invoker
as $$
declare
  new_revision integer;
begin
  if p_revision = 0 then
    insert into public.poster_workspaces (owner, data, revision, updated_at)
    values (p_owner, p_data, 1, now())
    on conflict (owner) do nothing
    returning revision into new_revision;
    return new_revision;
  end if;
  update public.poster_workspaces
     set data = p_data, revision = revision + 1, updated_at = now()
   where owner = p_owner
     and revision = p_revision
     and (p_studio or coalesce((data::jsonb ->> 'schemaVersion')::int, 1) <> 2)
  returning revision into new_revision;
  return new_revision;
end;
$$;
revoke all on function public.shopdesk_save_workspace(text, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.shopdesk_save_workspace(text, text, integer, boolean) to service_role;
