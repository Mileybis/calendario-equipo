/* =====================================================================
   Hybrid Work Planner — LÓGICA DE LA APLICACIÓN
   Depende de: config.js, data.js y la librería supabase-js (CDN).
   ===================================================================== */

const ESTADOS = {
  R: { icon: ic('home'), label: 'Remoto' },
  O: { icon: ic('building'), label: 'Oficina' },
  V: { icon: ic('beach'), label: 'Vacaciones' },
  I: { icon: ic('stethoscope'), label: 'Incapacidad' },
  E: { icon: ic('calendar-star'), label: 'Evento' },
  P: { icon: ic('clock'), label: 'Permiso' },
  VL: { icon: ic('heart-handshake'), label: 'Voluntariado' },
  N: { icon: ic('plus'), label: 'Sin definir' },
  F: { icon: '', label: 'Feriado' }
};
const EDITABLES = ['R', 'O', 'V', 'I', 'E', 'P', 'VL'];
// Días en que la persona no está ni en oficina ni en remoto
const AUSENCIAS = ['V', 'I', 'E', 'P', 'VL'];
const emptyCounts = () => Object.fromEntries(Object.keys(ESTADOS).map(k => [k, 0]));
const ausentes = c => AUSENCIAS.reduce((n, k) => n + c[k], 0);
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS_CORTO = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DIAS_LARGO = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const AVATARES = [
  ['#E8ECFA','#3A4A96'], ['#E4F2EC','#2E6A55'], ['#FBF0DC','#8A5A1E'], ['#F3E5EE','#8A3D6B'],
  ['#E3EFF5','#2C627C'], ['#F9E6E8','#9A3B4A'], ['#EFE8FA','#5E3E96'], ['#FFF5CC','#7A6200'],
  ['#E0F4F4','#206B6B'], ['#FDE9DF','#9A4A22']
];
// Ilustraciones de imagenes/avatares/<id>.svg; se guardan como 'ilus:<id>'
const ILUSTRACIONES = [
  ['panda', 'Panda'], ['tortuga', 'Tortuga'], ['nutria', 'Nutria'], ['delfin', 'Delfín'], ['gato', 'Gato'], ['zorro', 'Zorro'],
  ['conejo', 'Conejo'], ['pinguino', 'Pingüino'], ['perro', 'Perro'], ['koala', 'Koala'], ['buho', 'Búho'], ['elefante', 'Elefante']
];
const ILUS_IDS = ILUSTRACIONES.map(([id]) => 'ilus:' + id);
const ilusSrc = icon => `imagenes/avatares/${icon.slice(5)}.svg`;
// Los emojis de antes se muestran con su ilustración equivalente
const EMOJI_A_ILUS = { '🐼': 'panda', '🐢': 'tortuga', '🦦': 'nutria', '🐬': 'delfin', '🐱': 'gato', '🦊': 'zorro',
  '🐰': 'conejo', '🐧': 'pinguino', '🐶': 'perro', '🐨': 'koala', '🦉': 'buho' };
const ANIMALES = ['🐼','🦊','🐱','🐶','🐰','🐻','🐨','🐯','🦁','🐸','🐵','🐧','🦉','🐙','🦄','🐢','🐹','🐮','🐷','🐥','🦋','🐝','🐬','🐳','🦥','🦦','🐿️','🦔','🐞','🦩'];

/* ================= UTILIDADES ================= */
const hoyReal = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseYmd = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const g = x.getDay(); return addDays(x, g === 0 ? -6 : 1 - g); };
const sameDay = (a, b) => ymd(a) === ymd(b);
const isWeekday = d => d.getDay() >= 1 && d.getDay() <= 5;
const holidayOf = d => FERIADOS[ymd(d)] || null;
const isWorkday = d => isWeekday(d) && !holidayOf(d);
const isLockedDay = d => d.getDay() === DIA_OBLIGATORIO && !holidayOf(d);
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const shortDate = d => `${DIAS_CORTO[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()].slice(0,3)}`;
const isMobile = () => window.matchMedia('(max-width: 700px)').matches;
const MIN_MON = mondayOf(new Date(AÑO_INICIO, 0, 1));
const MAX_DAY = new Date(AÑO_FIN, 11, 31);
const inRange = d => d >= new Date(AÑO_INICIO, 0, 1) && d <= MAX_DAY;

function quincenaOf(d){
  const k = ymd(d); let lo = 0, hi = QUINCENAS.length - 1, ans = -1;
  while (lo <= hi){ const m = (lo + hi) >> 1; if (QUINCENAS[m][0] <= k){ ans = m; lo = m + 1; } else hi = m - 1; }
  return ans >= 0 ? QUINCENAS[ans][1] : null;
}
const fiscalYear = d => d.getMonth() >= 9 ? `${d.getFullYear()}-${d.getFullYear() + 1}` : `${d.getFullYear() - 1}-${d.getFullYear()}`;
function weekInfo(mon){
  const days = [0,1,2,3,4].map(i => addDays(mon, i));
  return {
    days,
    codes: [...new Set(days.map(quincenaOf).filter(Boolean))],
    fys: [...new Set(days.map(fiscalYear))],
    hols: days.filter(holidayOf).map(d => ({ d, name: holidayOf(d) })),
    work: days.filter(isWorkday).length
  };
}
function cleanAvatar(a, i){
  const color = Number.isInteger(a?.color) && a.color >= 0 && a.color < AVATARES.length ? a.color : i % AVATARES.length;
  const icon = EMOJI_A_ILUS[a?.icon] ? 'ilus:' + EMOJI_A_ILUS[a.icon]
    : ANIMALES.includes(a?.icon) || ILUS_IDS.includes(a?.icon) ? a.icon : '';
  return { color, icon };
}

/* ================= ESTADO ================= */
const state = {
  people: [], pendingPeople: [], days: {}, activity: [],
  me: null, isAdmin: false,
  view: 'mine', year: 0, month: 0, weekStart: null, mobileDay: -1, teamMode: 'week', teamDay: null,
  editing: false, pending: {}, mode: 'connecting'
};
const MAX_ACTIVIDAD = 300;   // cambios recientes que se cargan para Actualizaciones
const personById = id => state.people.find(p => p.id === id);
const pendingCount = () => Object.keys(state.pending).length;

