-- =====================================================================
--  Calendario de trabajo — base de datos (Supabase)
--  Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run
-- =====================================================================

-- 1) EQUIPO: una fila por persona. El correo es el que usa para entrar.
create table if not exists public.people (
  id            text primary key,              -- p1, p2, p3...
  name          text not null,
  email         text unique,                   -- correo del trabajo (en minúsculas)
  avatar_icon   text not null default '',      -- '' = inicial, o un animalito 🐼
  avatar_color  int  not null default 0,
  sort          int  not null default 0
);

-- 2) CALENDARIO: una fila por persona y día (solo se guardan los días cambiados)
create table if not exists public.schedule (
  person_id   text not null references public.people(id) on delete cascade,
  day         date not null,
  status      text not null check (status in ('R','O','V','I')),  -- Remoto, Oficina, Vacaciones, Incapacidad
  note        text not null default '' check (char_length(note) <= 80),
  updated_by  text references public.people(id),
  updated_at  timestamptz not null default now(),
  primary key (person_id, day)
);

-- 3) ACTUALIZACIONES: historial de cambios subidos
create table if not exists public.activity (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  author   text references public.people(id),
  changes  jsonb not null
);
create index if not exists activity_at_idx on public.activity (at desc);

-- 4) ¿La persona que inició sesión está en el equipo?
create or replace function public.is_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.people
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- 5) SEGURIDAD: solo miembros del equipo pueden ver y cambiar datos
alter table public.people   enable row level security;
alter table public.schedule enable row level security;
alter table public.activity enable row level security;

drop policy if exists "equipo ve personas"        on public.people;
drop policy if exists "equipo edita personas"     on public.people;
drop policy if exists "equipo ve calendario"      on public.schedule;
drop policy if exists "equipo crea calendario"    on public.schedule;
drop policy if exists "equipo edita calendario"   on public.schedule;
drop policy if exists "equipo ve actualizaciones" on public.activity;
drop policy if exists "equipo crea actualizaciones" on public.activity;

create policy "equipo ve personas"    on public.people   for select to authenticated using (public.is_member());
create policy "equipo edita personas" on public.people   for update to authenticated using (public.is_member()) with check (public.is_member());

create policy "equipo ve calendario"    on public.schedule for select to authenticated using (public.is_member());
create policy "equipo crea calendario"  on public.schedule for insert to authenticated with check (public.is_member());
create policy "equipo edita calendario" on public.schedule for update to authenticated using (public.is_member()) with check (public.is_member());

create policy "equipo ve actualizaciones"   on public.activity for select to authenticated using (public.is_member());
create policy "equipo crea actualizaciones" on public.activity for insert to authenticated with check (public.is_member());

-- Los correos solo se cambian desde el panel de Supabase, no desde la app
revoke update on public.people from authenticated;
grant update (name, avatar_icon, avatar_color) on public.people to authenticated;

-- 6) CAMBIOS EN VIVO
alter publication supabase_realtime add table public.schedule;
alter publication supabase_realtime add table public.activity;
alter publication supabase_realtime add table public.people;

-- 7) EQUIPO INICIAL — CAMBIA LOS CORREOS por los reales antes de correr el script
insert into public.people (id, name, email, avatar_color, sort) values
  ('p1', 'Mileybis V.', 'cambiar1@empresa.com', 0, 1),
  ('p2', 'Stefany B.',  'cambiar2@empresa.com', 1, 2),
  ('p3', 'Federico D.', 'cambiar3@empresa.com', 2, 3),
  ('p4', 'Gabriel H.',  'cambiar4@empresa.com', 3, 4),
  ('p5', 'Ian T.',      'cambiar5@empresa.com', 4, 5)
on conflict (id) do nothing;
