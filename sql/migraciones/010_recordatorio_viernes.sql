-- =====================================================================
--  Hybrid Work Planner — recordatorio de los viernes
--  Supabase → SQL Editor → New query → pegar todo → Run
-- =====================================================================
--  Cada viernes a las 10:00 a. m. (hora de Panamá) la función "recordatorio"
--  envía un correo a quien todavía tenga días sin definir la próxima semana.
--  1) recordatorio: si la persona quiere ese correo. Empieza encendido;
--     cada quien lo puede apagar en su perfil.
--  2) recordatorio_semana: lunes de la última semana recordada, para no
--     enviar el mismo recordatorio dos veces.
--  No borra ni modifica ningún otro dato.

alter table public.people add column if not exists recordatorio boolean not null default true;
alter table public.people add column if not exists recordatorio_semana date;

-- Cada persona puede encender o apagar su recordatorio desde el perfil
grant update (recordatorio) on public.people to authenticated;

-- Viernes 15:00 UTC = 10:00 a. m. en Panamá
select cron.unschedule('recordatorio-viernes')
  where exists (select 1 from cron.job where jobname = 'recordatorio-viernes');

select cron.schedule(
  'recordatorio-viernes',
  '0 15 * * 5',
  $$ select net.http_post(
       url     := 'https://qjlvhktczrirommwkrvl.supabase.co/functions/v1/recordatorio',
       body    := '{}'::jsonb,
       headers := '{"Content-Type": "application/json"}'::jsonb
     ) $$
);
