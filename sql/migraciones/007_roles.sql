-- =====================================================================
--  Hybrid Work Planner — roles del equipo y aviso por correo
--  Supabase → SQL Editor → New query → pegar todo → Run
-- =====================================================================
--  1) Rol de cada persona. Gerente y superiores pueden poner días remotos
--     sin límite (la regla está en la app, javascript/config.js).
--     Todas las personas existentes empiezan como "asistente".
--  2) notificar_correo: si la persona quiere recibir un correo con cada
--     actualización del equipo. Empieza apagado para todos.
--  No borra ni modifica ningún otro dato.

alter table public.people add column if not exists role text not null default 'asistente';
alter table public.people drop constraint if exists people_role_check;
alter table public.people add constraint people_role_check
  check (role in ('socio','director','gerente_senior','gerente','supervisor','staff','asistente'));

alter table public.people add column if not exists notificar_correo boolean not null default false;

-- Cada persona puede cambiar su rol y su preferencia de correo (la política
-- "cada quien edita su perfil" ya limita la edición a la propia fila o a la administradora).
grant update (role, notificar_correo) on public.people to authenticated;
