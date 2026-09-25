# Despliegue — Hybrid Work Planner

Guía para instalar la aplicación desde cero. Todo se hace desde el navegador y es **gratis**.

**Requisitos:** una cuenta de Google (Gmail). Nada que instalar.

---

## Paso 1 · Base de datos (Supabase)

1. Entra a **supabase.com** → *Start your project* (puedes entrar con GitHub).
2. **New organization** → plan **Free**.
3. **New project**:
   - Name: `hybrid-work-planner`
   - Database password: *Generate a password* y guárdala.
   - Region: la más cercana (ej. *Americas*).
4. Cuando esté listo: **SQL Editor → New query** → pega todo `database/schema.sql` → **Run**.
   Debe decir *Success. No rows returned*.

> Las migraciones en `database/migrations/` son el historial de cómo evolucionó la base. **Para una instalación nueva usa solo `schema.sql`.**

---

## Paso 2 · Autenticación

En **Authentication → Sign In / Providers → Email**:
- ✅ *Allow new users to sign up* — encendido
- ❌ *Confirm email* — apagado

En **Authentication → URL Configuration**:
- **Site URL:** `https://TU-USUARIO.github.io/NOMBRE-REPO/`
- **Redirect URLs:** la misma dirección.

---

## Paso 3 · Conectar la app

En Supabase → **Project Settings → API Keys**, copia:
- **Project URL**
- **Publishable key** (`sb_publishable_…`). ⚠️ *Nunca* la *secret*.

Pégalos en `assets/js/config.js`:

```js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xxxx';
```

---

## Paso 4 · Login con Google (opcional, recomendado)

**En Google Cloud** (console.cloud.google.com):
1. Crear proyecto `Hybrid Work Planner`.
2. **Google Auth Platform → Información de la marca:** nombre de la app, correo de asistencia, página principal (URL de la app), dominio autorizado `TU-USUARIO.github.io`, correo del desarrollador. *No subir logo* (evita verificación).
3. **Público:** tipo *Externo* → **Publicar app** (queda *En producción*).
4. **Clientes → Crear cliente → Aplicación web:**
   - Orígenes JavaScript: `https://TU-USUARIO.github.io`
   - URI de redireccionamiento: `https://xxxx.supabase.co/auth/v1/callback`
5. Copiar **ID de cliente** y **Secreto**.

**En Supabase:** Authentication → Sign In / Providers → **Google** → Enable → pegar ID y secreto → **Save**.

---

## Paso 5 · Publicar en GitHub Pages

1. En **github.com** → **New repository** → nombre (ej. `calendario-equipo`) → **Public** → *Create*.
2. **Add file → Upload files** → arrastra **todo el contenido** de esta carpeta (`index.html`, `assets/`, etc.) → **Commit changes**.
3. **Settings → Pages** → *Deploy from a branch* → `main` / `(root)` → **Save**.
4. En 1–2 minutos: `https://TU-USUARIO.github.io/NOMBRE-REPO/`

---

## Paso 6 · Primer administrador

1. Entra a la app y crea tu cuenta (o *Continuar con Google*).
2. En Supabase → SQL Editor:

```sql
update public.people set is_admin = true where lower(email) = 'tu.correo@ejemplo.com';
```

3. Recarga la app: verás el ícono ⚙️ **Administrar equipo**.

---

## Actualizar la app

Edita los archivos y súbelos otra vez a GitHub (**Upload files** reemplaza los existentes). Recarga con **Ctrl + F5**.

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| Pantalla en blanco / 404 | Pages no activo o archivo mal nombrado | Revisar *Settings → Pages*; debe existir `index.html` en la raíz |
| "Modo de prueba (sin conexión)" | URL o clave incorrecta en `config.js` | Revisar Paso 3 |
| `redirect_uri_mismatch` al entrar con Google | URI mal escrita en Google Cloud | Revisar Paso 4.4 |
| No llega el correo de recuperación | Límite del correo integrado de Supabase | Usar Google o configurar SMTP propio |
| La app no carga después de días sin uso | Proyecto pausado (plan gratis) | Supabase → *Restore project* |
