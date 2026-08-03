-- 1Fort deal rooms — schema, row-level security, and the anonymous share path.
-- Paste into the Supabase SQL editor and run. Safe to re-run.

create extension if not exists pgcrypto;

/* ---------------------------------------------------------------- tables */

create table if not exists public.rooms (
  id                uuid primary key default gen_random_uuid(),
  -- Who created it. Provenance only — access is team-wide, see the policies.
  owner_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind              text not null check (kind in ('deal', 'partnership')),
  status            text not null default 'draft' check (status in ('draft', 'live', 'archived')),
  -- Internal label for the rooms index. Never sent to the counterparty.
  name              text not null,
  account           jsonb not null default '{}'::jsonb,
  content           jsonb not null default '{}'::jsonb,
  -- Rep-only: what the draft was generated from. Never sent to the counterparty.
  sources           jsonb not null default '[]'::jsonb,
  documents         jsonb not null default '[]'::jsonb,
  videos            jsonb not null default '[]'::jsonb,
  -- Recorded but not surfaced in the room. Rep-only.
  library           jsonb not null default '[]'::jsonb,
  curated_video_ids jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists rooms_owner_idx on public.rooms (owner_id, updated_at desc);

-- One link per recipient, so a verdict can be attributed and a single
-- recipient's access revoked without breaking anyone else's.
create table if not exists public.share_links (
  token           text primary key default encode(gen_random_bytes(24), 'hex'),
  room_id         uuid not null references public.rooms(id) on delete cascade,
  recipient_name  text,
  recipient_email text,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  first_opened_at timestamptz,
  last_opened_at  timestamptz,
  open_count      integer not null default 0
);

create index if not exists share_links_room_idx on public.share_links (room_id, created_at desc);

-- One verdict per room. A recipient changing their mind updates in place.
create table if not exists public.feedback (
  room_id     uuid primary key references public.rooms(id) on delete cascade,
  share_token text references public.share_links(token) on delete set null,
  verdict     text not null check (verdict in ('holds', 'concerns')),
  message     text,
  by_name     text not null,
  at          timestamptz not null default now()
);

create table if not exists public.flags (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  share_token text references public.share_links(token) on delete set null,
  quote       text not null,
  note        text not null,
  by_name     text not null,
  resolved    boolean not null default false,
  at          timestamptz not null default now()
);

create index if not exists flags_room_idx on public.flags (room_id, at desc);

-- Asset bytes live in Storage; the thumbnail is a small data URI kept here so
-- a shared room renders its poster frames without touching Storage at all.
create table if not exists public.assets (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null,
  kind         text not null check (kind in ('image', 'video', 'document')),
  mime_type    text not null,
  size_bytes   bigint not null,
  storage_path text not null,
  thumbnail    text,
  origin       text not null check (origin in ('uploaded', 'generated')),
  prompt       text,
  created_at   timestamptz not null default now()
);

create index if not exists assets_owner_idx on public.assets (owner_id, created_at desc);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists rooms_touch on public.rooms;
create trigger rooms_touch before update on public.rooms
  for each row execute function public.touch_updated_at();

/* ------------------------------------------------------------------- RLS */

alter table public.rooms       enable row level security;
alter table public.share_links enable row level security;
alter table public.feedback    enable row level security;
alter table public.flags       enable row level security;
alter table public.assets      enable row level security;

-- Anonymous visitors get no direct table access whatsoever. Their only route
-- in is the security-definer functions below, each of which demands a live
-- token. This is what stops a share link from becoming a way to enumerate
-- every room in the database.
revoke all on public.rooms, public.share_links, public.feedback, public.flags, public.assets
  from anon;

-- Access is team-wide: any signed-in user can read and write any room.
-- That is deliberate, and it is safe only because sign-up is restricted to
-- 1Fort email addresses by the trigger at the foot of this file. If that
-- restriction is ever loosened, these policies must be tightened first.
--
-- Rooms outlive the rep who made them: nobody's deals or feedback get stranded
-- because they left or are on holiday. owner_id still records who created it.

drop policy if exists rooms_owner_all on public.rooms;
drop policy if exists rooms_team_all on public.rooms;
create policy rooms_team_all on public.rooms
  for all to authenticated using (true) with check (true);

drop policy if exists share_links_owner_all on public.share_links;
drop policy if exists share_links_team_all on public.share_links;
create policy share_links_team_all on public.share_links
  for all to authenticated using (true) with check (true);

drop policy if exists feedback_owner_all on public.feedback;
drop policy if exists feedback_team_all on public.feedback;
create policy feedback_team_all on public.feedback
  for all to authenticated using (true) with check (true);

drop policy if exists flags_owner_all on public.flags;
drop policy if exists flags_team_all on public.flags;
create policy flags_team_all on public.flags
  for all to authenticated using (true) with check (true);

-- The asset library is shared across rooms, so it is shared across people too.
drop policy if exists assets_owner_all on public.assets;
drop policy if exists assets_team_all on public.assets;
create policy assets_team_all on public.assets
  for all to authenticated using (true) with check (true);

-- Existing installs: switch owner_id to a default so an edit by a colleague
-- doesn't rewrite who created the room.
alter table public.rooms  alter column owner_id set default auth.uid();
alter table public.assets alter column owner_id set default auth.uid();

/* ------------------------------------------------- the anonymous share path */

-- Resolves a token to a live link, or null. Every anon entry point starts here.
create or replace function public.resolve_share(p_token text)
returns public.share_links
language sql stable security definer set search_path = public as $$
  select * from public.share_links
   where token = p_token
     and revoked_at is null
     and (expires_at is null or expires_at > now())
   limit 1;
$$;

-- The counterparty's view of a room.
--
-- Returns only what they are meant to see. `name`, `sources`, `library` and
-- every other room's data stay behind: this function is the boundary, not the
-- client. Their own flags come back so their page reflects what they said;
-- other recipients' flags do not.
create or replace function public.get_shared_room(p_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_link public.share_links;
  v_room public.rooms;
  v_asset_ids text[];
begin
  v_link := public.resolve_share(p_token);
  if v_link.token is null then return null; end if;

  select * into v_room from public.rooms
   where id = v_link.room_id and status = 'live';
  if not found then return null; end if;

  update public.share_links
     set open_count      = open_count + 1,
         last_opened_at  = now(),
         first_opened_at = coalesce(first_opened_at, now())
   where token = p_token;

  -- Only the assets this room actually references are exposed.
  select array_agg(distinct x) into v_asset_ids from (
    select jsonb_array_elements(v_room.documents) ->> 'assetId' as x
    union all
    select jsonb_array_elements(v_room.videos) ->> 'posterAssetId'
  ) s where x is not null;

  return jsonb_build_object(
    'roomId',          v_room.id,
    'kind',            v_room.kind,
    'mode',            v_room.room_mode,
    'account',         v_room.account,
    'content',         v_room.content,
    'documents',       v_room.documents,
    'videos',          v_room.videos,
    'curatedVideoIds', v_room.curated_video_ids,
    'recipientName',   v_link.recipient_name,
    'feedback', (
      select jsonb_build_object('verdict', f.verdict, 'message', f.message,
                                'by', f.by_name, 'at', f.at)
        from public.feedback f where f.room_id = v_room.id
    ),
    'flags', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', fl.id, 'quote', fl.quote, 'note', fl.note,
               'by', fl.by_name, 'at', fl.at, 'resolved', fl.resolved)), '[]'::jsonb)
        from public.flags fl
       where fl.room_id = v_room.id and fl.share_token = p_token
    ),
    'assets', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', a.id, 'name', a.name, 'kind', a.kind, 'thumbnail', a.thumbnail)), '[]'::jsonb)
        from public.assets a
       where a.id::text = any(v_asset_ids)
    )
  );
