-- =====================================================================
--  Calendario de trabajo — permitir QUITAR personas desde la app
--  Supabase → SQL Editor → New query → pegar todo → Run
-- =====================================================================

-- 1) Si se quita a alguien, su historial se conserva (queda como "Alguien")
alter table public.activity drop constraint if exists activity_author_fkey;
alter table public.activity add constraint activity_author_fkey
  foreign key (author) references public.people(id) on delete set null;

alter table public.schedule drop constraint if exists schedule_updated_by_fkey;
alter table public.schedule add constraint schedule_updated_by_fkey
  foreign key (updated_by) references public.people(id) on delete set null;

-- 2) El administrador quita a una persona: borra su cuenta, su perfil y sus días
create or replace function public.remove_person(pid text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede quitar personas'; end if;
  if pid = public.my_person_id() then raise exception 'No puedes quitarte a ti mismo'; end if;

  select lower(email) into v_email from public.people where id = pid;
  delete from public.people where id = pid;                    -- sus días se borran solos
  if v_email is not null then
    delete from auth.users where lower(email) = v_email;       -- su cuenta de acceso
  end if;
end $$;

revoke all on function public.remove_person(text) from public;
grant execute on function public.remove_person(text) to authenticated;
