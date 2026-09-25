-- =====================================================================
--  Hybrid Work Planner — las cuentas nuevas entran DIRECTO (sin aprobación)
--  Supabase → SQL Editor → New query → pegar todo → Run
-- =====================================================================

-- 1) Quien ya estaba esperando aprobación, queda aprobado
update public.people set approved = true where approved = false;

-- 2) De ahora en adelante, toda cuenta nueva queda aprobada al registrarse
alter table public.people alter column approved set default true;

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
           approved = true,
           username = coalesce(v_user, username),
           name = coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), name)
     where lower(email) = v_email;
  else
    insert into public.people (id, name, email, username, approved, sort, avatar_color)
    values ('u_' || replace(new.id::text, '-', ''), v_name, v_email, v_user, true,
            (select coalesce(max(sort), 0) + 1 from public.people),
            (select count(*) from public.people) % 10);
  end if;
  return new;
end $$;
