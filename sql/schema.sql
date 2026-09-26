-- =====================================================================
--  Hybrid Work Planner — ESQUEMA COMPLETO (instalación desde cero)
--  Control de días de oficina, trabajo remoto y eventos del equipo
--
--  Uso: Supabase → SQL Editor → New query → pegar todo → Run
--  Equivale a aplicar las migraciones 001 a 005 en orden, sin datos de prueba.
--  Después de registrarte en la app, ejecuta el paso final (al pie) para
--  convertirte en administrador.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

-- Personas del equipo (una fila por persona)
create table if not exists public.people (
  id            text primary key,                 -- p1, p2... o u_<uuid> si se registró sola
  name          text not null,
  email         text unique,                      -- correo con el que inicia sesión
  username      text,                             -- para entrar sin escribir el correo
  avatar_icon   text not null default '',         -- '' = inicial; o un animalito
  avatar_color  int  not null default 0,
  sort          int  not null default 0,
  is_admin      boolean not null default false,
  approved      boolean not null default true,
  user_id       uuid unique references auth.users(id) on delete set null
);
create unique index if not exists people_username_key on public.people (lower(username));

-- Calendario: solo se guardan los días definidos (persona + día)
create table if not exists public.schedule (
  person_id   text not null references public.people(id) on delete cascade,
  day         date not null,
  status      text not null check (status in ('R','O','V','I')),  -- Remoto, Oficina, Vacaciones, Incapacidad
  note        text not null default '' check (char_length(note) <= 80),
  updated_by  text references public.people(id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (person_id, day)
);

-- Historial de cambios subidos (panel de actualizaciones)
create table if not exists public.activity (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  author   text references public.people(id) on delete set null,
  changes  jsonb not null
);
create index if not exists activity_at_idx on public.activity (at desc);


-- ---------------------------------------------------------------------
-- 2. FUNCIONES DE AYUDA (security definer = se ejecutan con permisos del dueño)
-- ---------------------------------------------------------------------

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.people
                 where lower(email) = lower(auth.jwt() ->> 'email') and approved);
$$;

create or replace function public.my_person_id()
returns text language sql stable security definer set search_path = public as $$
  select id from public.people
  where lower(email) = lower(auth.jwt() ->> 'email') and approved limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.people
                   where lower(email) = lower(auth.jwt() ->> 'email') and approved limit 1), false);
$$;

-- Login con usuario: devuelve el correo asociado
create or replace function public.email_for_username(u text)
returns text language sql stable security definer set search_path = public as $$
  select email from public.people where lower(username) = lower(trim(u)) limit 1;
$$;

-- Registro: ¿el usuario está libre?
create or replace function public.username_available(u text, mail text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.people
                     where lower(username) = lower(trim(u)) and lower(email) <> lower(trim(mail)));
$$;

