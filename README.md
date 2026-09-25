# Hybrid Work Planner

Aplicación web para planificar los días de **oficina** y **trabajo remoto** del equipo. Cada persona define su semana, el equipo ve los cambios en tiempo real y las reglas de trabajo híbrido se aplican automáticamente.

🔗 **Demo en vivo:** https://mileybis.github.io/calendario-equipo/

---

## ✨ Funcionalidades

| Módulo | Qué hace |
|---|---|
| **Acceso** | Inicio de sesión con **Google**, o con usuario/correo + contraseña. Registro propio y recuperación de contraseña por correo. |
| **Mi calendario** | Vista personal de la semana y del mes, resumen de días y próximo día presencial. |
| **Equipo** | Vista **Semana** (personas × días) y vista **Mes** (resumen diario con detalle al tocar un día). |
| **Edición** | Estados: 🏠 Remoto, 🏢 Oficina, 🌴 Vacaciones, 🩺 Incapacidad, con nota opcional. Los cambios se preparan y se **suben** juntos. |
| **Reglas** | Martes presencial obligatorio · máximo 2 días remotos por semana · solo se edita desde la semana actual en adelante. |
| **Calendario corporativo** | Feriados de Panamá, quincenas y año fiscal (octubre–septiembre), de 2026 a 2030. |
| **Actualizaciones** | Historial en vivo de quién cambió qué y cuándo. |
| **Perfil** | Cada persona edita su nombre, usuario, avatar (color o animalito) y contraseña. |
| **Administración** | El administrador edita nombres/avatares de todos y puede quitar personas. |
| **Experiencia** | Diseño responsive (PC y celular) y modo claro/oscuro. |

---

## 🧱 Tecnologías

| Capa | Tecnología | Por qué |
|---|---|---|
| Interfaz | **HTML5, CSS3 y JavaScript** (sin frameworks) | Liviano, sin compilación, fácil de mantener |
| Base de datos y autenticación | **Supabase** (PostgreSQL + Auth + Realtime) | Base de datos real, login y cambios en vivo, plan gratuito |
| Login social | **Google OAuth 2.0** | Acceso con un clic, sin contraseñas |
| Hosting | **GitHub Pages** | Gratis, HTTPS, sin servidor propio |

> **No usa Java ni Node.js.** No hay que instalar nada: es un sitio estático que se conecta directamente a Supabase desde el navegador.

---

## 📁 Estructura del proyecto

```
hybrid-work-planner/
├── index.html                 # Página principal (estructura HTML)
├── assets/
│   ├── css/
│   │   └── styles.css         # Estilos, temas claro/oscuro y responsive
│   ├── js/
│   │   ├── config.js          # ⚙️ Conexión a Supabase y reglas del equipo
│   │   ├── data.js            # Feriados y quincenas (2026–2030)
│   │   └── app.js             # Lógica de la aplicación
│   └── img/
│       ├── favicon.svg        # Ícono de la pestaña
│       └── robot.webp         # Mascota del equipo (pantalla de acceso)
├── database/
│   ├── schema.sql             # Esquema completo para instalar desde cero
│   └── migrations/            # Historial de cambios aplicados a la base
│       ├── 001_esquema_inicial.sql
│       ├── 002_registro_y_permisos.sql
│       ├── 003_quitar_personas.sql
│       ├── 004_sin_aprobacion.sql
│       └── 005_login_google.sql
└── docs/
    ├── ARQUITECTURA.md        # Cómo está construida (diagramas, datos, seguridad)
    ├── DESPLIEGUE.md          # Cómo instalarla y publicarla paso a paso
    ├── GUIA_DE_USO.md         # Manual para el equipo
    └── adr/                   # Decisiones de arquitectura (ADR)
```

---

## 🚀 Inicio rápido

**Probar en tu computadora:** abre `index.html` en el navegador. Si no hay conexión a Supabase, arranca en **modo de prueba** con datos de ejemplo.

**Publicar:** sigue [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md). En resumen:
1. Crear proyecto en Supabase y ejecutar `database/schema.sql`.
2. Poner URL y clave pública en `assets/js/config.js`.
3. (Opcional) Configurar Google OAuth.
4. Subir la carpeta a un repositorio de GitHub y activar **GitHub Pages**.

---

## ⚙️ Configuración

Todo lo configurable está en **`assets/js/config.js`**:

| Constante | Valor actual | Qué controla |
|---|---|---|
| `SUPABASE_URL` / `SUPABASE_KEY` | Proyecto del equipo | Conexión a la base de datos (clave pública) |
| `AÑO_INICIO` / `AÑO_FIN` | 2026 / 2030 | Rango de años navegables |
| `DIA_OBLIGATORIO` | 2 (martes) | Día presencial obligatorio |
| `REMOTO_POR_SEMANA` | 2 | Máximo de días remotos por semana |
| `NOTAS_RAPIDAS` | Lista | Sugerencias de notas en el editor |

---

## 🔒 Seguridad

- La **clave pública** de Supabase (`sb_publishable_…`) está diseñada para usarse en el navegador.
- Los datos están protegidos con **Row Level Security** en la base de datos: solo usuarios autenticados del equipo pueden leer; cada persona solo modifica su propio calendario.
- Nunca subir la clave **secret / service_role** al repositorio.

---

## 📄 Documentación

| Documento | Para quién |
|---|---|
| [Guía de uso](docs/GUIA_DE_USO.md) | Todo el equipo |
| [Despliegue](docs/DESPLIEGUE.md) | Quien instale o mantenga la app |
| [Arquitectura](docs/ARQUITECTURA.md) | Perfil técnico |
| [Decisiones (ADR)](docs/adr/) | Perfil técnico |

