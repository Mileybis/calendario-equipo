# Hybrid Work Planner — contexto del proyecto

## Qué es
App web para que el equipo "Advisory · Tech Enablement" planifique días de oficina y
remoto. Interfaz y mensajes 100 % en español. Publicada en:
https://mileybis.github.io/calendario-equipo/ (GitHub Pages, rama main, raíz).

## Stack (sin Java ni Node, sin build)
- HTML + CSS + JavaScript vanilla (scripts clásicos, sin módulos ni frameworks).
- Supabase: PostgreSQL + Auth + Realtime, vía supabase-js v2 desde CDN (jsdelivr).
- Login con Google OAuth y usuario/correo + contraseña.
- Hosting: GitHub Pages. El usuario NO puede instalar nada en la PC del trabajo.

## Estructura
- index.html → estructura (login/gate, encabezado, vistas, diálogos)
- assets/css/styles.css → tokens de color claro/oscuro, componentes, responsive (≤700px móvil)
- assets/js/config.js → SUPABASE_URL, SUPABASE_KEY (publicable), AÑO_INICIO=2026,
  AÑO_FIN=2030, DIA_OBLIGATORIO=2 (martes), OFICINA_POR_SEMANA=3, REMOTO_POR_SEMANA=2,
  NOTAS_RAPIDAS, EQUIPO_DEMO (modo local)
- assets/js/data.js → FERIADOS {"AAAA-MM-DD": nombre} y QUINCENAS [[inicio, código]]
  (fuente: calendario1.xlsx; año fiscal oct–sep; códigos 201–262 aprox.)
- assets/js/app.js → lógica (orden de carga: config.js → data.js → app.js)
- assets/img/ → favicon.svg (calendario azul) y robot.webp (mascota del login)
- database/schema.sql → esquema completo desde cero; database/migrations/001–005 → historial
- docs/ → ARQUITECTURA.md, DESPLIEGUE.md, GUIA_DE_USO.md, adr/001–003

## Base de datos (Supabase, RLS activo)
- people(id, name, email, username, avatar_icon, avatar_color, sort, is_admin, approved, user_id)
- schedule(person_id, day, status in R/O/V/I, note ≤80, updated_by, updated_at) PK(person_id, day)
- activity(id, at, author, changes jsonb [{pid, date, from, to}])
- Funciones: is_member, my_person_id, is_admin, email_for_username, username_available,
  approve_person, reject_person, remove_person
- Trigger handle_new_user: toda cuenta nueva (correo o Google) se agrega sola a people,
  aprobada; con Google crea username desde el correo.
- RLS: cada quien edita solo su calendario y solo desde la semana actual (zona America/Panama);
  el admin edita todo. Perfil: solo name, username, avatar_icon, avatar_color.
- Realtime en schedule, activity y people.
- Plan gratis: pausa tras 7 días sin uso; correo integrado muy limitado (2/h y solo a miembros
  de la organización) → por eso el login principal es Google.

## Reglas de negocio
- Estados: R Remoto 🏠, O Oficina 🏢, V Vacaciones 🌴, I Incapacidad 🩺, N Sin definir (sin fila),
  F Feriado (de data.js, no editable).
- Martes = Oficina obligatorio (solo se permite V o I). Un martes feriado no bloquea.
- Máximo 2 remotos por semana. Solo los feriados reducen el cupo; V e I NO lo reducen.
  Ir más días a oficina siempre está permitido. Si se pasa, se bloquea con el mensaje
  "Pasaste tus días remotos".
- Los días no definidos se muestran vacíos ("＋ Definir"); no hay datos aleatorios.
- Edición: cambios pendientes (borde naranja) → botón "⬆ Subir" → upsert schedule + insert activity.

## Funcionalidades actuales
- Login: panel izquierdo azul con logo, etiqueta "ADVISORY · TECH ENABLEMENT", título y robot
  (en PC sin textos extra); formulario con "Continuar con Google", Iniciar sesión / Crear cuenta,
  "¿Olvidaste tu contraseña?" (resetPasswordForEmail + pantalla de nueva contraseña).
- Mi calendario: semana con navegación, resumen, próximo día presencial, mes completo.
- Equipo: selector Semana | Mes. Semana = tabla personas × días (en móvil solo íconos y
  primer nombre). Mes = grilla con 🏢/🏠/🌴 por día, barra de colores, leyenda; al tocar un
  día se muestra la lista de personas de ese día.
- Panel "Actualizaciones" (historial en vivo) y panel "Detalles" (semana o mes según la vista:
  año fiscal, quincena(s), días laborables, feriados; si la semana cambia de quincena, se
  muestran los tramos por separado).
- Perfil: nombre, usuario, avatar (10 colores o 30 animalitos), contraseña, cerrar sesión.
- Admin (⚙️): editar nombres/usuarios/avatares de todos, 🗑️ quitar personas.
- Modo claro/oscuro con botón 🌙/☀️. Sin Excel (se eliminó a propósito).

## Convenciones
- Todo texto visible en español, tono claro y profesional.
- Probar siempre en PC y en móvil (≈390px), en modo claro y oscuro.
- Nunca subir claves secretas (solo la publicable sb_publishable_…).
- Cambios de base de datos: nueva migración numerada en database/migrations/ y actualizar
  database/schema.sql para que siga sirviendo como instalación desde cero.
- Actualizar CHANGELOG.md y docs/ cuando cambie algo relevante.
- La página se publica desde main: al terminar, abrir un Pull Request hacia main.