end;
$$;

create or replace function public.submit_shared_feedback(
  p_token text, p_verdict text, p_message text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_link public.share_links;
begin
  v_link := public.resolve_share(p_token);
  if v_link.token is null then raise exception 'invalid or expired link'; end if;
  if p_verdict not in ('holds', 'concerns') then raise exception 'bad verdict'; end if;

  insert into public.feedback (room_id, share_token, verdict, message, by_name, at)
  values (v_link.room_id, p_token, p_verdict, nullif(btrim(coalesce(p_message, '')), ''),
          coalesce(nullif(btrim(coalesce(v_link.recipient_name, '')), ''), 'The counterparty'), now())
  on conflict (room_id) do update
     set verdict = excluded.verdict, message = excluded.message,
         share_token = excluded.share_token, by_name = excluded.by_name, at = now();
end;
$$;

create or replace function public.withdraw_shared_feedback(p_token text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_link public.share_links;
begin
  v_link := public.resolve_share(p_token);
  if v_link.token is null then raise exception 'invalid or expired link'; end if;
  -- Scoped to this recipient so one person cannot erase another's answer.
  delete from public.feedback where room_id = v_link.room_id and share_token = p_token;
end;
$$;

create or replace function public.add_shared_flag(p_token text, p_quote text, p_note text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_link public.share_links; v_row public.flags;
begin
  v_link := public.resolve_share(p_token);
  if v_link.token is null then raise exception 'invalid or expired link'; end if;
  if btrim(coalesce(p_note, '')) = '' then raise exception 'note required'; end if;

  insert into public.flags (room_id, share_token, quote, note, by_name)
  values (v_link.room_id, p_token, left(btrim(p_quote), 240), btrim(p_note),
          coalesce(nullif(btrim(coalesce(v_link.recipient_name, '')), ''), 'The counterparty'))
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'quote', v_row.quote, 'note', v_row.note,
                            'by', v_row.by_name, 'at', v_row.at, 'resolved', v_row.resolved);
end;
$$;

-- These four are the entire anonymous surface area.
revoke all on function public.resolve_share(text) from anon, authenticated;
grant execute on function public.get_shared_room(text)          to anon, authenticated;
grant execute on function public.submit_shared_feedback(text, text, text) to anon, authenticated;
grant execute on function public.withdraw_shared_feedback(text) to anon, authenticated;
grant execute on function public.add_shared_flag(text, text, text) to anon, authenticated;

/* --------------------------------------------------------------- storage */

insert into storage.buckets (id, name, public)
values ('assets', 'assets', false)
on conflict (id) do nothing;

-- One shared library for the team, matching the room policies. The
-- counterparty never touches Storage: poster frames travel as the data URI
-- thumbnail on the asset row.
drop policy if exists assets_rw on storage.objects;
create policy assets_rw on storage.objects
  for all to authenticated
  using (bucket_id = 'assets') with check (bucket_id = 'assets');

/* ------------------------------------------------- who may create an account */

-- Sign-up is otherwise open to anyone who finds the URL. Row level security
-- means a stranger would see none of your rooms, but an open registration form
-- on a company tool holding prospect data is not acceptable on its own.
--
-- Enforced by a trigger rather than in the client, because the client can be
-- bypassed by calling the auth endpoint directly. Edit the domain list here.
create or replace function public.enforce_signup_domain()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is null
     or lower(split_part(new.email, '@', 2)) not in ('1fort.ai', '1fort.com') then
    raise exception 'Sign-up is limited to 1Fort email addresses.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_signup_domain on auth.users;
create trigger enforce_signup_domain
  before insert on auth.users
  for each row execute function public.enforce_signup_domain();

/* -------------------------------------------------- keep creator provenance */

-- The client sends owner_id on every save so it works under either policy
-- version. This stops that from rewriting who created a room when a colleague
-- edits it: on update, owner_id is always the value it already had.
create or replace function public.freeze_owner()
returns trigger
language plpgsql as $$
begin
  new.owner_id = old.owner_id;
  return new;
end;
$$;

drop trigger if exists rooms_freeze_owner on public.rooms;
create trigger rooms_freeze_owner before update on public.rooms
  for each row execute function public.freeze_owner();

drop trigger if exists assets_freeze_owner on public.assets;
create trigger assets_freeze_owner before update on public.assets
  for each row execute function public.freeze_owner();

/* ------------------------------------------------------ pre-call one-pagers */

-- A room is either about a specific account or about the archetype we're built
-- for. The archetype version carries no numbers of theirs and can be sent
-- before discovery. Defaulting to 'specific' keeps existing rows correct.
--
-- Named room_mode, not mode: `mode` is an ordered-set aggregate in Postgres,
-- and a column called that makes PostgREST fail with "WITHIN GROUP is required
-- for ordered-set aggregate mode".
do $$
begin
  if exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'rooms' and column_name = 'mode')
     and not exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'rooms' and column_name = 'room_mode')
  then
    alter table public.rooms rename column mode to room_mode;
  end if;
end $$;

alter table public.rooms
  add column if not exists room_mode text not null default 'specific';

alter table public.rooms drop constraint if exists rooms_room_mode_check;
alter table public.rooms
  add constraint rooms_room_mode_check check (room_mode in ('specific', 'archetype'));