-- Administración
create or replace function public.approve_person(pid text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede aprobar'; end if;
  update public.people set approved = true where id = pid;
end $$;

create or replace function public.reject_person(pid text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede rechazar'; end if;
  delete from public.people where id = pid and not approved;
end $$;

create or replace function public.remove_person(pid text)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede quitar personas'; end if;
  if pid = public.my_person_id() then raise exception 'No puedes quitarte a ti mismo'; end if;
  select lower(email) into v_email from public.people where id = pid;
  delete from public.people where id = pid;
  if v_email is not null then
    delete from auth.users where lower(email) = v_email;
  end if;
end $$;

-- Permisos de ejecución
revoke all on function public.email_for_username(text)        from public;
revoke all on function public.username_available(text, text)  from public;
revoke all on function public.approve_person(text)            from public;
revoke all on function public.reject_person(text)             from public;
revoke all on function public.remove_person(text)             from public;
grant execute on function public.email_for_username(text)       to anon, authenticated;
grant execute on function public.username_available(text, text) to anon, authenticated;
grant execute on function public.approve_person(text)           to authenticated;
grant execute on function public.reject_person(text)            to authenticated;
grant execute on function public.remove_person(text)            to authenticated;


-- ---------------------------------------------------------------------
-- 3. REGISTRO AUTOMÁTICO: toda cuenta nueva (correo o Google) entra al equipo
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(new.email);
  v_meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name  text := left(coalesce(nullif(trim(v_meta ->> 'name'), ''),
                                nullif(trim(v_meta ->> 'full_name'), ''),
                                split_part(new.email, '@', 1)), 30);
  v_user  text := lower(nullif(trim(v_meta ->> 'username'), ''));
  v_base  text;
  n       int := 1;
begin
  if v_user is not null and (v_user !~ '^[a-z0-9._-]{3,20}$'
     or exists (select 1 from public.people where lower(username) = v_user and lower(email) <> v_email)) then
    v_user := null;
  end if;

  if v_user is null then                       -- ej. entró con Google
    v_base := left(regexp_replace(split_part(v_email, '@', 1), '[^a-z0-9._-]', '', 'g'), 17);
    if length(v_base) < 3 then v_base := v_base || 'usr'; end if;
    v_user := v_base;
    while exists (select 1 from public.people where lower(username) = v_user and lower(email) <> v_email) loop
      n := n + 1; v_user := v_base || n;
    end loop;
  end if;

  if exists (select 1 from public.people where lower(email) = v_email) then
    update public.people
       set user_id = new.id, approved = true, username = coalesce(username, v_user)
     where lower(email) = v_email;
  else
    insert into public.people (id, name, email, username, approved, sort, avatar_color)
    values ('u_' || replace(new.id::text, '-', ''), v_name, v_email, v_user, true,
            (select coalesce(max(sort), 0) + 1 from public.people),
            (select count(*) from public.people) % 10);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 4. SEGURIDAD (Row Level Security)
-- ---------------------------------------------------------------------

alter table public.people   enable row level security;
alter table public.schedule enable row level security;
alter table public.activity enable row level security;

-- Personas: los miembros ven a todos; cada quien se ve a sí mismo
drop policy if exists "equipo ve personas" on public.people;
create policy "equipo ve personas" on public.people for select to authenticated
  using (public.is_member() or lower(email) = lower(auth.jwt() ->> 'email'));

-- Perfil: cada quien edita el suyo; el admin edita todos (solo columnas permitidas)
drop policy if exists "cada quien edita su perfil" on public.people;
create policy "cada quien edita su perfil" on public.people for update to authenticated
  using (public.is_admin() or id = public.my_person_id())
  with check (public.is_admin() or id = public.my_person_id());
revoke update on public.people from authenticated;
grant update (name, username, avatar_icon, avatar_color) on public.people to authenticated;

-- Calendario: todos lo ven; cada quien cambia solo el suyo desde esta semana; el admin, todo
drop policy if exists "equipo ve calendario" on public.schedule;
drop policy if exists "cada quien crea su calendario" on public.schedule;
drop policy if exists "cada quien edita su calendario" on public.schedule;
create policy "equipo ve calendario" on public.schedule for select to authenticated
  using (public.is_member());
create policy "cada quien crea su calendario" on public.schedule for insert to authenticated
  with check (public.is_admin()
    or (person_id = public.my_person_id()
        and day >= date_trunc('week', (now() at time zone 'America/Panama'))::date));
create policy "cada quien edita su calendario" on public.schedule for update to authenticated
  using (public.is_admin() or person_id = public.my_person_id())
  with check (public.is_admin()
    or (person_id = public.my_person_id()
        and day >= date_trunc('week', (now() at time zone 'America/Panama'))::date));

-- Historial: todos lo ven; cada quien firma sus propios cambios
drop policy if exists "equipo ve actualizaciones" on public.activity;
drop policy if exists "cada quien crea sus actualizaciones" on public.activity;
create policy "equipo ve actualizaciones" on public.activity for select to authenticated
  using (public.is_member());
create policy "cada quien crea sus actualizaciones" on public.activity for insert to authenticated
  with check (author = public.my_person_id());


-- ---------------------------------------------------------------------
-- 5. CAMBIOS EN TIEMPO REAL
-- ---------------------------------------------------------------------
-- (Si alguna tabla ya está en la publicación, esa línea dará aviso: se puede ignorar.)
alter publication supabase_realtime add table public.schedule;
alter publication supabase_realtime add table public.activity;
alter publication supabase_realtime add table public.people;


-- ---------------------------------------------------------------------
-- 6. PASO FINAL (ejecutar aparte, después de registrarte en la app)
-- ---------------------------------------------------------------------
-- update public.people set is_admin = true where lower(email) = 'tu.correo@ejemplo.com';