/* ================= SEMANAS ================= */
function currentWeekMonday(){
  const t = hoyReal();
  let mon = mondayOf(t);
  if (t.getDay() === 0 || t.getDay() === 6) mon = addDays(mon, 7);
  return mon;
}
function setWeek(mon){
  if (mon < MIN_MON) mon = MIN_MON;
  if (mon > mondayOf(MAX_DAY)) mon = mondayOf(MAX_DAY);
  state.weekStart = mon;
  const mid = addDays(mon, 2);
  state.month = mid.getMonth();
  state.year = Math.min(Math.max(mid.getFullYear(), AÑO_INICIO), AÑO_FIN);
  state.mobileDay = -1;
}
function weeksOfMonth(y, m){
  const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  const weeks = [];
  let mon = mondayOf(first);
  while (mon <= last){
    const days = [0,1,2,3,4].map(i => addDays(mon, i));
    if (days.some(d => d.getMonth() === m)) weeks.push(days);
    mon = addDays(mon, 7);
  }
  return weeks;
}
function setMonth(y, m){
  y = Math.min(Math.max(y, AÑO_INICIO), AÑO_FIN);
  const t = hoyReal();
  if (t.getFullYear() === y && t.getMonth() === m){ setWeek(currentWeekMonday()); return; }
  setWeek(weeksOfMonth(y, m)[0][0]);
  state.year = y; state.month = m;
}
function weekRange(days){
  const a = days[0], b = days[4];
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} al ${b.getDate()} de ${MESES[a.getMonth()]}`
    : `${a.getDate()} de ${MESES[a.getMonth()]} al ${b.getDate()} de ${MESES[b.getMonth()]}`;
}
function focusWeek(){
  const days = [0,1,2,3,4].map(i => addDays(state.weekStart, i));
  let label = `Semana del ${weekRange(days)}`;
  if (sameDay(state.weekStart, mondayOf(hoyReal()))) label = 'Esta semana';
  else if (sameDay(state.weekStart, currentWeekMonday())) label = 'Próxima semana';
  return { days, label };
}

/* ================= REGLAS ================= */
function normalize(e, d){
  if (holidayOf(d)) return { s: 'F', note: holidayOf(d) };
  let s = EDITABLES.includes(e?.s) ? e.s : 'N';
  if (isLockedDay(d) && (s === 'R' || s === 'N')) s = 'O';
  return { s, note: String(e?.note || '').slice(0, 80) };
}
function committedEntry(pid, d){
  if (holidayOf(d)) return { s: 'F', note: holidayOf(d) };
  const saved = state.days[pid]?.[ymd(d)];
  return normalize(saved || { s: 'N' }, d);
}
function entry(pid, d){
  const k = pid + '|' + ymd(d);
  if (state.editing && state.pending[k]) return normalize(state.pending[k], d);
  return committedEntry(pid, d);
}
const isPending = (pid, d) => state.editing && !!state.pending[pid + '|' + ymd(d)];
const sameEntry = (a, b) => a.s === b.s && (a.note || '') === (b.note || '');

function canEdit(pid, d){
  if (!isWeekday(d) || !inRange(d)) return { ok: false, why: 'Fuera del calendario' };
  if (holidayOf(d)) return { ok: false, why: `Feriado: ${holidayOf(d)}` };
  if (!state.me) return { ok: false, why: 'Inicia sesión para editar' };
  if (pid !== state.me && !state.isAdmin) return { ok: false, why: 'Solo puedes cambiar tu propio calendario' };
  if (!state.isAdmin && d < mondayOf(hoyReal())) return { ok: false, why: 'Solo puedes cambiar desde esta semana en adelante' };
  return { ok: true };
}

function countsFor(d){
  const c = emptyCounts();
  state.people.forEach(p => { c[entry(p.id, d).s]++; });
  return c;
}
function weekCheck(pid, mon, override){
  const c = emptyCounts();
  [0,1,2,3,4].forEach(i => {
    const d = addDays(mon, i);
    const s = override && override.date === ymd(d) ? override.s : entry(pid, d).s;
    c[s]++;
  });
  // Las ausencias (vacaciones, incapacidad, evento, permiso, voluntariado) NO reducen los días remotos permitidos.
  // Solo los feriados los reducen (semana de 4 días laborables = 1 remoto).
  const work = 5 - c.F;
  const tO = Math.min(OFICINA_POR_SEMANA, work);
  const tR = Math.min(REMOTO_POR_SEMANA, Math.max(0, work - tO));
  return { ...c, tR, ok: c.R <= tR };
}
function invalidPendingWeeks(){
  const seen = new Set(), bad = [];
  Object.keys(state.pending).forEach(k => {
    const [pid, date] = k.split('|');
    const mon = mondayOf(parseYmd(date));
    const key = pid + '|' + ymd(mon);
    if (seen.has(key)) return; seen.add(key);
    const w = weekCheck(pid, mon);
    if (!w.ok) bad.push({ pid, mon, w });
  });
  return bad;
}

/* ================= UI HELPERS ================= */
function avatar(p, override){
  if (!p) return '<span class="avatar" style="background:var(--surface-2)">?</span>';
  const i = Math.max(0, state.people.findIndex(x => x.id === p.id));
  const a = cleanAvatar(override || p.avatar, i);
  const [bg, fg] = AVATARES[a.color];
  if (ILUS_IDS.includes(a.icon)) return `<span class="avatar ilus" aria-hidden="true"><img src="${ilusSrc(a.icon)}" alt=""></span>`;
  return a.icon
    ? `<span class="avatar animal" style="background:${bg}" aria-hidden="true">${a.icon}</span>`
    : `<span class="avatar" style="background:${bg};color:${fg}">${esc(((p.name || '?').trim()[0] || '?').toUpperCase())}</span>`;
}
const statusText = e => `${ESTADOS[e.s].icon} ${ESTADOS[e.s].label}`.trim();

function cellBtn(p, d, opts = {}){
  if (opts.monthOnly && d.getMonth() !== state.month) return `<div class="cell out" aria-hidden="true"></div>`;
  const e = entry(p.id, d);
  if (e.s === 'F') return `<div class="cell F" title="${esc('Feriado: ' + e.note)}">${opts.mini ? `<span class="n">${d.getDate()}</span>` : ''}<span class="t">Feriado</span></div>`;
  const ce = canEdit(p.id, d);
  const locked = isLockedDay(d) && e.s === 'O';
  const pend = isPending(p.id, d);
  const label = e.s === 'N' ? (ce.ok ? 'Definir' : '—') : ESTADOS[e.s].label;
  const icon = e.s === 'N' ? (ce.ok ? ic('plus') : '') : ESTADOS[e.s].icon;
  const title = `${p.name} · ${DIAS_LARGO[d.getDay()]} ${d.getDate()}: ${ESTADOS[e.s].label}${e.note ? ' — ' + e.note : ''}${locked ? ' · ' + MENSAJE_BLOQUEO : ''}`;
  return `<button class="cell ${e.s} ${locked ? 'locked' : ''} ${pend ? 'pending' : ''} ${ce.ok ? '' : 'ro'}" data-pid="${p.id}" data-date="${ymd(d)}" title="${esc(title)}" aria-label="${esc(title)}">
    ${pend ? '<span class="dot"></span>' : ''}${locked ? `<span class="lock">${ic('lock')}</span>` : ''}
    ${opts.mini ? `<span class="n">${d.getDate()}</span>` : ''}
    ${icon ? `<span class="e">${icon}</span>` : ''}<span class="t">${label}</span>
    ${e.note && !opts.mini && !opts.row ? `<span class="note">${esc(e.note)}</span>` : ''}
  </button>`;
}
function dayHead(d){
  const h = holidayOf(d), lk = isLockedDay(d);
  const cls = [lk ? 'locked-col' : '', h ? 'hol-col' : '', sameDay(d, hoyReal()) ? 'today' : ''].join(' ');
  const title = h ? `Feriado: ${h}` : lk ? MENSAJE_BLOQUEO : '';
  return `<th class="${cls}" ${title ? `title="${esc(title)}"` : ''}>${DIAS_CORTO[d.getDay()]}${lk ? ' ' + ic('lock', 'sm') : ''}<b>${d.getDate()}</b></th>`;
}
function personLabel(p){
  const first = esc((p.name || '').trim().split(/\s+/)[0] || p.name);
  return `<span class="person">${avatar(p)}<span class="nm"><span class="nm-full">${esc(p.name)}</span><span class="nm-short" style="display:none">${first}</span></span>${p.id === state.me ? '<span class="you">Tú</span>' : ''}</span>`;
}
let toastTimer;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}
function timeAgo(ts){
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const d = new Date(ts);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function openDlg(d){ d.showModal ? d.showModal() : d.setAttribute('open', ''); }

/* ================= RENDER ================= */
function renderControls(){
  document.getElementById('monthSel').innerHTML = MESES.map((m, i) => `<option value="${i}" ${i === state.month ? 'selected' : ''}>${isMobile() ? cap(m.slice(0, 3)) : cap(m)}</option>`).join('');
  let yo = '';
  for (let y = AÑO_INICIO; y <= AÑO_FIN; y++) yo += `<option value="${y}" ${y === state.year ? 'selected' : ''}>${y}</option>`;
  document.getElementById('yearSel').innerHTML = yo;
  document.getElementById('prev').disabled = state.year === AÑO_INICIO && state.month === 0;
  document.getElementById('next').disabled = state.year === AÑO_FIN && state.month === 11;
  const me = personById(state.me);
  document.querySelectorAll('.js-me').forEach(b => {
    b.innerHTML = me ? (b.classList.contains('me-btn') ? `${avatar(me)}<span>${esc(me.name)}</span>` : avatar(me)) : ic('user');
  });
  document.querySelectorAll('.js-settings').forEach(b => {
    b.hidden = !state.isAdmin;
    const n = state.pendingPeople.length;
    b.innerHTML = ic('settings') + (n ? `<span class="badge">${n}</span>` : '');
  });
  const sync = document.getElementById('sync');
  sync.className = 'sync' + (state.mode === 'live' ? ' live' : '');
  sync.querySelector('span').textContent = state.mode === 'live' ? 'En vivo con tu equipo' : state.mode === 'local' ? 'Modo de prueba (sin conexión)' : 'Conectando…';
  document.getElementById('editBtn').hidden = state.editing;
  document.body.classList.toggle('editing', state.editing);
  document.getElementById('tabTeam').setAttribute('aria-selected', state.view === 'team');
  document.getElementById('tabMine').setAttribute('aria-selected', state.view === 'mine');
}

const isMonthView = () => state.view === 'team' && state.teamMode === 'month';
const statHTML = (cls, icon, value, label, pct) =>
  `<div class="stat ${cls}"><span class="ico">${ic(icon)}</span><div><b>${value}</b><small>${label}</small><span class="sbar"><i style="width:${Math.round(pct)}%"></i></span></div></div>`;

function renderSummary(){
  const el = document.getElementById('summary'), n = state.people.length;
  if (isMonthView()){
    // Total del mes: días de todo el equipo en cada estado
    const last = new Date(state.year, state.month + 1, 0).getDate();
    const work = [];
    for (let i = 1; i <= last; i++){ const d = new Date(state.year, state.month, i); if (isWorkday(d)) work.push(d); }
    const c = emptyCounts();
    work.forEach(d => state.people.forEach(p => { c[entry(p.id, d).s]++; }));
    const total = work.length * n || 1, aus = ausentes(c);
    el.innerHTML =
      statHTML('O', 'building', c.O, 'Días en oficina', c.O / total * 100) +
      statHTML('R', 'home', c.R, 'Días en remoto', c.R / total * 100) +
      statHTML('V', 'door-exit', aus, 'Días de ausencia', aus / total * 100) +
      statHTML('N', 'help-circle', c.N, 'Días sin definir', c.N / total * 100) +
      statHTML('L', 'calendar-week', work.length, `Días laborables · ${MESES[state.month]}`, 100);
    return;
  }
  // Semana: foto de hoy
  const t = hoyReal(), off = !isWorkday(t), c = off ? null : countsFor(t);
  const offMsg = holidayOf(t) ? 'Hoy es feriado' : 'Hoy no es laborable';
  const val = x => off ? '—' : x, pct = x => off || !n ? 0 : x / n * 100;
  const lbl = s => off ? offMsg : `${s} hoy · de ${n}`;
  const wi = weekInfo(state.weekStart);
  el.innerHTML =
    statHTML('O', 'building', val(c?.O), lbl('En oficina'), pct(c?.O)) +
    statHTML('R', 'home', val(c?.R), lbl('En remoto'), pct(c?.R)) +
    statHTML('V', 'door-exit', val(c ? ausentes(c) : 0), lbl('Ausentes'), pct(c ? ausentes(c) : 0)) +
    statHTML('N', 'help-circle', val(c?.N), off ? offMsg : 'Sin definir hoy', pct(c?.N)) +
    statHTML('L', 'calendar-week', wi.work, 'Días laborables · semana', wi.work * 20);
}

function weekNav(fw, sub){
  return `<div class="week-nav">
    <button class="icon-btn js-prevw" aria-label="Semana anterior" ${state.weekStart <= MIN_MON ? 'disabled' : ''}>‹</button>
    <div class="week-nav-title"><h2 class="title">${fw.label}</h2><p class="hint">${sub}</p></div>
    <button class="icon-btn js-nextw" aria-label="Semana siguiente" ${addDays(state.weekStart, 7) > MAX_DAY ? 'disabled' : ''}>›</button>
  </div>`;
}

function teamSwitch(){
  return `<div class="seg team-seg" role="tablist" aria-label="Vista del equipo">
    <button type="button" data-tmode="week" aria-selected="${state.teamMode !== 'month'}">Semana</button>
    <button type="button" data-tmode="month" aria-selected="${state.teamMode === 'month'}">Mes</button>
  </div>`;
}
function teamHead(title, sub, kind, prevDis, nextDis){
  return `<div class="team-head">
    <div class="th-title"><h2 class="title">${title}</h2>${sub ? `<p class="hint">${sub}</p>` : ''}</div>
    <button class="icon-btn th-prev js-prev${kind}" aria-label="Anterior" ${prevDis ? 'disabled' : ''}>‹</button>
    <button class="icon-btn th-next js-next${kind}" aria-label="Siguiente" ${nextDis ? 'disabled' : ''}>›</button>
    ${teamSwitch()}
  </div>`;
}
function dayPeopleList(d){
  const h = holidayOf(d);
  if (h) return `<div class="hol-banner"><strong>Feriado</strong>${esc(h)}</div>`;
  const people = [...state.people].sort((a, b) => (b.id === state.me) - (a.id === state.me));
  return `<ul class="plist">${people.map(p => {
    const e = entry(p.id, d);
    return `<li class="prow ${p.id === state.me ? 'me' : ''}"><div class="person">${avatar(p)}<span style="min-width:0"><span class="nm">${esc(p.name)}</span>${e.note && e.s !== 'F' ? `<span class="pnote">${ic('note')} ${esc(e.note)}</span>` : ''}</span>${p.id === state.me ? '<span class="you">Tú</span>' : ''}</div>${cellBtn(p, d, { row: true })}</li>`;
  }).join('')}</ul>`;
}
function renderTeam(){
  if (state.teamMode === 'month') return renderTeamMonth();
  const fw = focusWeek(), days = fw.days;
  const sub = fw.label.startsWith('Semana') ? '' : `Del ${weekRange(days)}`;
  document.getElementById('view').innerHTML = `<div class="panel team-week">
    ${teamHead(fw.label, sub || (state.editing ? 'Toca un día para cambiarlo' : ''), 'w', state.weekStart <= MIN_MON, addDays(state.weekStart, 7) > MAX_DAY)}
    <div class="table-wrap"><table class="grid">
      <thead><tr><th class="name-col">Persona</th>${days.map(dayHead).join('')}</tr></thead>
      <tbody>${state.people.map((p, row) => `<tr class="${p.id === state.me ? 'me-row' : ''}"><th class="name-col">${personLabel(p)}</th>${days.map(d => {
        const h = holidayOf(d);
        if (h) return row === 0 ? `<td class="hol-cell" rowspan="${state.people.length}"><strong>Feriado</strong><span>${esc(h)}</span></td>` : '';
        return `<td>${cellBtn(p, d)}</td>`;
      }).join('')}</tr>`).join('')}</tbody>
    </table></div>
  </div>`;
  bindWeekNav(); bindTeamSwitch();
}
function renderTeamMonth(){
  const weeks = weeksOfMonth(state.year, state.month), t = hoyReal(), n = state.people.length || 1;
  if (!state.teamDay || parseYmd(state.teamDay).getMonth() !== state.month || parseYmd(state.teamDay).getFullYear() !== state.year){
    const inMonth = weeks.flat().filter(d => d.getMonth() === state.month && isWeekday(d));
    state.teamDay = ymd(inMonth.find(d => sameDay(d, t)) || inMonth.find(isWorkday) || inMonth[0]);
  }
  const sel = parseYmd(state.teamDay);
  const cell = d => {
    if (d.getMonth() !== state.month) return `<div class="mcell out"></div>`;
    const h = holidayOf(d);
    const cls = ['mcell', h ? 'hol' : '', sameDay(d, t) ? 'today' : '', sameDay(d, sel) ? 'sel' : ''].join(' ');
    if (h) return `<button type="button" class="${cls}" data-mday="${ymd(d)}" title="${esc('Feriado: ' + h)}"><span class="md">${d.getDate()}</span><span class="mh">Feriado</span></button>`;
    const c = countsFor(d), aus = ausentes(c);
    const pills = [
      c.O ? `<i class="O" title="En oficina">${ic('building')} ${c.O}</i>` : '',
      c.R ? `<i class="R" title="Remoto">${ic('home')} ${c.R}</i>` : '',
      aus ? `<i class="V" title="Ausentes: vacaciones, incapacidad, evento, permiso o voluntariado">${ic('door-exit')} ${aus}</i>` : ''
    ].join('');
    return `<button type="button" class="${cls}" data-mday="${ymd(d)}">
      <span class="md">${d.getDate()}</span>
      <span class="mstats">${pills || '<em>Sin definir</em>'}</span>
      <span class="mbar">${['O','R',...AUSENCIAS].map(k => c[k] ? `<i class="${k}" style="width:${c[k] / n * 100}%"></i>` : '').join('')}</span>
    </button>`;
  };
  document.getElementById('view').innerHTML = `<div class="panel team-month">
    ${teamHead(`${cap(MESES[state.month])} ${state.year}`, 'Toca un día para ver quién va', 'm', state.year === AÑO_INICIO && state.month === 0, state.year === AÑO_FIN && state.month === 11)}
    <div class="mlegend"><span><i class="O"></i>Oficina</span><span><i class="R"></i>Remoto</span><span><i class="V"></i>Vacaciones / otros</span><span><i class="N"></i>Sin definir</span></div>
    <div class="mgrid">
      ${weeks[0].map(d => `<div class="mhead">${DIAS_CORTO[d.getDay()]}${isLockedDay(d) || d.getDay() === DIA_OBLIGATORIO ? ' ' + ic('lock', 'sm') : ''}</div>`).join('')}
      ${weeks.map(w => w.map(cell).join('')).join('')}
    </div>
    <div class="mdetail">
      <h3 class="sub">${cap(DIAS_LARGO[sel.getDay()])} ${sel.getDate()} de ${MESES[sel.getMonth()]}${sameDay(sel, t) ? ' · hoy' : ''}</h3>
      ${dayPeopleList(sel)}
    </div>
  </div>`;
  document.querySelectorAll('[data-mday]').forEach(b => b.onclick = () => {
    const d = parseYmd(b.dataset.mday);
    setWeek(mondayOf(d)); state.month = d.getMonth(); state.year = d.getFullYear(); state.teamDay = b.dataset.mday;
    renderAll();
  });
  document.querySelector('.js-prevm').onclick = () => { goMonth(-1); };
  document.querySelector('.js-nextm').onclick = () => { goMonth(1); };
  bindTeamSwitch();
}
function bindTeamSwitch(){
  document.querySelectorAll('[data-tmode]').forEach(b => b.onclick = () => { state.teamMode = b.dataset.tmode; renderAll(); });
}
function bindWeekNav(){
  document.querySelectorAll('.js-prevw').forEach(b => b.onclick = () => { setWeek(addDays(state.weekStart, -7)); renderAll(); });
  document.querySelectorAll('.js-nextw').forEach(b => b.onclick = () => { setWeek(addDays(state.weekStart, 7)); renderAll(); });
}

function renderMine(){
  const p = personById(state.me);
  if (!p){ document.getElementById('view').innerHTML = '<div class="panel"><p class="hint">Cargando…</p></div>'; return; }
  const fw = focusWeek(), t = hoyReal();
  const tally = emptyCounts();
  const rows = fw.days.map(d => {
    const e = entry(p.id, d); tally[e.s]++;
    if (e.s === 'F') return `<li><div class="day-row F"><span><span class="d">${DIAS_CORTO[d.getDay()]} ${d.getDate()}</span><small>${esc(e.note)}</small></span><span>Feriado</span></div></li>`;
    const ce = canEdit(p.id, d);
    const locked = isLockedDay(d) && e.s === 'O';
    const right = e.s === 'N' ? (ce.ok ? `${ic('plus')} Definir` : '—') : statusText(e) + (locked ? ' ' + ic('lock', 'sm') : '');
    return `<li><button class="day-row ${e.s} ${locked ? 'locked' : ''} ${isPending(p.id, d) ? 'pending' : ''} ${sameDay(d, t) ? 'is-today' : ''} ${ce.ok ? '' : 'ro'}" data-pid="${p.id}" data-date="${ymd(d)}">
      <span><span class="d">${DIAS_CORTO[d.getDay()]} ${d.getDate()}</span>${e.note ? `<small>${ic('note')} ${esc(e.note)}</small>` : ''}</span>
      <span>${right}</span>
    </button></li>`;
  }).join('');
  const w = weekCheck(p.id, state.weekStart);
  let nextTxt = 'sin días presenciales próximos';
  for (let i = 1; i <= 90; i++){
    const d = addDays(t, i);
    if (isWorkday(d) && entry(p.id, d).s === 'O'){ nextTxt = `${DIAS_LARGO[d.getDay()]} ${d.getDate()}${d.getMonth() !== t.getMonth() ? ' de ' + MESES[d.getMonth()] : ''}`; break; }
  }
  const todayE = isWorkday(t) ? entry(p.id, t) : null;
  const chips = o => ['O','R',...AUSENCIAS,'N'].filter(k => o[k] > 0 || k === 'O' || k === 'R').map(k => `<span class="chip ${k}">${ESTADOS[k].icon} ${ESTADOS[k].label}: ${o[k]}</span>`).join('');
  const weeks = weeksOfMonth(state.year, state.month);

  document.getElementById('view').innerHTML = `
    <div class="mine">
      <div class="panel">
        <div class="me-name">${avatar(p)}<div><h2>${esc(p.name)}</h2><p class="me-sub" style="margin:0">${state.isAdmin ? 'Administrador' : 'Mi calendario'}</p></div></div>
        <div style="height:12px"></div>
        ${weekNav(fw, `Remotos: ${w.R} de ${w.tR}`)}
        <ul class="day-list">${rows}</ul>
        <h3 class="sub">Resumen de la semana</h3>
        <div class="tally">${chips(tally)}</div>
        <div class="next">
          ${todayE ? `Hoy: ${todayE.s === 'N' ? 'sin definir' : statusText(todayE)}${todayE.note ? ' · ' + esc(todayE.note) : ''}<br>` : ''}
          Próximo día presencial: <b>${nextTxt}</b>
        </div>
      </div>
      <div class="panel mini">
        <h2 class="title">${cap(MESES[state.month])} ${state.year}</h2>
        <p class="hint" style="margin-bottom:10px">Tu mes completo</p>
        <div class="table-wrap"><table class="grid">
          <thead><tr>${weeks[0].map(d => `<th>${DIAS_CORTO[d.getDay()]}${d.getDay() === DIA_OBLIGATORIO ? ' ' + ic('lock', 'sm') : ''}</th>`).join('')}</tr></thead>
          <tbody>${weeks.map(wk => `<tr>${wk.map(d => `<td>${cellBtn(p, d, { mini: true, monthOnly: true })}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
      </div>
    </div>`;
  bindWeekNav();
}

function renderThisWeek(){
  // En la vista Mes no se muestra: el calendario del mes ya da esa información
  const box = document.getElementById('thisWeek');
  box.hidden = isMonthView();
  if (box.hidden) return;
  const fw = focusWeek(), t = hoyReal(), n = state.people.length || 1;
  // Inicial de cada persona con el color de su avatar
  const inicial = p => {
    const [bg, fg] = AVATARES[p.avatar?.color ?? 0];
    return `<i style="background:${bg};color:${fg}" title="${esc(p.name)}">${esc(((p.name || '?').trim()[0] || '?').toUpperCase())}</i>`;
  };
  document.getElementById('thisWeek').innerHTML = `
    <h2 class="title">${fw.label} en la oficina</h2>
    <div class="tw-grid">
      ${fw.days.map(d => {
        const hoy = sameDay(d, t);
        const head = `<div class="tw-head">${DIAS_CORTO[d.getDay()]} ${d.getDate()}${hoy ? '<span class="tw-today">Hoy</span>' : ''}</div>`;
        if (holidayOf(d)) return `<div class="tw-day ${hoy ? 'is-today' : ''}">${head}<div class="tw-hol">Feriado</div><div class="tw-rest">${esc(holidayOf(d))}</div></div>`;
        const c = countsFor(d), enOficina = state.people.filter(p => entry(p.id, d).s === 'O');
        const aus = ausentes(c);
        const rest = c.O === n && n ? ['Todo el equipo'] : [
          c.R ? `${ic('home')} ${c.R} en remoto` : '',
          aus ? `${ic('door-exit')} ${plural(aus, 'ausente', 'ausentes')}` : '',
          c.N ? `${ic('help-circle')} ${c.N} sin definir` : ''
        ].filter(Boolean);
        return `<div class="tw-day ${hoy ? 'is-today' : ''}">
          ${head}
          ${isLockedDay(d) ? `<div class="tw-lock">${ic('lock')} Presencial</div>` : ''}
          <div class="tw-big"><b>${c.O}</b><span>en oficina</span></div>
          ${enOficina.length ? `<div class="tw-av">${enOficina.slice(0, 6).map(inicial).join('')}${enOficina.length > 6 ? `<i class="more">+${enOficina.length - 6}</i>` : ''}</div>` : `<div class="tw-none">${hoy || d < t ? 'Nadie' : 'Nadie todavía'}</div>`}
          ${rest.length ? `<div class="tw-rest">${rest.map(r => `<div>${r}</div>`).join('')}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}

// Periodo que se está viendo: el mes en Equipo › Mes; la semana en los demás casos
function feedRange(){
  if (state.view === 'team' && state.teamMode === 'month'){
    return { from: ymd(new Date(state.year, state.month, 1)), to: ymd(new Date(state.year, state.month + 1, 0)),
      label: `Cambios de ${MESES[state.month]} ${state.year}`, empty: 'Sin cambios este mes.' };
  }
  const days = [0,1,2,3,4].map(i => addDays(state.weekStart, i));
  return { from: ymd(state.weekStart), to: ymd(addDays(state.weekStart, 6)),
    label: `Cambios del ${weekRange(days)}`, empty: 'Sin cambios esta semana.' };
}
const statusPill = e => {
  const s = e && ESTADOS[e.s] && !['N', 'F'].includes(e.s) ? e.s : 'N';
  return `<span class="chip sm ${s}">${s === 'N' ? '' : ESTADOS[s].icon}${ESTADOS[s].label}</span>`;
};
function renderFeed(){
  const r = feedRange();
  const items = state.activity.map(a => {
    const ch = (a.changes || []).filter(c => c.date >= r.from && c.date <= r.to);
    if (!ch.length) return '';
    const au = personById(a.author);
    const lis = ch.slice(0, 4).map(c => {
      const d = parseYmd(c.date), target = personById(c.pid);
      const who = c.pid !== a.author && target ? ` · ${esc(target.name)}` : '';
      return `<li><div class="fi-day">${shortDate(d)}${who}</div>
        <div class="fi-flow">${statusPill(c.from)}${ic('arrow-right', 'fi-arrow')}${statusPill(normalize(c.to, d))}</div>
        ${c.to?.note ? `<div class="fi-note">"${esc(c.to.note)}"</div>` : ''}</li>`;
    }).join('');
    return `<li class="fi">${avatar(au)}<div>
      <div class="fi-top"><b>${esc(au ? au.name : 'Alguien')}</b> <span>· ${timeAgo(a.at)}</span></div>
      <ul>${lis}${ch.length > 4 ? `<li class="more">y ${ch.length - 4} más</li>` : ''}</ul>
    </div></li>`;
  }).join('');
  document.getElementById('feed').innerHTML = `
    <h2 class="title">Actualizaciones</h2>
    <p class="hint">${r.label}${state.mode === 'live' ? ' · en vivo' : ''}</p>
    <ul class="feed-list">${items || `<li class="empty"><span>${ic('notes')}</span>${r.empty}</li>`}</ul>`;
}

function monthInfo(y, m){
  const days = [], last = new Date(y, m + 1, 0).getDate();
  for (let i = 1; i <= last; i++){ const d = new Date(y, m, i); if (isWeekday(d)) days.push(d); }
  const codes = [...new Set(days.map(quincenaOf).filter(Boolean))];
  return {
    days, codes,
    fys: [...new Set(days.map(fiscalYear))],
    hols: days.filter(holidayOf).map(d => ({ d, name: holidayOf(d) })),
    work: days.filter(isWorkday).length
  };
}
function weekSegments(days){
  const out = [];
  days.forEach(d => {
    const code = quincenaOf(d), fy = fiscalYear(d), last = out[out.length - 1];
    if (last && last.code === code && last.fy === fy) last.to = d;
    else out.push({ code, fy, from: d, to: d });
  });
  return out;
}
function renderDetails(){
  if (state.view === 'team' && state.teamMode === 'month'){
    const mi = monthInfo(state.year, state.month);
    const range = mi.codes.length > 1 ? `${mi.codes[0]} – ${mi.codes[mi.codes.length - 1]}` : (mi.codes[0] || '—');
    document.getElementById('details').innerHTML = `
      <h2 class="title">Detalles del mes</h2>
      <p class="hint">${cap(MESES[state.month])} ${state.year}</p>
      <dl>
        <dt>Año fiscal</dt><dd>${mi.fys.join(' / ')}</dd>
        <dt>Quincenas</dt><dd>${range}</dd>
        <dt>Cantidad de quincenas</dt><dd>${mi.codes.length}</dd>
        <dt>Días laborables</dt><dd>${mi.work} de ${mi.days.length}</dd>
      </dl>
      <h3 class="sub">Feriados del mes</h3>
      ${mi.hols.length
        ? `<ul class="hol-list">${mi.hols.map(h => `<li><span class="dd">${h.d.getDate()}<small>${DIAS_CORTO[h.d.getDay()]}</small></span><span>${esc(h.name)}</span></li>`).join('')}</ul>`
        : `<p class="hint">Sin feriados este mes.</p>`}
      <p class="note">Máximo ${plural(REMOTO_POR_SEMANA, 'día remoto', 'días remotos')} por semana y los martes en oficina. Ir más días a la oficina siempre está permitido.</p>`;
    return;
  }
  const wi = weekInfo(state.weekStart);
  document.getElementById('details').innerHTML = `
    <h2 class="title">Detalles de la semana</h2>
    ${wi.codes.length <= 1 ? `<dl>
      <dt>Año fiscal</dt><dd>${wi.fys[0]}</dd>
      <dt>Quincena</dt><dd>${wi.codes[0] || '—'}</dd>
      <dt>Días laborables</dt><dd>${wi.work} de 5</dd>
    </dl>` : `<dl><dt>Días laborables</dt><dd>${wi.work} de 5</dd></dl>
    <p class="split-note">${ic('pin')} ${wi.fys.length > 1 ? 'Esta semana empieza un nuevo año fiscal y una nueva quincena.' : 'Esta semana cambia de quincena.'}</p>
    <ul class="seg-list">${weekSegments(wi.days).map(g => `<li>
      <span class="q">Q ${g.code}</span>
      <span class="r"><b>${DIAS_CORTO[g.from.getDay()]} ${g.from.getDate()}${sameDay(g.from, g.to) ? '' : ` – ${DIAS_CORTO[g.to.getDay()]} ${g.to.getDate()}`}</b><small>Año fiscal ${g.fy}</small></span>
    </li>`).join('')}</ul>`}
    <h3 class="sub">Feriados</h3>
    ${wi.hols.length
      ? `<ul class="hol-list">${wi.hols.map(h => `<li><span class="dd">${h.d.getDate()}<small>${DIAS_CORTO[h.d.getDay()]}</small></span><span>${esc(h.name)}</span></li>`).join('')}</ul>`
      : `<p class="hint">Sin feriados esta semana.</p>`}
    <p class="note">Máximo ${plural(REMOTO_POR_SEMANA, 'día remoto', 'días remotos')} por semana y los martes en oficina. Ir más días a la oficina siempre está permitido.</p>`;
}

function renderEditbar(){
  const bar = document.getElementById('editbar');
  const n = pendingCount();
  bar.classList.toggle('show', state.editing);
  if (!state.editing){ bar.innerHTML = ''; return; }
  const bad = invalidPendingWeeks();
  bar.innerHTML = `
    <div class="txt">${n ? `<span class="count">${n}</span> ${n === 1 ? 'cambio sin subir' : 'cambios sin subir'}` : 'Modo edición'}<small>${bad.length ? `${ic('alert-triangle')} Pasaste tus días remotos en ${plural(bad.length, 'semana', 'semanas')}` : n ? 'Tus compañeros los verán al subirlos' : 'Toca un día para cambiarlo'}</small></div>
    <button class="btn ghost" id="discardBtn">${n ? 'Descartar' : 'Salir'}</button>
    <button class="btn up" id="uploadBtn" ${n ? '' : 'disabled'}>${ic('upload')} Subir</button>`;
  document.getElementById('discardBtn').onclick = () => { state.pending = {}; state.editing = false; renderAll(); if (n) toast('Cambios descartados'); };
  document.getElementById('uploadBtn').onclick = upload;
}

function renderAll(){
  ensureVisibleRange();
  renderControls();
  renderSummary();
  state.view === 'team' ? renderTeam() : renderMine();
  renderThisWeek();
  renderFeed();
  renderDetails();
  renderEditbar();
}

/* ================= EDITOR DE DÍA ================= */
const editorDlg = document.getElementById('dayEditor');
let editing = null;
function openEditor(pid, dateStr){
  const d = parseYmd(dateStr), p = personById(pid), e = entry(pid, d);
  editing = { pid, date: dateStr, s: e.s === 'N' ? null : e.s, note: e.note };
  const locked = d.getDay() === DIA_OBLIGATORIO;
  const remoteOk = weekCheck(pid, mondayOf(d), { date: dateStr, s: 'R' }).ok;
  const rDisabled = locked || !remoteOk;
  document.getElementById('dayEditorBody').innerHTML = `
    <div class="modal-body">
      <div class="prof-head">${avatar(p)}<div><h3>${esc(p.name)}</h3><p class="hint" style="margin:0">${cap(DIAS_LARGO[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]}</p></div></div>
      <div class="opts" role="group" aria-label="Estado del día" style="margin-top:14px">
        ${EDITABLES.map(k => `<button type="button" class="opt ${k}" data-s="${k}" aria-pressed="${editing.s === k}" ${k === 'R' && rDisabled ? 'disabled' : ''}><span class="e">${ESTADOS[k].icon}</span>${ESTADOS[k].label}</button>`).join('')}
      </div>
      ${locked ? `<div class="lock-note">${ic('lock')} ${MENSAJE_BLOQUEO}. Puedes marcar oficina o cualquier ausencia, pero no remoto.</div>`
        : !remoteOk ? `<div class="lock-note">${ic('home')} Pasaste tus días remotos: esta semana ya tienes ${plural(REMOTO_POR_SEMANA, 'día remoto', 'días remotos')}. Para usar este día, primero pasa otro día a oficina.</div>` : ''}
      <div class="field">
        <label for="noteInput">Nota (opcional)</label>
        <input id="noteInput" type="text" maxlength="80" placeholder="Ej. trámite personal por la mañana" value="${esc(e.s === 'N' ? '' : e.note)}">
        <div class="quick">${NOTAS_RAPIDAS.map(n => `<button type="button" data-note="${esc(n)}">${esc(n)}</button>`).join('')}</div>
      </div>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn" id="edCancel">Cancelar</button>
      <button type="button" class="btn primary" id="edApply" ${editing.s ? '' : 'disabled'}>Aplicar</button>
    </div>`;
  const body = document.getElementById('dayEditorBody');
  body.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    editing.s = b.dataset.s;
    body.querySelectorAll('.opt').forEach(x => x.setAttribute('aria-pressed', x === b));
    body.querySelector('#edApply').disabled = false;
  });
  const input = body.querySelector('#noteInput');
  body.querySelectorAll('[data-note]').forEach(b => b.onclick = () => { input.value = b.dataset.note; input.focus(); });
  body.querySelector('#edCancel').onclick = () => editorDlg.close();
  body.querySelector('#edApply').onclick = () => { editing.note = input.value.trim(); applyEdit(); editorDlg.close(); };
  input.onkeydown = ev => { if (ev.key === 'Enter' && editing.s){ ev.preventDefault(); body.querySelector('#edApply').click(); } };
  openDlg(editorDlg);
}
function applyEdit(){
  const { pid, date } = editing;
  const d = parseYmd(date);
  const next = normalize({ s: editing.s, note: editing.note }, d);
  const key = pid + '|' + date;
  if (sameEntry(next, committedEntry(pid, d))) delete state.pending[key];
  else state.pending[key] = next;
  renderAll();
  document.querySelectorAll(`[data-pid="${pid}"][data-date="${date}"]`).forEach(b => b.classList.add('pop'));
}

/* ================= SUBIR CAMBIOS ================= */
async function upload(){
  const bad = invalidPendingWeeks();
  if (bad.length){
    const b = bad[0];
    setWeek(b.mon); renderAll();
    toast(`${personById(b.pid)?.name || ''}: pasaste tus días remotos la semana del ${b.mon.getDate()} ${MESES[b.mon.getMonth()].slice(0,3)} (máximo ${b.w.tR}).`);
    return;
  }
  const changes = [];
  for (const key of Object.keys(state.pending)){
    const [pid, date] = key.split('|');
    const d = parseYmd(date);
    if (!canEdit(pid, d).ok) continue;
    const from = committedEntry(pid, d), to = normalize(state.pending[key], d);
    if (!sameEntry(from, to)) changes.push({ pid, date, from, to });
  }
  if (!changes.length){ state.pending = {}; state.editing = false; renderAll(); return; }
  changes.sort((a, b) => a.date.localeCompare(b.date));
  const btn = document.getElementById('uploadBtn');
  if (btn){ btn.disabled = true; btn.textContent = 'Subiendo…'; }
  try {
    if (state.mode === 'live' && sb){
      const rows = changes.map(c => ({ person_id: c.pid, day: c.date, status: c.to.s, note: c.to.note || '', updated_by: state.me, updated_at: new Date().toISOString() }));
      const { error: e1 } = await sb.from('schedule').upsert(rows, { onConflict: 'person_id,day' });
      if (e1) throw e1;
      const { error: e2 } = await sb.from('activity').insert({ author: state.me, changes });
      if (e2) throw e2;
    } else {
      state.activity.unshift({ id: 'a' + Date.now(), at: Date.now(), author: state.me, changes });
    }
    changes.forEach(c => { (state.days[c.pid] ||= {})[c.date] = { s: c.to.s, note: c.to.note }; });
    state.pending = {}; state.editing = false;
    renderAll();
    toast(cap(plural(changes.length, 'cambio subido', 'cambios subidos')));
  } catch (err) {
    console.error(err);
    if (btn){ btn.disabled = false; btn.innerHTML = `${ic('upload')} Subir`; }
    toast('No se pudieron subir los cambios. Revisa tu conexión e intenta de nuevo.');
  }
}

/* ================= AVATAR PICKER ================= */
function pickerHTML(a, name){
  return `<div class="av-picker">
    <p class="av-label">Color de la inicial</p>
    <div class="av-colors">${AVATARES.map(([bg, fg], c) => `<button type="button" class="sw" data-color="${c}" style="background:${bg};border-color:${fg}" aria-pressed="${a.color === c}" aria-label="Color ${c + 1}"></button>`).join('')}</div>
    <p class="av-label">Elige un avatar</p>
    <div class="av-grid">
      <button type="button" class="il letter" data-icon="" aria-pressed="${!a.icon}" title="Usar la inicial" aria-label="Usar la inicial" style="background:${AVATARES[a.color][0]};color:${AVATARES[a.color][1]}">${esc(((name || '?').trim()[0] || '?').toUpperCase())}</button>
      ${ILUSTRACIONES.map(([id, label]) => `<button type="button" class="il" data-icon="ilus:${id}" aria-pressed="${a.icon === 'ilus:' + id}" title="${label}" aria-label="${label}"><img src="${ilusSrc('ilus:' + id)}" alt="" loading="lazy"></button>`).join('')}
    </div>
  </div>`;
}

/* ================= PERFIL ================= */
const profileDlg = document.getElementById('profileDlg');
let profDraft = null, profPicker = false;
function paintProfile(){
  const p = personById(state.me);
  const body = document.getElementById('profileBody');
  body.innerHTML = `
    <div class="prof-head">
      <button type="button" class="av-btn" id="profAv" aria-expanded="${profPicker}" title="Cambiar avatar">${avatar({ ...p, name: profDraft.name }, profDraft.avatar)}<span class="av-edit">✎</span></button>
      <div><h3>Mi perfil</h3><p class="hint" style="margin:0">${esc(p.email || '')}</p></div>
    </div>
    ${profPicker ? pickerHTML(profDraft.avatar, profDraft.name) : ''}
    <div class="field"><label for="profName">Nombre</label><input id="profName" maxlength="30" value="${esc(profDraft.name)}"></div>
    <div class="field"><label for="profUser">Usuario</label><input id="profUser" maxlength="20" autocapitalize="none" spellcheck="false" value="${esc(profDraft.username)}"><small>Para entrar sin escribir tu correo. Solo minúsculas, números, punto o guion.</small></div>
    <button type="button" class="btn primary" id="profSave" style="margin-top:14px;width:100%">Guardar perfil</button>
    <hr class="sep">
    <div class="field"><label for="profPass">Cambiar contraseña</label><input id="profPass" type="password" minlength="6" placeholder="Nueva contraseña (mínimo 6 caracteres)" autocomplete="new-password"></div>
    <button type="button" class="btn" id="profPassBtn" style="margin-top:10px;width:100%">Guardar contraseña</button>`;
  const keep = () => { profDraft.name = body.querySelector('#profName').value; profDraft.username = body.querySelector('#profUser').value; };
  body.querySelector('#profAv').onclick = () => { keep(); profPicker = !profPicker; paintProfile(); };
  body.querySelectorAll('[data-color]').forEach(b => b.onclick = () => { keep(); profDraft.avatar.color = +b.dataset.color; paintProfile(); });
  body.querySelectorAll('[data-icon]').forEach(b => b.onclick = () => { keep(); profDraft.avatar.icon = b.dataset.icon; paintProfile(); });
  body.querySelector('#profSave').onclick = async () => {
    keep();
    const name = profDraft.name.trim(), username = profDraft.username.trim().toLowerCase();
    if (!name){ toast('Escribe tu nombre.'); return; }
    if (username && !/^[a-z0-9._-]{3,20}$/.test(username)){ toast('Usuario: 3 a 20 caracteres, solo minúsculas, números, punto o guion.'); return; }
    const ok = await savePerson(state.me, { name, username: username || null, avatar: profDraft.avatar });
    if (ok){ profileDlg.close(); toast('Perfil guardado'); }
  };
  body.querySelector('#profPassBtn').onclick = async () => {
    const v = body.querySelector('#profPass').value;
    if (v.length < 6){ toast('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (state.mode !== 'live'){ toast('Disponible cuando estés conectado.'); return; }
    const { error } = await sb.auth.updateUser({ password: v });
    if (error) toast('No se pudo cambiar la contraseña.');
    else { body.querySelector('#profPass').value = ''; toast('Contraseña actualizada'); }
  };
}
async function savePerson(id, { name, username, avatar: av }){
  const i = state.people.findIndex(p => p.id === id);
  const clean = cleanAvatar(av, i);
  if (state.mode === 'live' && sb){
    const { error } = await sb.from('people').update({ name, username, avatar_icon: clean.icon, avatar_color: clean.color }).eq('id', id);
    if (error){
      toast(error.code === '23505' ? `El usuario "${username}" ya está en uso.` : 'No se pudo guardar. Intenta de nuevo.');
      return false;
    }
  }
  Object.assign(state.people[i], { name, username, avatar: clean });
  renderAll();
  return true;
}
document.querySelectorAll('.js-me').forEach(b => b.onclick = () => {
  const p = personById(state.me); if (!p) return;
  profDraft = { name: p.name, username: p.username || '', avatar: { ...p.avatar } };
  profPicker = false; paintProfile(); openDlg(profileDlg);
});
document.getElementById('profileClose').onclick = () => profileDlg.close();
document.getElementById('logoutBtn').onclick = async () => {
  if (state.mode === 'live' && sb){ await sb.auth.signOut(); location.reload(); }
  else { profileDlg.close(); toast('En modo de prueba no hay sesión.'); }
};

/* ================= ADMINISTRAR EQUIPO ================= */
const settingsDlg = document.getElementById('settingsDlg');
let admDraft = [], admOpen = -1;
function paintPending(){
  const box = document.getElementById('admPending');
  const list = state.pendingPeople;
  box.innerHTML = list.length ? `<p class="av-label">Solicitudes para unirse (${list.length})</p>${list.map(p => `
    <div class="pend-row">${avatar(p)}<div class="info"><b>${esc(p.name)}</b><small>${esc(p.username ? '@' + p.username + ' · ' : '')}${esc(p.email)}</small></div>
      <button type="button" class="btn" data-reject="${p.id}">Rechazar</button>
      <button type="button" class="btn primary" data-approve="${p.id}">Aprobar</button>
    </div>`).join('')}<hr class="sep" style="margin:14px 0">` : '';
  box.querySelectorAll('[data-approve]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { error } = await sb.rpc('approve_person', { pid: b.dataset.approve });
    if (error){ b.disabled = false; toast('No se pudo aprobar.'); return; }
    toast('Persona aprobada'); await loadPeople(); paintPending(); paintAdmin(); renderAll();
  });
  box.querySelectorAll('[data-reject]').forEach(b => b.onclick = async () => {
    if (!confirm('¿Rechazar esta solicitud?')) return;
    b.disabled = true;
    const { error } = await sb.rpc('reject_person', { pid: b.dataset.reject });
    if (error){ b.disabled = false; toast('No se pudo rechazar.'); return; }
    toast('Solicitud rechazada'); await loadPeople(); paintPending(); renderAll();
  });
}
function paintAdmin(){
  const box = document.getElementById('admList');
  box.querySelectorAll('[data-adm-name]').forEach(inp => { admDraft[+inp.dataset.admName].name = inp.value; });
  box.querySelectorAll('[data-adm-user]').forEach(inp => { admDraft[+inp.dataset.admUser].username = inp.value; });
  box.innerHTML = state.people.map((p, i) => {
    const d = admDraft[i];
    return `<div class="adm-row">
      <div class="adm-top">
        <button type="button" class="av-btn" data-adm-av="${i}" aria-expanded="${admOpen === i}" title="Cambiar avatar">${avatar({ ...p, name: d.name }, d.avatar)}<span class="av-edit">✎</span></button>
        <input data-adm-name="${i}" maxlength="30" value="${esc(d.name)}" aria-label="Nombre">
        <input class="user" data-adm-user="${i}" maxlength="20" value="${esc(d.username)}" placeholder="usuario" aria-label="Usuario" autocapitalize="none">
        ${p.id === state.me ? '' : `<button type="button" class="icon-btn rm" data-remove="${i}" title="Quitar del equipo" aria-label="Quitar a ${esc(p.name)} del equipo">${ic('trash')}</button>`}
      </div>
      ${admOpen === i ? pickerHTML(d.avatar, d.name) : ''}
    </div>`;
  }).join('');
  box.querySelectorAll('[data-adm-av]').forEach(b => b.onclick = () => { const i = +b.dataset.admAv; admOpen = admOpen === i ? -1 : i; paintAdmin(); });
  box.querySelectorAll('[data-remove]').forEach(b => b.onclick = async () => {
    const i = +b.dataset.remove, p = state.people[i];
    if (!confirm(`¿Quitar a ${p.name} del equipo?\n\nSe borrarán su cuenta y sus días del calendario. Si vuelve a registrarse, tendrás que aprobarlo de nuevo.`)) return;
    b.disabled = true;
    if (state.mode === 'live' && sb){
      const { error } = await sb.rpc('remove_person', { pid: p.id });
      if (error){ b.disabled = false; toast('No se pudo quitar a esta persona.'); return; }
      await loadPeople();
    } else {
      state.people.splice(i, 1);
    }
    delete state.days[p.id];
    admDraft.splice(i, 1); admOpen = -1;
    box.innerHTML = '';
    paintAdmin(); renderAll();
    toast(`${p.name} ya no está en el equipo`);
  });
  box.querySelectorAll('[data-color]').forEach(b => b.onclick = () => { admDraft[admOpen].avatar.color = +b.dataset.color; paintAdmin(); });
  box.querySelectorAll('[data-icon]').forEach(b => b.onclick = () => { admDraft[admOpen].avatar.icon = b.dataset.icon; paintAdmin(); });
}
document.querySelectorAll('.js-settings').forEach(b => b.onclick = () => {
  if (!state.isAdmin) return;
  admDraft = state.people.map(p => ({ name: p.name, username: p.username || '', avatar: { ...p.avatar } }));
  admOpen = -1;
  document.getElementById('admList').innerHTML = '';
  paintPending(); paintAdmin(); openDlg(settingsDlg);
});
document.getElementById('admCancel').onclick = () => settingsDlg.close();
document.getElementById('admSave').onclick = async () => {
  paintAdmin();
  for (let i = 0; i < state.people.length; i++){
    const d = admDraft[i], p = state.people[i];
    const name = d.name.trim() || p.name, username = d.username.trim().toLowerCase();
    if (username && !/^[a-z0-9._-]{3,20}$/.test(username)){ toast(`Usuario inválido para ${name}.`); return; }
    const changed = name !== p.name || (username || '') !== (p.username || '') || d.avatar.icon !== p.avatar.icon || d.avatar.color !== p.avatar.color;
    if (changed && !(await savePerson(p.id, { name, username: username || null, avatar: d.avatar }))) return;
  }
  settingsDlg.close(); toast('Equipo guardado');
};

/* ================= EVENTOS ================= */
document.addEventListener('click', e => {
  const b = e.target.closest('.cell[data-pid], .day-row[data-pid]');
  if (!b) return;
  const d = parseYmd(b.dataset.date);
  const ce = canEdit(b.dataset.pid, d);
  if (!ce.ok){
    const en = entry(b.dataset.pid, d);
    toast(en.note && en.s !== 'F' ? `Nota: ${en.note}` : ce.why);
    return;
  }
  if (!state.editing){ state.editing = true; renderAll(); }
  openEditor(b.dataset.pid, b.dataset.date);
});
function goMonth(delta){
  let m = state.month + delta, y = state.year;
  if (m < 0){ m = 11; y--; } else if (m > 11){ m = 0; y++; }
  if (y < AÑO_INICIO || y > AÑO_FIN) return;
  setMonth(y, m); renderAll();
}
document.getElementById('prev').onclick = () => goMonth(-1);
document.getElementById('next').onclick = () => goMonth(1);
document.getElementById('monthSel').onchange = e => { setMonth(state.year, +e.target.value); renderAll(); };
document.getElementById('yearSel').onchange = e => { setMonth(+e.target.value, state.month); renderAll(); };
document.getElementById('todayBtn').onclick = () => { setWeek(currentWeekMonday()); renderAll(); };
document.getElementById('tabTeam').onclick = () => { state.view = 'team'; renderAll(); };
document.getElementById('tabMine').onclick = () => { state.view = 'mine'; renderAll(); };
document.getElementById('editBtn').onclick = () => { state.editing = true; renderAll(); toast('Toca un día para cambiarlo'); };
window.addEventListener('beforeunload', e => { if (pendingCount()){ e.preventDefault(); e.returnValue = ''; } });
let lastMobile = isMobile();
window.addEventListener('resize', () => { if (isMobile() !== lastMobile){ lastMobile = isMobile(); renderAll(); } });

/* ================= TEMA ================= */
const THEME_KEY = 'calendario-trabajo-tema';
function effectiveTheme(){
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function paintThemeBtn(){ document.querySelectorAll('.js-theme').forEach(b => b.innerHTML = ic(effectiveTheme() === 'dark' ? 'sun' : 'moon')); }
try { const t = localStorage.getItem(THEME_KEY); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch (e) {}
paintThemeBtn();
document.querySelectorAll('.js-theme').forEach(b => b.onclick = () => {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  paintThemeBtn();
});

/* ================= CONEXIÓN ================= */
let sb = null;
const loadedRanges = new Set();
const gate = document.getElementById('gate');

function goLocal(){
  state.mode = 'local';
  state.people = EQUIPO_DEMO.map((p, i) => ({ ...p, email: p.username + '@demo', avatar: cleanAvatar(null, i) }));
  state.me = 'p1'; state.isAdmin = true;
  renderAll();
}
function gateMode(mode){
  const M = {
    login:   ['Bienvenido de nuevo', 'Inicia sesión para ver tu semana.'],
    signup:  ['Crea tu cuenta', 'Únete al calendario de Tech Enablement.'],
    reset:   ['Recupera tu acceso', 'Te enviaremos un enlace a tu correo para crear una contraseña nueva.'],
    newpass: ['Crea una contraseña nueva', 'Escríbela dos veces para confirmarla.']
  };
  const pending = mode === 'pending';
  document.getElementById('gateIntro').hidden = pending;
  document.getElementById('gateTabs').hidden = !(mode === 'login' || mode === 'signup');
  if (M[mode]){ document.getElementById('gateTitle').textContent = M[mode][0]; document.getElementById('gateSub').textContent = M[mode][1]; }
  document.getElementById('gateForm').hidden = mode !== 'login';
  document.getElementById('googleBox').hidden = !(mode === 'login' || mode === 'signup');
  document.getElementById('signupForm').hidden = mode !== 'signup';
  document.getElementById('resetForm').hidden = mode !== 'reset';
  document.getElementById('newPassForm').hidden = mode !== 'newpass';
  document.getElementById('gatePending').hidden = !pending;
  document.getElementById('gtLogin').setAttribute('aria-selected', mode === 'login');
  document.getElementById('gtSignup').setAttribute('aria-selected', mode === 'signup');
}
function gateMsg(text, kind){
  const m = document.getElementById('gateMsg');
  m.hidden = !text; m.className = 'gate-msg ' + (kind || ''); m.textContent = text || '';
}
function showGate(kind, msg){
  gate.hidden = false;
  if (kind === 'pending' || kind === 'denied'){
    gateMode('pending');
    document.getElementById('gatePendingText').textContent = kind === 'pending'
      ? 'Tu cuenta está pendiente de activación. Esta pantalla se actualizará sola.'
      : 'Tu cuenta no está vinculada al equipo. Pídele ayuda al administrador.';
  } else gateMode(['signup','reset','newpass'].includes(kind) ? kind : 'login');
  gateMsg(msg, kind === 'denied' ? 'err' : '');
}
document.querySelectorAll('[data-eye]').forEach(b => b.onclick = () => {
  const inp = b.parentElement.querySelector('input');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  b.setAttribute('aria-pressed', show);
  b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
});
document.getElementById('googleBtn').onclick = async () => {
  if (!sb){ toast('Disponible cuando la app esté conectada.'); return; }
  const btn = document.getElementById('googleBtn');
  btn.disabled = true;
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } });
  if (error){ btn.disabled = false; gateMsg('No se pudo conectar con Google. Intenta de nuevo.', 'err'); }
};
document.getElementById('forgotBtn').onclick = () => {
  const v = document.getElementById('gateUser').value.trim();
  document.getElementById('rsUser').value = v;
  gateMode('reset'); gateMsg('');
};
document.getElementById('backLogin').onclick = () => { gateMode('login'); gateMsg(''); };
document.getElementById('resetForm').addEventListener('submit', async e => {
  e.preventDefault();
  const raw = document.getElementById('rsUser').value.trim().toLowerCase();
  const btn = document.getElementById('rsBtn');
  const done = () => { btn.disabled = false; btn.textContent = 'Enviar enlace'; };
  if (!raw){ gateMsg('Escribe tu correo o usuario.', 'err'); return; }
  btn.disabled = true; btn.textContent = 'Enviando…'; gateMsg('');
  let email = raw;
  if (!raw.includes('@')){
    const { data } = await sb.rpc('email_for_username', { u: raw });
    if (!data){ done(); gateMsg('No encontramos ese usuario. Prueba con tu correo.', 'err'); return; }
    email = data;
  }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  done();
  if (error){
    gateMsg(/rate|limit|seconds/i.test(error.message) ? 'Se enviaron muchos correos. Espera unos minutos e intenta de nuevo.' : 'No se pudo enviar el correo. Intenta de nuevo.', 'err');
    return;
  }
  const masked = email.replace(/^(.{2}).*(@.*)$/, '$1•••$2');
  gateMsg(`Listo. Revisa ${masked} (también en Spam) y abre el enlace para crear tu contraseña nueva.`, 'ok');
});
document.getElementById('newPassForm').addEventListener('submit', async e => {
  e.preventDefault();
  const a = document.getElementById('npPass').value, b = document.getElementById('npPass2').value;
  const btn = document.getElementById('npBtn');
  if (a.length < 6){ gateMsg('La contraseña debe tener al menos 6 caracteres.', 'err'); return; }
  if (a !== b){ gateMsg('Las contraseñas no coinciden.', 'err'); return; }
  btn.disabled = true; btn.textContent = 'Guardando…'; gateMsg('');
  const { error } = await sb.auth.updateUser({ password: a });
  btn.disabled = false; btn.textContent = 'Guardar y entrar';
  if (error){ gateMsg('El enlace venció o ya se usó. Pide uno nuevo desde "¿Olvidaste tu contraseña?".', 'err'); return; }
  recovering = false;
  history.replaceState(null, '', location.pathname);
  const { data: { session } } = await sb.auth.getSession();
  toast('Contraseña actualizada');
  if (session) startLive(session); else showGate('login');
});
document.getElementById('gtLogin').onclick = () => { gateMode('login'); gateMsg(''); };
document.getElementById('gtSignup').onclick = () => { gateMode('signup'); gateMsg(''); };

document.getElementById('gateForm').addEventListener('submit', async e => {
  e.preventDefault();
  const raw = document.getElementById('gateUser').value.trim().toLowerCase();
  const password = document.getElementById('gatePass').value;
  const btn = document.getElementById('gateBtn');
  const fail = t => { gateMsg(t, 'err'); btn.disabled = false; btn.textContent = 'Iniciar sesión'; };
  if (!raw || !password) return fail('Escribe tu usuario o correo y tu contraseña.');
  btn.disabled = true; btn.textContent = 'Entrando…'; gateMsg('');
  let email = raw;
  if (!raw.includes('@')){
    const { data, error } = await sb.rpc('email_for_username', { u: raw });
    if (error || !data) return fail('Usuario o contraseña incorrectos.');
    email = data;
  }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return fail(/confirm/i.test(error.message) ? 'Tu correo aún no está confirmado.' : /invalid/i.test(error.message) ? 'Usuario o contraseña incorrectos.' : 'No se pudo iniciar sesión. Intenta de nuevo.');
  btn.disabled = false; btn.textContent = 'Iniciar sesión';
});

document.getElementById('signupForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('suName').value.trim();
  const username = document.getElementById('suUser').value.trim().toLowerCase();
  const email = document.getElementById('suEmail').value.trim().toLowerCase();
  const password = document.getElementById('suPass').value;
  const btn = document.getElementById('suBtn');
  const fail = t => { gateMsg(t, 'err'); btn.disabled = false; btn.textContent = 'Crear cuenta'; };
  if (!name) return fail('Escribe tu nombre.');
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Escribe un correo válido.');
  if (!/^[a-z0-9._-]{3,20}$/.test(username)) return fail('Usuario: 3 a 20 caracteres, solo minúsculas, números, punto o guion.');
  if (password.length < 6) return fail('La contraseña debe tener al menos 6 caracteres.');
  btn.disabled = true; btn.textContent = 'Creando…'; gateMsg('');
  const { data: free } = await sb.rpc('username_available', { u: username, mail: email });
  if (free === false) return fail(`El usuario "${username}" ya está en uso. Prueba otro.`);
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name, username } } });
  if (error) return fail(/registered|exists/i.test(error.message) ? 'Ese correo ya tiene cuenta. Usa "Entrar".' : 'No se pudo crear la cuenta. Intenta de nuevo.');
  btn.disabled = false; btn.textContent = 'Crear cuenta';
  if (!data.session){ gateMode('login'); gateMsg('Cuenta creada. Revisa tu correo para confirmarla y luego entra.', 'ok'); }
});
document.getElementById('gateOut').onclick = async () => { await sb.auth.signOut(); location.reload(); };
document.getElementById('gateRetry').onclick = () => location.reload();

