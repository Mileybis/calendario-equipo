# ADR-002 · Inicio de sesión con Google como método principal

**Estado:** Aceptada · **Fecha:** 2026-09

## Contexto
Se probaron enlaces mágicos por correo y usuario/contraseña. El correo integrado de Supabase solo envía 2 mensajes por hora y solo a miembros de la organización, lo que bloquea verificaciones y recuperación de contraseña para el resto del equipo.

## Decisión
- Método principal: **Google OAuth** (sin contraseñas ni correos).
- Método alternativo: usuario o correo + contraseña, con registro propio.
- Las cuentas nuevas se agregan solas al equipo (trigger `handle_new_user`) y entran sin aprobación.

## Consecuencias
- ✅ Acceso con un clic y sin dependencia del correo de Supabase.
- ⚠️ Cualquiera con el enlace puede registrarse; el administrador puede quitar personas.
- ⚠️ Solo funciona con cuentas de Google; el resto usa contraseña.
