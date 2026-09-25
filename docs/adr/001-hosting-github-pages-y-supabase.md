# ADR-001 · Hosting en GitHub Pages + Supabase (en lugar de SharePoint)

**Estado:** Aceptada · **Fecha:** 2026-09

## Contexto
El equipo quería la app dentro de SharePoint. Sin embargo, SharePoint no ejecuta HTML/JavaScript propio, una solución SPFx requiere herramientas instaladas y aprobación de TI, y no se puede instalar software en los equipos de la empresa.

## Opciones evaluadas
| Opción | Mantiene la interfaz | Instalar | Admin TI | Costo |
|---|---|---|---|---|
| SharePoint + Power Apps | No | No | No | $0 |
| SharePoint SPFx | Sí | Sí | Sí | $0 |
| Artefacto en Claude | Sí | No | No | Requiere cuentas Claude |
| **GitHub Pages + Supabase** | **Sí** | **No** | **No** | **$0** |

## Decisión
Sitio estático en **GitHub Pages** con **Supabase** (PostgreSQL, Auth y Realtime) como backend.

## Consecuencias
- ✅ Sin servidor, sin instalación, sin costo; cambios en vivo.
- ⚠️ Los datos viven fuera de Microsoft 365.
- ⚠️ Plan gratuito: pausa tras 7 días sin uso y correo integrado limitado.
