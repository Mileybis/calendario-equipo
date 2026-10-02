// =====================================================================
//  Hybrid Work Planner — función "notificar" (Supabase Edge Function)
//  Se ejecuta cada vez que alguien sube cambios (la llama un trigger de la
//  tabla activity). Envía un correo a las personas que activaron
//  "Recibir correos de actualizaciones", excepto a quien hizo el cambio.
//  Envío: API de Brevo. Secrets necesarios en Supabase:
//    BREVO_API_KEY     → clave de API de Brevo
//    CORREO_REMITENTE  → correo verificado en Brevo desde el que se envía
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const APP_URL = 'https://mileybis.github.io/calendario-equipo/';
const ESTADOS: Record<string, string> = {
  R: 'Remoto', O: 'Oficina', V: 'Vacaciones', I: 'Incapacidad',
  E: 'Evento', P: 'Permiso', VL: 'Voluntariado', N: 'Sin definir'
};
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
const fecha = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MESES[m - 1]}`;
};
const estado = (e: { s?: string } | null | undefined) => ESTADOS[e?.s ?? 'N'] ?? 'Sin definir';

type Cambio = { pid: string; date: string; from?: { s?: string; note?: string }; to?: { s?: string; note?: string } };

Deno.serve(async (req) => {
  try {
    const { id } = await req.json();
    if (!id) return new Response('Falta el id de la actualización', { status: 400 });

    const apiKey = Deno.env.get('BREVO_API_KEY');
    const remitente = Deno.env.get('CORREO_REMITENTE');
    if (!apiKey || !remitente) return Response.json({ ok: false, error: 'Faltan los secrets BREVO_API_KEY o CORREO_REMITENTE' });

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Marca la actualización como avisada: cada una se avisa una sola vez
    const { data: act } = await db.from('activity')
      .update({ notificado: true }).eq('id', id).eq('notificado', false)
      .select('id, author, changes').maybeSingle();
    if (!act) return Response.json({ ok: true, omitido: 'ya avisada o no existe' });

    const { data: people } = await db.from('people').select('id, name, email, notificar_correo');
    const porId = new Map((people ?? []).map(p => [p.id, p]));
    const autor = porId.get(act.author)?.name ?? 'Alguien';
    const destinatarios = (people ?? []).filter(p => p.notificar_correo && p.email && p.id !== act.author);
    if (!destinatarios.length) return Response.json({ ok: true, destinatarios: 0 });

    const cambios = (act.changes ?? []) as Cambio[];
    const filas = cambios.map(c => {
      const quien = c.pid !== act.author ? ` · ${esc(porId.get(c.pid)?.name ?? '')}` : '';
      const nota = c.to?.note ? `<div style="color:#687383;font-style:italic;margin-top:4px">"${esc(c.to.note)}"</div>` : '';
      return `<tr><td style="padding:10px 12px;border-bottom:1px solid #E3E7EC">
        <div style="color:#687383;font-size:13px">${esc(fecha(c.date))}${quien}</div>
        <div style="font-size:15px;margin-top:2px">${esc(estado(c.from))} &rarr; <b>${esc(estado(c.to))}</b></div>${nota}
      </td></tr>`;
    }).join('');
    const asunto = `${autor} actualizó el calendario`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1D2733">
      <h2 style="font-size:18px;margin:0 0 12px">${esc(autor)} subió ${cambios.length} ${cambios.length === 1 ? 'cambio' : 'cambios'}</h2>
      <table style="width:100%;border-collapse:collapse;background:#F7F8FA;border-radius:10px">${filas}</table>
      <p style="margin:18px 0"><a href="${APP_URL}" style="background:#3A4A96;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Abrir el calendario</a></p>
      <p style="color:#98A2AE;font-size:12px">Recibes este correo porque activaste "Recibir correos de actualizaciones" en tu perfil. Puedes apagarlo ahí mismo.</p>
    </div>`;

    // Un correo por persona, para no mostrar los correos de los demás
    const resultados = await Promise.all(destinatarios.map(p => fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Hybrid Work Planner', email: remitente },
        to: [{ email: p.email, name: p.name }],
        subject: asunto,
        htmlContent: html
      })
    }).then(r => r.status)));
    return Response.json({ ok: true, enviados: resultados.filter(s => s < 300).length, estados: resultados });
  } catch (e) {
    return Response.json({ ok: false, error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
});
