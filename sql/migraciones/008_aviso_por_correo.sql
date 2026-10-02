-- =====================================================================
--  Hybrid Work Planner — aviso por correo de cada actualización
--  Supabase → SQL Editor → New query → pegar todo → Run
-- =====================================================================
--  Cada vez que alguien sube cambios (fila nueva en activity), la base
--  llama a la función "notificar" (funciones/notificar/index.ts), que envía
--  un correo a quienes activaron "Recibir correos de actualizaciones".
--  Las actualizaciones que ya existían se marcan como avisadas para que
--  no se envíen correos viejos.

alter table public.activity add column if not exists notificado boolean not null default false;
update public.activity set notificado = true where not notificado;

create extension if not exists pg_net with schema extensions;

create or replace function public.avisar_actualizacion()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := 'https://qjlvhktczrirommwkrvl.supabase.co/functions/v1/notificar',
    body    := jsonb_build_object('id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
end $$;
revoke execute on function public.avisar_actualizacion() from public, anon, authenticated;

drop trigger if exists activity_avisar on public.activity;
create trigger activity_avisar after insert on public.activity
  for each row execute function public.avisar_actualizacion();
