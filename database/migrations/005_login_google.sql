-- =====================================================================
--  Hybrid Work Planner — soporte para "Continuar con Google"
--  Supabase → SQL Editor → New query → pegar todo → Run
-- =====================================================================
--  Con Google no se escribe usuario, así que se crea uno solo con la
--  primera parte del correo (ej. stefanybejarano107@gmail.com → stefanybejarano107).

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
  -- Usuario escrito en el registro (si es válido y está libre)
  if v_user is not null and (v_user !~ '^[a-z0-9._-]{3,20}$'
     or exists (select 1 from public.people where lower(username) = v_user and lower(email) <> v_email)) then
    v_user := null;
  end if;

  -- Si no hay usuario (ej. entró con Google): usar la parte antes de la @
  if v_user is null then
    v_base := left(regexp_replace(split_part(v_email, '@', 1), '[^a-z0-9._-]', '', 'g'), 17);
    if length(v_base) < 3 then v_base := v_base || 'usr'; end if;
    v_user := v_base;
    while exists (select 1 from public.people where lower(username) = v_user and lower(email) <> v_email) loop
      n := n + 1; v_user := v_base || n;
    end loop;
  end if;

  if exists (select 1 from public.people where lower(email) = v_email) then
    update public.people
       set user_id = new.id,
           approved = true,
           username = coalesce(username, v_user)
     where lower(email) = v_email;
  else
    insert into public.people (id, name, email, username, approved, sort, avatar_color)
    values ('u_' || replace(new.id::text, '-', ''), v_name, v_email, v_user, true,
            (select coalesce(max(sort), 0) + 1 from public.people),
            (select count(*) from public.people) % 10);
  end if;
  return new;
end $$;
