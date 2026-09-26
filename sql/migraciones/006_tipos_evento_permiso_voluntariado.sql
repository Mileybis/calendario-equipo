-- =====================================================================
--  Hybrid Work Planner — tipos de día nuevos: Evento, Permiso, Voluntariado
--  Supabase → SQL Editor → New query → pegar todo → Run
-- =====================================================================
--  Solo amplía la lista de estados permitidos. No cambia ni borra datos:
--  todos los días guardados (R, O, V, I) siguen siendo válidos.
--    E  = Evento
--    P  = Permiso
--    VL = Voluntariado

alter table public.schedule drop constraint if exists schedule_status_check;
alter table public.schedule add constraint schedule_status_check
  check (status in ('R','O','V','I','E','P','VL'));
