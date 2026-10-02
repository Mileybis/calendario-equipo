-- =====================================================================
--  Hybrid Work Planner — roles del equipo
--  Supabase → SQL Editor → New query → pegar todo → Run
-- =====================================================================
--  Agrega el rol de cada persona. Gerente y superiores pueden poner días
--  remotos sin límite (la regla está en la app, javascript/config.js).
--  Todas las personas existentes empiezan como "asistente"; cada quien
--  cambia el suyo en su perfil. No borra ni modifica ningún otro dato.

alter table public.people add column if not exists role text not null default 'asistente';

alter table public.people drop constraint if exists people_role_check;
alter table public.people add constraint people_role_check
  check (role in ('socio','director','gerente_senior','gerente','supervisor','staff','asistente'));

-- Cada persona puede cambiar su propio rol (la política "cada quien edita su perfil"
-- ya limita la edición a la propia fila o a la administradora).
grant update (role) on public.people to authenticated;
