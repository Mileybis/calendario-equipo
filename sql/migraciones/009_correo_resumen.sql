-- =====================================================================
--  Hybrid Work Planner — correo de resumen en vez de un correo por cambio
--  Supabase → SQL Editor → New query → pegar todo → Run
-- =====================================================================
--  Antes: cada actualización llamaba al instante a la función "notificar".
--  Ahora: una tarea programada (pg_cron) la llama cada 2 minutos; la función
--  junta los cambios de cada persona y envía UN resumen cuando esa persona
--  lleva 10 minutos sin subir más cambios.

drop trigger if exists activity_avisar on public.activity;
drop function if exists public.avisar_actualizacion();

create extension if not exists pg_cron;

select cron.unschedule('avisos-por-correo')
  where exists (select 1 from cron.job where jobname = 'avisos-por-correo');

select cron.schedule(
  'avisos-por-correo',
  '*/2 * * * *',
  $$ select net.http_post(
       url     := 'https://qjlvhktczrirommwkrvl.supabase.co/functions/v1/notificar',
       body    := '{}'::jsonb,
       headers := '{"Content-Type": "application/json"}'::jsonb
     ) $$
);
