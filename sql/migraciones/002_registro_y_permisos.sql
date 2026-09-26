-- =====================================================================
--  Calendario de trabajo — ACTUALIZACIÓN (registro + permisos + limpieza)
--  Supabase → SQL Editor → New query → pegar TODO → Run
--  Córrelo UNA vez: al inicio borra los días y el historial de prueba.
-- =====================================================================

-- 0) LIMPIEZA: empezar en blanco
delete from public.activity;
delete from public.schedule;

-- 1) Nuevas columnas
alter table public.people add column if not exists username text;
alter table public.people add column if not exists is_admin boolean not null default false;
alter table public.people add column if not exists approved boolean not null default false;
alter table public.people add column if not exists user_id uuid unique references auth.users(id) on delete set null;
create unique index if not exists people_username_key on public.people (lower(username));

-- Quitar las personas de ejemplo (se registrarán ellas mismas)
delete from public.people where email like 'cambiar%@empresa.com';

-- Las personas que quedan se aprueban; la primera es el administrador
update public.people set approved = true;
update public.people set username = coalesce(username, 'admin'), is_admin = true where id = 'p1';
update public.people set username = coalesce(username, 'persona2') where id = 'p2';

-- 2) Funciones de ayuda
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

-- Entrar con usuario
create or replace function public.email_for_username(u text)
returns text language sql stable security definer set search_path = public as $$
  select email from public.people where lower(username) = lower(trim(u)) limit 1;
$$;
revoke all on function public.email_for_username(text) from public;
grant execute on function public.email_for_username(text) to anon, authenticated;

-- ¿Usuario disponible? (al crear cuenta)
create or replace function public.username_available(u text, mail text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.people
                     where lower(username) = lower(trim(u)) and lower(email) <> lower(trim(mail)));
$$;
revoke all on function public.username_available(text, text) from public;
grant execute on function public.username_available(text, text) to anon, authenticated;

-- 3) REGISTRO: al crear una cuenta, se agrega sola al equipo (pendiente de aprobación)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(new.email);
  v_name  text := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)), 30);
  v_user  text := lower(nullif(trim(new.raw_user_meta_data ->> 'username'), ''));
begin
  if v_user is not null and (v_user !~ '^[a-z0-9._-]{3,20}$'
     or exists (select 1 from public.people where lower(username) = v_user and lower(email) <> v_email)) then
    v_user := null;
  end if;

  if exists (select 1 from public.people where lower(email) = v_email) then
    update public.people
       set user_id = new.id,
           username = coalesce(v_user, username),
           name = coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), name)
     where lower(email) = v_email;
  else
    insert into public.people (id, name, email, username, approved, sort, avatar_color)
    values ('u_' || replace(new.id::text, '-', ''), v_name, v_email, v_user, false,
            (select coalesce(max(sort), 0) + 1 from public.people),
            (select count(*) from public.people) % 10);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) El administrador aprueba o rechaza solicitudes
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
revoke all on function public.approve_person(text) from public;
revoke all on function public.reject_person(text) from public;
grant execute on function public.approve_person(text) to authenticated;
grant execute on function public.reject_person(text) to authenticated;

-- 5) PERMISOS
-- Equipo: los aprobados ven a todos; quien espera aprobación solo se ve a sí mismo
drop policy if exists "equipo ve personas" on public.people;
create policy "equipo ve personas" on public.people for select to authenticated
  using (public.is_member() or lower(email) = lower(auth.jwt() ->> 'email'));

-- Perfil: cada quien edita el suyo; el admin edita todos
drop policy if exists "equipo edita personas" on public.people;
drop policy if exists "cada quien edita su perfil" on public.people;
create policy "cada quien edita su perfil" on public.people for update to authenticated
  using (public.is_admin() or id = public.my_person_id())
  with check (public.is_admin() or id = public.my_person_id());
revoke update on public.people from authenticated;
grant update (name, username, avatar_icon, avatar_color) on public.people to authenticated;

-- Calendario: cada quien cambia SOLO el suyo y desde esta semana; el admin, todo
drop policy if exists "equipo crea calendario"  on public.schedule;
drop policy if exists "equipo edita calendario" on public.schedule;
drop policy if exists "cada quien crea su calendario" on public.schedule;
drop policy if exists "cada quien edita su calendario" on public.schedule;
create policy "cada quien crea su calendario" on public.schedule for insert to authenticated
  with check (public.is_admin()
    or (person_id = public.my_person_id()
        and day >= date_trunc('week', (now() at time zone 'America/Panama'))::date));
create policy "cada quien edita su calendario" on public.schedule for update to authenticated
  using (public.is_admin() or person_id = public.my_person_id())
  with check (public.is_admin()
    or (person_id = public.my_person_id()
        and day >= date_trunc('week', (now() at time zone 'America/Panama'))::date));

-- Historial: cada quien firma sus propios cambios
drop policy if exists "equipo crea actualizaciones" on public.activity;
drop policy if exists "cada quien crea sus actualizaciones" on public.activity;
create policy "cada quien crea sus actualizaciones" on public.activity for insert to authenticated
  with check (author = public.my_person_id());

