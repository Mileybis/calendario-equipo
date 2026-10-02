// =====================================================================
//  Hybrid Work Planner — función "notificar" (Supabase Edge Function)
//  Envía UN correo de resumen por persona que actualizó su calendario.
//  La llama una tarea programada de la base (pg_cron) cada minuto: junta
//  las actualizaciones aún no avisadas de cada persona y, cuando esa persona
//  lleva ESPERA_MIN minutos sin subir más cambios, envía el resumen a
//  quienes activaron "Recibir correos de actualizaciones" (no al autor).
//  Envío: API de Brevo. Secrets necesarios en Supabase:
//    BREVO_API_KEY     → clave de API de Brevo
//    CORREO_REMITENTE  → correo verificado en Brevo desde el que se envía
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const ESPERA_MIN = 3;    // minutos sin cambios antes de enviar el resumen
const APP_URL = 'https://mileybis.github.io/calendario-equipo/';
const ESTADOS: Record<string, string> = {
  R: 'Remoto', O: 'Oficina', V: 'Vacaciones', I: 'Incapacidad',
  E: 'Evento', P: 'Permiso', VL: 'Voluntariado', N: 'Sin definir'
};
const COLORES: Record<string, string> = {
  R: '#2E6A55', O: '#3A4A96', V: '#8A5A1E', I: '#9A3B4A', E: '#5E3E96', P: '#1F6573', VL: '#A2461E', N: '#687383'
};
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
const fecha = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MESES[m - 1]}`;
};
const codigo = (e?: { s?: string }) => (e?.s && ESTADOS[e.s]) ? e.s : 'N';

type Estado = { s?: string; note?: string };
type Cambio = { pid: string | null; date: string; from?: Estado; to?: Estado };
type Act = { id: number; author: string | null; at: string; changes: Cambio[] };

Deno.serve(async () => {
  try {
    const apiKey = Deno.env.get('BREVO_API_KEY');
    const remitente = Deno.env.get('CORREO_REMITENTE');
    if (!apiKey || !remitente) return Response.json({ ok: false, error: 'Faltan los secrets BREVO_API_KEY o CORREO_REMITENTE' });

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: pendientes } = await db.from('activity')
      .select('id, author, at, changes').eq('notificado', false).order('at');
    if (!pendientes?.length) return Response.json({ ok: true, pendientes: 0 });

    // Agrupar por autor y quedarse con los que ya dejaron de editar
    const porAutor = new Map<string, Act[]>();
    for (const a of pendientes as Act[]) {
      const k = a.author ?? '';
      porAutor.set(k, [...(porAutor.get(k) ?? []), a]);
    }
    const limite = Date.now() - ESPERA_MIN * 60000;
    const listos = [...porAutor.entries()].filter(([, acts]) => Date.parse(acts[acts.length - 1].at) <= limite);
    if (!listos.length) return Response.json({ ok: true, esperando: porAutor.size });

    const { data: people } = await db.from('people').select('id, name, email, notificar_correo');
    const porId = new Map((people ?? []).map(p => [p.id, p]));
    const resultado: Record<string, unknown> = {};

    for (const [autorId, acts] of listos) {
      // Marcar como avisadas (si otra ejecución ya las tomó, no se repiten)
      const { data: tomadas } = await db.from('activity').update({ notificado: true })
        .in('id', acts.map(a => a.id)).eq('notificado', false).select('id, changes, at').order('at');
      if (!tomadas?.length) continue;

      // Un renglón por día: estado anterior al primer cambio y estado final
      const dias = new Map<string, Cambio>();
      for (const a of tomadas) for (const c of (a.changes ?? []) as Cambio[]) {
        const k = `${c.pid}|${c.date}`;
        const previo = dias.get(k);
        dias.set(k, { pid: c.pid, date: c.date, from: previo ? previo.from : c.from, to: c.to });
      }
      const cambios = [...dias.values()]
        .filter(c => codigo(c.from) !== codigo(c.to) || (c.from?.note ?? '') !== (c.to?.note ?? ''))
        .sort((a, b) => a.date.localeCompare(b.date));
      if (!cambios.length) continue;

      const autor = porId.get(autorId)?.name ?? 'Alguien';
      const destinatarios = (people ?? []).filter(p => p.notificar_correo && p.email && p.id !== autorId);
      if (!destinatarios.length) { resultado[autor] = 'sin destinatarios'; continue; }

      const filas = cambios.map(c => {
        const s = codigo(c.to), antes = codigo(c.from);
        const quien = c.pid && c.pid !== autorId ? ` · ${esc(porId.get(c.pid)?.name ?? '')}` : '';
        const previo = antes !== 'N' && antes !== s ? `<span style="color:#98A2AE;font-size:12px"> (antes: ${esc(ESTADOS[antes])})</span>` : '';
        const nota = c.to?.note ? `<div style="color:#687383;font-style:italic;font-size:13px;margin-top:3px">"${esc(c.to.note)}"</div>` : '';
        return `<tr><td style="padding:9px 12px;border-bottom:1px solid #E3E7EC;width:96px;color:#687383;font-size:13px;vertical-align:top">${esc(fecha(c.date))}${quien}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #E3E7EC;vertical-align:top"><b style="color:${COLORES[s]}">${esc(ESTADOS[s])}</b>${previo}${nota}</td></tr>`;
      }).join('');
      const n = cambios.length;
      const asunto = `${autor} actualizó el calendario (${n} ${n === 1 ? 'día' : 'días'})`;
      const html = `<div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;color:#1D2733">
        <h2 style="font-size:18px;margin:0 0 4px">${esc(autor)} actualizó ${n} ${n === 1 ? 'día' : 'días'}</h2>
        <p style="color:#687383;font-size:13px;margin:0 0 14px">Resumen de sus cambios</p>
        <table style="width:100%;border-collapse:collapse;background:#F7F8FA;border-radius:10px">${filas}</table>
        <p style="margin:18px 0"><a href="${APP_URL}" style="background:#3A4A96;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Abrir el calendario</a></p>
        <p style="color:#98A2AE;font-size:12px">Recibes este correo porque activaste "Recibir correos de actualizaciones" en tu perfil. Puedes apagarlo ahí mismo.</p>
      </div>`;

      // Un correo por persona, para no mostrar los correos de los demás
      const estados = await Promise.all(destinatarios.map(p => fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: 'Hybrid Work Planner', email: remitente },
          to: [{ email: p.email, name: p.name }],
          subject: asunto,
          htmlContent: html
        })
      }).then(r => r.status)));
      resultado[autor] = estados;
    }
    return Response.json({ ok: true, enviados: resultado });
  } catch (e) {
    return Response.json({ ok: false, error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
});