function rowToPerson(r, i){ return { id: r.id, name: r.name, email: r.email, username: r.username || '', is_admin: !!r.is_admin, approved: r.approved !== false, avatar: cleanAvatar({ icon: r.avatar_icon, color: r.avatar_color }, i) }; }
function rowToDay(r){ (state.days[r.person_id] ||= {})[r.day] = { s: r.status, note: r.note || '' }; }
function rowToAct(r){ return { id: String(r.id), at: Date.parse(r.at), author: r.author, changes: r.changes || [] }; }

async function loadPeople(){
  const { data, error } = await sb.from('people').select('*').order('sort').order('id');
  if (error) throw error;
  const all = (data || []).map(rowToPerson);
  state.allPeople = all;
  state.people = all.filter(p => p.approved);
  state.pendingPeople = all.filter(p => !p.approved);
}
async function loadRange(from, to){
  const key = ymd(from) + '_' + ymd(to);
  if (loadedRanges.has(key)) return;
  loadedRanges.add(key);
  const { data, error } = await sb.from('schedule').select('person_id,day,status,note').gte('day', ymd(from)).lte('day', ymd(to)).limit(5000);
  if (error){ loadedRanges.delete(key); return; }
  (data || []).forEach(rowToDay);
  renderAll();
}
function ensureVisibleRange(){
  if (state.mode !== 'live' || !sb) return;
  loadRange(addDays(new Date(state.year, state.month, 1), -7), addDays(new Date(state.year, state.month + 1, 0), 7));
  if (state.weekStart) loadRange(addDays(state.weekStart, -1), addDays(state.weekStart, 6));
}
async function loadActivity(){
  const { data } = await sb.from('activity').select('*').order('at', { ascending: false }).limit(MAX_ACTIVIDAD);
  state.activity = (data || []).map(rowToAct);
}
let liveStarting = false;
async function startLive(session){
  if (liveStarting || state.mode === 'live') return;
  liveStarting = true;
  const email = (session.user.email || '').toLowerCase();
  try { await loadPeople(); } catch (e) { showGate('denied', 'No se pudo leer el equipo.'); return; }
  const me = (state.allPeople || []).find(p => (p.email || '').toLowerCase() === email);
  if (!me){ showGate('denied', `No encontramos ${email} en el equipo.`); return; }
  if (!me.approved){
    showGate('pending');
    sb.channel('espera').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'people' }, ({ new: n }) => {
      if (n && (n.email || '').toLowerCase() === email && n.approved) location.reload();
    }).subscribe();
    return;
  }
  gate.hidden = true;
  state.mode = 'live';
  state.me = me.id; state.isAdmin = me.is_admin; state.view = 'mine';
  const t = hoyReal();
  await Promise.all([ loadRange(addDays(t, -40), addDays(t, 110)), loadActivity() ]);
  renderAll();
  sb.channel('calendario')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule' }, ({ eventType, new: n, old: o }) => {
      if (eventType === 'DELETE'){ if (o && state.days[o.person_id]) delete state.days[o.person_id][o.day]; }
      else rowToDay(n);
      Object.keys(state.pending).forEach(k => {
        const [pid, date] = k.split('|');
        if (sameEntry(normalize(state.pending[k], parseYmd(date)), committedEntry(pid, parseYmd(date)))) delete state.pending[k];
      });
      renderAll();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity' }, ({ new: n }) => {
      if (!state.activity.some(a => a.id === String(n.id))) state.activity.unshift(rowToAct(n));
      state.activity = state.activity.slice(0, MAX_ACTIVIDAD);
      renderAll();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'activity' }, ({ old: o }) => {
      state.activity = state.activity.filter(a => a.id !== String(o.id)); renderAll();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'people' }, async () => {
      await loadPeople();
      const meNow = personById(state.me);
      if (!meNow){ await sb.auth.signOut(); location.reload(); return; }
      state.isAdmin = meNow.is_admin;
      renderAll();
    })
    .subscribe();
}
let recovering = /type=recovery/.test(location.hash + location.search);
async function connect(){
  const configured = SUPABASE_URL && SUPABASE_KEY && window.supabase;
  // ?demo en la dirección abre el modo de prueba sin tocar la base de datos
  if (!configured || new URLSearchParams(location.search).has('demo')){ goLocal(); return; }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let starting = false;
  sb.auth.onAuthStateChange((evt, s) => {
    if (evt === 'PASSWORD_RECOVERY'){ recovering = true; showGate('newpass'); return; }
    if (evt === 'SIGNED_IN' && s && !recovering && state.mode !== 'live' && !starting){ starting = true; setTimeout(() => startLive(s).finally(() => { starting = false; }), 300); }
  });
  const { data: { session } } = await sb.auth.getSession();
  if (recovering){ showGate('newpass'); return; }
  if (session) startLive(session); else showGate('login');
}

/* ================= INICIO ================= */
// Íconos de los elementos fijos del HTML (data-ico="nombre")
document.querySelectorAll('[data-ico]').forEach(el => el.insertAdjacentHTML('afterbegin', ic(el.dataset.ico)));
setWeek(currentWeekMonday());
connect();
setInterval(renderFeed, 60000);
