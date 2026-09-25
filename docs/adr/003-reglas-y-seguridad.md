# ADR-003 · Reglas en el cliente + seguridad en la base de datos (RLS)

**Estado:** Aceptada · **Fecha:** 2026-09

## Contexto
Las reglas de trabajo híbrido deben dar retroalimentación inmediata al usuario, pero los permisos no pueden depender solo del navegador.

## Decisión
- **Reglas de experiencia** (martes presencial, máximo 2 remotos, feriados) → en el cliente, con mensajes inmediatos.
- **Reglas de permisos** (cada quien edita solo lo suyo, solo desde la semana actual, acciones de admin) → también en PostgreSQL con **Row Level Security** y funciones `security definer`.

## Consecuencias
- ✅ UX inmediata y datos protegidos aunque alguien manipule el navegador.
- ⚠️ La regla de remotos no se valida en la base; un usuario técnico podría saltarla, pero solo sobre su propio calendario.
