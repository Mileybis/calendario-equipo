// =====================================================================
//  Hybrid Work Planner — función "recordatorio" (Supabase Edge Function)
//  La llama una tarea programada de la base (pg_cron) cada viernes a las
//  10:00 a. m. de Panamá. Busca a quienes tienen "Recordatorio de los
//  viernes" encendido y todavía no definieron algún día de la próxima
//  semana, y les envía un correo con esos días.
//  No cuenta feriados (los lee de javascript/data.js publicado) ni el martes
//  (siempre es presencial). Cada persona recibe máximo un recordatorio por semana.
//  Envío: API de Brevo (mismos secrets que "notificar"):
//    BREVO_API_KEY     → clave de API de Brevo
//    CORREO_REMITENTE  → correo verificado en Brevo desde el que se envía
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const APP_URL = 'https://mileybis.github.io/calendario-equipo/';
const DIA_OBLIGATORIO = 2;    // martes: siempre presencial, no hay que definirlo
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const fecha = (d: Date) => `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;

// Feriados tal como los usa la app publicada
async function feriados(): Promise<Set<string>> {
  try {
    const js = await (await fetch(APP_URL + 'javascript/data.js')).text();
    const bloque = js.slice(js.indexOf('const FERIADOS'), js.indexOf('};', js.indexOf('const FERIADOS')));
    return new Set([...bloque.matchAll(/"(\d{4}-\d{2}-\d{2})"\s*:/g)].map(m => m[1]));
  } catch { return new Set(); }
}

Deno.serve(async req => {
  try {
    const apiKey = Deno.env.get('BREVO_API_KEY');
    const remitente = Deno.env.get('CORREO_REMITENTE');
    if (!apiKey || !remitente) return Response.json({ ok: false, error: 'Faltan los secrets BREVO_API_KEY o CORREO_REMITENTE' });
    // Para probar: {"solo": "<id de persona>"} limita el envío a esa persona
    const { solo } = await req.json().catch(() => ({})) as { solo?: string };

    // Lunes de la próxima semana según la fecha de Panamá (UTC-5, sin horario de verano)
    const hoy = new Date(Date.now() - 5 * 3600000);
    const base = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
    const lunes = new Date(base.getTime() + ((8 - base.getUTCDay()) % 7 || 7) * 86400000);
    const fer = await feriados();
    const dias = [0, 1, 2, 3, 4].map(i => new Date(lunes.getTime() + i * 86400000))
      .filter(d => d.getUTCDay() !== DIA_OBLIGATORIO && !fer.has(ymd(d)));
    if (!dias.length) return Response.json({ ok: true, semana: ymd(lunes), nota: 'semana sin días por definir' });

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let q = db.from('people').select('id, name, email, recordatorio_semana').eq('recordatorio', true).not('email', 'is', null);
    if (solo) q = q.eq('id', solo);
    const { data: people } = await q;
    const pendientes = (people ?? []).filter(p => p.recordatorio_semana !== ymd(lunes));
    if (!pendientes.length) return Response.json({ ok: true, semana: ymd(lunes), enviados: 0 });

    const { data: filas } = await db.from('schedule').select('person_id, day')
      .in('person_id', pendientes.map(p => p.id)).in('day', dias.map(ymd));
    const definidos = new Set((filas ?? []).map(f => `${f.person_id}|${f.day}`));

    const resultado: Record<string, unknown> = {};
    for (const p of pendientes) {
      const faltan = dias.filter(d => !definidos.has(`${p.id}|${ymd(d)}`));
      if (!faltan.length) continue;
      // Marcar la semana antes de enviar (si otra ejecución ya la marcó, no se repite)
      const { data: marcada } = await db.from('people').update({ recordatorio_semana: ymd(lunes) })
        .eq('id', p.id).or(`recordatorio_semana.is.null,recordatorio_semana.neq.${ymd(lunes)}`).select('id');
      if (!marcada?.length) continue;

      const nombre = String(p.name ?? '').split(' ')[0];
      const n = faltan.length;
      const lista = faltan.map(d => `<li style="padding:4px 0">${esc(fecha(d))}</li>`).join('');
      const html = `<div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;color:#1D2733">
        <h2 style="font-size:18px;margin:0 0 4px">Hola ${esc(nombre)}, te ${n === 1 ? 'falta 1 día' : `faltan ${n} días`} por definir</h2>
        <p style="color:#687383;font-size:13px;margin:0 0 14px">Semana del ${esc(fecha(lunes))}. Indica si vas a la oficina, trabajas remoto o tienes alguna ausencia:</p>
        <ul style="background:#F7F8FA;border-radius:10px;padding:12px 12px 12px 32px;margin:0">${lista}</ul>
        <p style="margin:18px 0"><a href="${APP_URL}" style="background:#3A4A96;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Abrir el calendario</a></p>
        <p style="color:#98A2AE;font-size:12px">Recibes este correo porque activaste "Recordatorio de los viernes" en tu perfil. Puedes apagarlo ahí mismo.</p>
      </div>`;
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: 'Hybrid Work Planner', email: remitente },
          to: [{ email: p.email, name: p.name }],
          subject: `Recordatorio: ${n === 1 ? '1 día' : `${n} días`} sin definir la próxima semana`,
          htmlContent: html
        })
      });
      resultado[p.name] = r.status;
    }
    return Response.json({ ok: true, semana: ymd(lunes), enviados: resultado });
  } catch (e) {
    return Response.json({ ok: false, error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
});
