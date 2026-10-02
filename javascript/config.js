/* =====================================================================
   Hybrid Work Planner — CONFIGURACIÓN
   Aquí se cambian la conexión a Supabase y las reglas del equipo.
   ===================================================================== */

/* ================= CONEXIÓN A SUPABASE ================= */
const SUPABASE_URL = 'https://qjlvhktczrirommwkrvl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2WyajIblkqPvY0g6wCqBlQ_ud4w1nfb';

/* ================= CONFIGURACIÓN ================= */
const AÑO_INICIO = 2026;                 // primer año del calendario
const AÑO_FIN = 2030;                    // último año (5 años)
const DIA_OBLIGATORIO = 2;               // 1=lunes, 2=martes ... 5=viernes
const MENSAJE_BLOQUEO = 'Los martes son presenciales obligatorios';
const REMOTO_POR_SEMANA = 2;             // máximo de días remotos por semana
const NOTAS_RAPIDAS = ['Trámite personal', 'Capacitación', 'Medio día', 'Reunión con cliente', 'Cita'];

// Roles, de mayor a menor. sinLimite: puede poner remotos sin tope semanal
// (el martes presencial aplica igual a todos). Cada persona elige su rol en su perfil.
const ROLES = [
  { id: 'socio',          label: 'Socio',          sinLimite: true },
  { id: 'director',       label: 'Director',       sinLimite: true },
  { id: 'gerente_senior', label: 'Gerente Senior', sinLimite: true },
  { id: 'gerente',        label: 'Gerente',        sinLimite: true },
  { id: 'supervisor',     label: 'Supervisor',     sinLimite: false },
  { id: 'staff',          label: 'Staff',          sinLimite: false },
  { id: 'asistente',      label: 'Asistente',      sinLimite: false }
];
const ROL_POR_DEFECTO = 'asistente';

// Solo para el modo local de prueba (sin Supabase)
const EQUIPO_DEMO = [
  { id: 'p1', name: 'Mileybis V.', username: 'mileybis', is_admin: true },
  { id: 'p2', name: 'Stefany B.', username: 'stefany' },
  { id: 'p3', name: 'Federico D.', username: 'federico', role: 'staff' },
  { id: 'p4', name: 'Gabriel H.', username: 'gabriel' },
  { id: 'p5', name: 'Ian T.', username: 'ian', role: 'gerente' }
];
