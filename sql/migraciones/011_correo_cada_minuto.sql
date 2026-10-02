-- =====================================================================
--  Hybrid Work Planner — revisar los correos pendientes cada minuto
--  Supabase → SQL Editor → New query → pegar todo → Run
-- =====================================================================
--  La función "notificar" envía el resumen cuando la persona lleva 3 minutos
--  sin subir más cambios. Revisando cada minuto (antes cada 2), el correo
--  llega entre 3 y 4 minutos después del último cambio.

select cron.alter_job(
  (select jobid from cron.job where jobname = 'avisos-por-correo'),
  schedule := '* * * * *'
);
