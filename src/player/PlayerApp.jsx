import { testSummary, fmtNum, testValue, PLANS, money, commitment, wellLevel, setPlans, feeLabel, payCover, feeSuffix } from '../lib/domain.js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, q, PLATFORM, fetchAll } from '../lib/supabase.js';
import { applyBrand } from '../App.jsx';
import { useClub, clubDay, matchText } from '../lib/club.js';
import ClubEditor from '../ui/ClubEditor.jsx';
import TestRadar from '../ui/TestRadar.jsx';
import { ThemePicker, Group, Row, PasswordForm, DeleteAccount, LegalRows, AppVersion } from '../ui/SettingsKit.jsx';
import PlanCard from '../ui/PlanCard.jsx';
import { iso, addDays, mondayOf, dow, DAYS, fmtDate, wellness, waURL, parseISO } from '../lib/util.js';
import { sessionsOfWeek, calendarWeekIdx, totalWeeks, label } from '../lib/program.js';
import { useAction, Tabs, Empty, Loading, Bars, Line, WAIcon } from '../ui/ui.jsx';

const ITEMS = [
  ['sleep', 'Sueño', 'Muy mal', 'Muy bien'],
  ['fatigue', 'Energía', 'Agotado', 'Muy fresco'],
  ['soreness', 'Agujetas / dolor muscular', 'Mucho', 'Nada'],
  ['stress', 'Estrés', 'Mucho', 'Nada'],
  ['mood', 'Ánimo', 'Muy bajo', 'Muy alto'],
];

export default function PlayerApp({ player, session, onLogout, canSwitch, onSwitch }) {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState(() => { try { return sessionStorage.getItem('ptab') || 'hoy'; } catch { return 'hoy'; } });
  const act = useAction();
  const club = useClub(player.id);

  const load = useCallback(async () => {
    const since = iso(addDays(new Date(), -90));
    const soft = (b) => b.then(({ data }) => data || []);
    const [coach, programs, checkins, logs, exercises, tests, payments, weekNotes, plans] = await Promise.all([
      q(supabase.from('coaches').select('*').eq('id', player.coach_id).limit(1)).then((r) => r[0] || null),
      q(supabase.from('programs').select('*').eq('player_id', player.id).order('start_date', { ascending: false })),
      q(supabase.from('checkins').select('*').eq('player_id', player.id).gte('date', since).order('date')),
      q(supabase.from('session_logs').select('*').eq('player_id', player.id).gte('date', since).order('date')),
      fetchAll(() => supabase.from('exercises').select('name,video_url,notes').order('id')),
      soft(supabase.from('tests').select('*').eq('player_id', player.id).order('date').order('created_at')),
      soft(supabase.from('payments').select('*').eq('player_id', player.id)),
      soft(supabase.from('week_notes').select('*').eq('player_id', player.id).order('week', { ascending: false }).limit(4)),
      soft(supabase.from('plans').select('*').eq('coach_id', player.coach_id)),
    ]);
    setPlans(plans);
    setD({ coach, programs, checkins, logs, exercises, tests, payments, weekNotes, plans });
  }, [player.id, player.coach_id]);

  useEffect(() => { act(load); }, [load]);
  useEffect(() => { if (d?.coach) { applyBrand(d.coach.color); document.title = d.coach.brand_short || d.coach.brand_name; } }, [d?.coach]);
  const setT = (t) => { setTab(t); try { sessionStorage.setItem('ptab', t); } catch {} window.scrollTo(0, 0); };

  if (!d) return <Loading />;
  const today = iso();
  // Programa vigente: el más reciente que ya ha empezado; si no, el próximo
  const prog = d.programs.find((p) => p.start_date && p.start_date <= today) || d.programs[d.programs.length - 1] || null;
  // Entrenamiento personal: sin club, partidos ni RPE del club
  const team = player.kind !== 'personal';
  const ctx = { ...d, player, prog, load, today, team, club: team ? club : { ...club, schedule: null, events: [] } };
  const doneToday = d.checkins.some((c) => c.date === today);

  return (
    <div>
      <header className="topbar" style={{ display: 'flex' }}>
        <div className="brand">
          {d.coach?.logo ? <img src={d.coach.logo} alt="" /> : <span className="logo">{(d.coach?.brand_short || d.coach?.brand_name || 'R').slice(0, 2)}</span>}
          <div><b>{d.coach?.brand_name}</b><div className="small muted">{greet()}, {player.name.split(' ')[0]}</div></div>
        </div>
        <button className="btn sm" aria-pressed={tab === 'cuenta'} onClick={() => setT(tab === 'cuenta' ? 'hoy' : 'cuenta')}>{tab === 'cuenta' ? 'Volver' : 'Ajustes'}</button>
      </header>
      <div className="pwrap">
        <div className="pdate">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        {tab === 'checkin' && <Checkin ctx={ctx} onDone={() => setT('hoy')} />}
        {tab === 'hoy' && <Today ctx={ctx} goCheckin={() => setT('checkin')} />}
        {tab === 'semana' && <Week ctx={ctx} />}
        {tab === 'progreso' && <Progress ctx={ctx} />}
        {tab === 'planes' && <Plans ctx={ctx} />}
        {tab === 'cuenta' && <Account ctx={ctx} session={session} onLogout={onLogout} canSwitch={canSwitch} onSwitch={onSwitch} />}
        <Footer coach={d.coach} />
      </div>
      {tab !== 'cuenta' && (
        <nav className="ptabs" role="tablist" aria-label="Secciones">
          {[['checkin', 'Check-in'], ['semana', 'Semana'], ['hoy', 'Hoy'], ['progreso', 'Progreso'], ['planes', 'Planes']].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setT(k)} className={(k === 'hoy' ? 'mid ' : '') + (k === 'checkin' && !doneToday ? 'due' : '')}>
              <span aria-hidden="true" className="ic"><TabIcon k={k} done={doneToday} /></span><span className="lbl">{l}</span>
            </button>
          ))}
        </nav>
      )}
      <RestTimer />
    </div>
  );
}

const PLATFORM_IG = 'rendimo.app';
const igURL = (h) => `https://www.instagram.com/${String(h || '').replace(/^@/, '').trim()}/`;
const IGIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM12 2.8c2.5 0 2.8 0 3.8.1 2.5.1 3.7 1.3 3.8 3.8.1 1 .1 1.3.1 3.8s0 2.8-.1 3.8c-.1 2.5-1.3 3.7-3.8 3.8-1 .1-1.3.1-3.8.1s-2.8 0-3.8-.1c-2.5-.1-3.7-1.3-3.8-3.8-.1-1-.1-1.3-.1-3.8s0-2.8.1-3.8C4.5 4.2 5.7 3 8.2 2.9c1-.1 1.3-.1 3.8-.1ZM12 1c-2.6 0-2.9 0-3.9.1C4.6 1.2 2.6 3.2 2.5 6.7 2.4 7.7 2.4 8 2.4 12s0 4.3.1 5.3c.1 3.5 2.1 5.5 5.6 5.6 1 .1 1.3.1 3.9.1s2.9 0 3.9-.1c3.5-.1 5.5-2.1 5.6-5.6.1-1 .1-1.3.1-5.3s0-4.3-.1-5.3c-.1-3.5-2.1-5.5-5.6-5.6C14.9 1 14.6 1 12 1Z"/></svg>
);

// Pie de página: redes del entrenador y de la plataforma
function Footer({ coach }) {
  const ig = coach?.instagram?.replace(/^@/, '').trim();
  return (
    <footer className="pfoot">
      {ig && (
        <a href={igURL(ig)} target="_blank" rel="noopener"><IGIcon /> @{ig}</a>
      )}
      <a href={igURL(PLATFORM_IG)} target="_blank" rel="noopener" className="muted"><IGIcon /> Con {PLATFORM} · @{PLATFORM_IG}</a>
    </footer>
  );
}

// Ajustes del cliente: agrupados como en los ajustes del móvil
function Account({ ctx, session, onLogout, canSwitch, onSwitch }) {
  const { player, coach, checkins, logs } = ctx;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installed = window.matchMedia?.('(display-mode: standalone)').matches;
  const first = player.name.split(' ')[0];
  const coachName = coach?.brand_name || 'tu entrenador';
  const askCopy = waURL(coach?.whatsapp, `Hola, soy ${player.name}. Quería pedir una copia de los datos que guardas de mí en la app.`);
  return (
    <div className="setpage">
      <div><h2>Ajustes</h2><p className="muted">Tu cuenta, cómo se ve la app y tus datos.</p></div>
      <ThemePicker />
      <Group title="Lo tuyo">
        <Row icon="user" label="Mis datos" sub={player.plan || undefined}>
          <dl className="kv">
            <dt>Nombre</dt><dd>{player.name}</dd>
            <dt>Correo</dt><dd>{player.email || session.user.email}</dd>
            {player.position && <><dt>Posición o deporte</dt><dd>{player.position}</dd></>}
            {player.plan && <><dt>Plan</dt><dd>{player.plan}</dd></>}
            {payState(ctx) && <><dt>Pago</dt><dd><span className={'pill ' + (payState(ctx).paid ? 'ok' : 'bad')}>{payState(ctx).text}</span></dd></>}
            <dt>Con {coachName} desde</dt><dd>{fmtDate(player.start_date)}</dd>
            <dt>Check-ins (90 días)</dt><dd className="num">{checkins.length}</dd>
            <dt>Sesiones registradas</dt><dd className="num">{logs.length}</dd>
          </dl>
          <p className="muted small">Algún dato mal? Díselo a tu entrenador y lo corrige.</p>
        </Row>
        <Row icon="chat" label="Mi entrenador" sub={coachName}>
          <div className="row">
            {coach?.whatsapp && <a className="btn pri" target="_blank" rel="noopener" href={waURL(coach.whatsapp, `Hola, soy ${first}. `)}><WAIcon /> Escribir por WhatsApp</a>}
            {coach?.instagram && <a className="btn" target="_blank" rel="noopener" href={igURL(coach.instagram)}><IGIcon /> @{coach.instagram.replace(/^@/, '')}</a>}
          </div>
        </Row>
        {!installed && (
          <Row icon="phone" label="Tener la app en el móvil">
            <p className="small">Añádela a tu pantalla de inicio y se abre como una app normal.</p>
            {isIOS
              ? <ol className="small" style={{ margin: 0, paddingLeft: 20 }}><li>Abre esta página en <b>Safari</b>.</li><li>Pulsa <b>Compartir</b> (cuadrado con flecha).</li><li>Elige <b>Añadir a pantalla de inicio</b>.</li></ol>
              : <ol className="small" style={{ margin: 0, paddingLeft: 20 }}><li>Abre esta página en <b>Chrome</b>.</li><li>Pulsa el menú <b>⋮</b> arriba a la derecha.</li><li>Elige <b>Instalar app</b> o <b>Añadir a pantalla de inicio</b>.</li></ol>}
          </Row>
        )}
      </Group>
      <Group title="Seguridad">
        <Row icon="lock" label="Contraseña" sub="Crear o cambiar"><PasswordForm session={session} /></Row>
      </Group>
      <Group title="Privacidad">
        <Row icon="data" label="Qué datos se guardan">
          <p className="small">Consentimiento aceptado el <b>{fmtDate(player.consent_at)}</b>. Solo {coachName} ve tus datos, guardados en servidores de la Unión Europea.</p>
          <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>
            <li>Contacto y plan: nombre, correo, teléfono, posición o deporte.</li>
            <li>Entrenamiento: programas, sesiones hechas, cargas, RPE y duración.</li>
            <li>Bienestar diario: sueño, energía, agujetas, estrés, ánimo y dolor.</li>
            <li>Salud: lesiones, antecedentes e informes que compartas con tu entrenador.</li>
          </ul>
          {coach?.whatsapp && <a className="btn sm" style={{ justifySelf: 'start' }} target="_blank" rel="noopener" href={askCopy}>Pedir una copia de mis datos</a>}
        </Row>
        <LegalRows extra={<Row icon="trash" label="Borrar mi cuenta" danger><DeleteAccount /></Row>} />
      </Group>
      <Group title="Sesión">
        {canSwitch && <Row icon="swap" label="Ir a mi panel de entrenador" onClick={onSwitch} />}
        <Row icon="logout" label="Cerrar sesión" danger onClick={onLogout} />
      </Group>
      <AppVersion email={session.user.email} />
    </div>
  );
}

// Escala de colores: en bienestar 1 rojo → 5 verde; en dolor y RPE 0 verde → 10 rojo
function Scale({ value, onChange, n = 5, from = 1, name, pain }) {
  const hue = (v) => (pain ? 120 - (v / 10) * 120 : ((v - 1) / 4) * 120);
  return (
    <div className={'scale' + (n > 5 ? ' eleven' : '')} role="radiogroup" aria-label={name}>
      {Array.from({ length: n }, (_, i) => i + from).map((v) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} aria-pressed={value === v} onClick={() => onChange(v)}
          style={{ '--h': hue(v) }}>{v}</button>
      ))}
    </div>
  );
}

// Descanso: «90», «90 s», «2'», «2 min», «1'30», «1:30» → segundos
export const parseRest = (txt = '') => {
  const t = String(txt).toLowerCase().replace(',', '.').trim();
  let m = t.match(/(\d+)\s*[:']\s*(\d{1,2})/); if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = t.match(/(\d+(?:\.\d+)?)\s*(min|m\b|')/); if (m) return Math.round(Number(m[1]) * 60);
  m = t.match(/(\d+)/); return m ? Number(m[1]) : null;
};
const startRest = (sec) => window.dispatchEvent(new CustomEvent('rest:start', { detail: sec }));

// Temporizador de descanso fijo abajo
function RestTimer() {
  const [end, setEnd] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const on = (e) => { setEnd(Date.now() + e.detail * 1000); setNow(Date.now()); };
    window.addEventListener('rest:start', on);
    return () => window.removeEventListener('rest:start', on);
  }, []);
  useEffect(() => {
    if (!end) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= end) { clearInterval(t); try { navigator.vibrate?.([200, 100, 200]); } catch {} }
    }, 250);
    return () => clearInterval(t);
  }, [end]);
  if (!end) return null;
  const left = Math.max(0, Math.ceil((end - now) / 1000));
  return (
    <div className={'timer' + (left === 0 ? ' doneT' : '')} role="timer" aria-live="polite">
      <span>{left === 0 ? '¡A por la siguiente serie!' : 'Descanso'}</span>
      <b className="num">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</b>
      <span className="row">
        {left > 0 && <button type="button" className="btn sm" onClick={() => setEnd(end + 15000)}>+15 s</button>}
        <button type="button" className="btn sm" onClick={() => setEnd(null)}>{left === 0 ? 'Cerrar' : 'Saltar'}</button>
      </span>
    </div>
  );
}

const Hero = ({ color = 't-g', kicker, title, sub, children }) => (
  <section className={'hero tile ' + color}>
    {kicker && <span className="kick">{kicker}</span>}
    {title && <b className="htitle">{title}</b>}
    {sub && <span className="sub">{sub}</span>}
    {children}
  </section>
);

function Checkin({ ctx, onDone }) {
  const { checkins, today, player, load } = ctx;
  const act = useAction();
  const existing = checkins.find((c) => c.date === today);
  const [f, setF] = useState(existing || { sleep: null, fatigue: null, soreness: null, stress: null, mood: null, pain: 0, note: '' });
  const complete = ITEMS.every(([k]) => f[k]);
  const w = ITEMS.reduce((a, [k]) => a + (f[k] || 0), 0);
  const save = () => act(async () => {
    const { sleep, fatigue, soreness, stress, mood, pain, note } = f;
    await q(supabase.from('checkins').upsert({ player_id: player.id, date: today, sleep, fatigue, soreness, stress, mood, pain, note: note || null }, { onConflict: 'player_id,date' }));
    await load();
    onDone();
  }, '¡Gracias! Check-in guardado.');
  const lvl = complete ? wellLevel(w) : '';
  return (
    <div className="stack">
      <Hero color="t-p" kicker={existing ? 'Ya lo hiciste hoy · puedes cambiarlo' : '20 segundos'} title="¿Cómo estás hoy?" sub="1 es lo peor y 5 lo mejor. Con esto tu entrenador ajusta la sesión." />
      {ITEMS.map(([k, l, lo, hi]) => (
        <div key={k} className="panel stack" style={{ gap: 8 }}>
          <div className="between"><b>{l}</b><span className="muted small">1 {lo} · 5 {hi}</span></div>
          <Scale name={l} value={f[k]} onChange={(v) => setF({ ...f, [k]: v })} />
        </div>
      ))}
      <div className="panel stack" style={{ gap: 8 }}>
        <div className="between"><b>¿Tienes algún dolor o molestia?</b><span className="muted small">0 nada · 10 máximo</span></div>
        <Scale name="Dolor" n={11} from={0} value={f.pain} onChange={(v) => setF({ ...f, pain: v })} pain />
        {f.pain > 0 && <input placeholder="¿Dónde? Ej. isquio derecho al esprintar" value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} />}
      </div>
      <Hero color={lvl === 'bad' ? 't-r' : lvl === 'warn' ? 't-o' : 't-t'} kicker="Bienestar de hoy">
        <div className="big num">{complete ? w : '—'}<small>/25</small></div>
        <span className="sub">{!complete ? 'Responde las 5 preguntas.' : lvl === 'ok' ? 'Buen día para entrenar.' : 'Tu entrenador lo verá y puede ajustar la sesión.'}</span>
      </Hero>
      <button className="btn pri big-btn" disabled={!complete} onClick={save}>{existing ? 'Actualizar check-in' : 'Enviar check-in'}</button>
    </div>
  );
}

// Una sesión con sus bloques; permite registrar RPE y duración
function SessionCard({ ctx, s, open: startOpen, hero }) {
  const { prog, logs, player, load, exercises, today } = ctx;
  const log = logs.find((l) => l.session_key === s.id);
  const [open, setOpen] = useState(startOpen);
  const [done, setDone] = useState(() => Object.fromEntries((log?.sets || []).map((x) => [x.id, x])));
  const [rpe, setRpe] = useState(log?.rpe != null ? Number(log.rpe) : null);
  const [min, setMin] = useState(log?.duration_min || 60);
  const [note, setNote] = useState(log?.note || '');
  const act = useAction();
  const vid = useMemo(() => Object.fromEntries(exercises.map((e) => [e.name, e])), [exercises]);
  const save = () => act(async () => {
    const sets = Object.values(done);
    await q(supabase.from('session_logs').upsert({ player_id: player.id, program_id: prog.id, session_key: s.id, date: log?.date || today, rpe, duration_min: Number(min) || null, sets, note: note || null }, { onConflict: 'player_id,session_key,date' }));
    await load();
    setOpen(false);
  }, '¡Sesión registrada! Buen trabajo.');
  const title = s.name || 'Sesión';
  const nEx = s.packs.reduce((a, p) => a + p.items.filter((it) => it.exercise).length, 0);
  const nDone = Object.values(done).filter((x) => x.done).length;
  return (
    <div className="stack">
      {hero ? (
        <Hero color={log ? 't-t' : 't-g'} kicker={`${DAYS[s.day - 1]} · ${s.phase} · semana ${s.weekN}`} title={title} sub={`${nEx} ejercicio${nEx === 1 ? '' : 's'} · ${s.packs.length} bloque${s.packs.length === 1 ? '' : 's'}${log ? ` · hecha, RPE ${log.rpe}` : nDone ? ` · ${nDone}/${nEx} hechos` : ''}`}>
          {nEx > 0 && <div className="bars" aria-hidden="true"><i style={{ width: `${(nDone / nEx) * 100}%`, background: '#fff' }} /></div>}
          {!open && <button className="btn" onClick={() => setOpen(true)}>{log ? 'Ver o editar' : 'Empezar sesión'}</button>}
        </Hero>
      ) : (
        <div className="between">
          <div><b>{DAYS[s.day - 1]}{s.date ? ` ${Number(s.date.slice(8))}` : ''} · {title}</b><div className="muted small">{s.phase} · semana {s.weekN}</div></div>
          <span className="row">{log && <span className="pill ok">Hecha · RPE {log.rpe}</span>}<button className="btn sm" onClick={() => setOpen(!open)}>{open ? 'Cerrar' : log ? 'Ver o editar' : 'Ver'}</button></span>
        </div>
      )}
      {open && (
        <>
          {s.packs.map((p, k) => (
            <div key={p.id} className="block stack" style={{ gap: 8 }}>
              <div className="bhead"><span className="bl">{String.fromCharCode(65 + k)}</span><div><b>{p.type}</b>{p.rounds ? <span className="muted"> · {p.rounds} vueltas</span> : ''}{p.notes && <div className="small muted">{p.notes}</div>}</div></div>
              {p.items.filter((it) => it.exercise).map((it, j) => {
                const v = vid[it.exercise];
                const st = done[it.id] || { id: it.id, done: false, load: '' };
                const rest = parseRest(it.rest);
                return (
                  <div key={it.id} className={'exrow' + (st.done ? ' isdone' : '')}>
                    <span className="lb">{label(k, j)}</span>
                    <div className="stack" style={{ gap: 4 }}>
                      <div className="between">
                        <b>{it.exercise}</b>
                        <input type="checkbox" aria-label={'Hecho: ' + it.exercise} checked={!!st.done} onChange={(e) => setDone({ ...done, [it.id]: { ...st, done: e.target.checked } })} />
                      </div>
                      <div className="row">
                        {it.sets && <span className="pill brand">{it.sets} series</span>}
                        {it.reps && <span className="pill">{it.reps} reps</span>}
                        {it.load && <span className="pill">carga {it.load}</span>}
                      </div>
                      {it.notes && <span className="small muted">{it.notes}</span>}
                      {v?.notes && <details className="small"><summary>Cómo hacerlo</summary><p className="muted" style={{ whiteSpace: 'pre-line', marginTop: 4 }}>{v.notes.split('\nMás vídeos:')[0]}</p></details>}
                      <div className="row">
                        {v?.video_url && <a className="btn sm" href={v.video_url} target="_blank" rel="noopener">▶ Vídeo</a>}
                        {rest ? <button type="button" className="btn sm" onClick={() => startRest(rest)}>⏱ Descanso {it.rest}</button> : null}
                        <input style={{ width: 130 }} placeholder="Carga usada" aria-label={'Carga usada en ' + it.exercise} value={st.load || ''} onChange={(e) => setDone({ ...done, [it.id]: { ...st, load: e.target.value } })} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div className="panel stack" style={{ gap: 8 }}>
            <b>¿Qué tan dura ha sido la sesión? (RPE)</b>
            <span className="muted small">0 reposo · 5 dura · 7 muy dura · 10 máximo esfuerzo</span>
            <Scale name="RPE" n={11} from={0} value={rpe} onChange={setRpe} pain />
            <label className="f">Duración (minutos)<input type="number" min="1" max="600" value={min} onChange={(e) => setMin(e.target.value)} /></label>
            {rpe != null && <span className="small">Carga de la sesión: <b className="num">{rpe * (Number(min) || 0)}</b> (RPE × minutos)</span>}
            <label className="f">Comentario para tu entrenador (opcional)<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
            <button className="btn pri big-btn" disabled={rpe == null} onClick={save}>{log ? 'Actualizar registro' : 'Terminar y registrar sesión'}</button>
          </div>
        </>
      )}
    </div>
  );
}

function Today({ ctx, goCheckin }) {
  const { prog, today, checkins, player } = ctx;
  const doneCheck = checkins.some((c) => c.date === today);
  const nudge = !doneCheck && (
    <Hero color="t-o" kicker="Para la sesión de hoy" title="Haz tu check-in" sub="20 segundos para que tu entrenador sepa cómo llegas.">
      <button className="btn" onClick={goCheckin}>Hacer check-in</button>
    </Hero>
  );
  const top = <>{ctx.team && <ClubRPE ctx={ctx} />}{nudge}<WeekNote ctx={ctx} />{ctx.team && <ClubToday ctx={ctx} />}</>;
  const msg = (t, sub) => <div className="stack">{top}<Hero color="t-s" title={t} sub={sub} /></div>;
  if (!prog) return msg(`${greet()}, ${player.name.split(' ')[0]}`, 'Tu entrenador aún no te ha asignado un programa.');
  const w = calendarWeekIdx(prog);
  if (w == null) return msg(prog.name, 'Tu programa todavía no tiene fecha de inicio.');
  if (w < 0) return msg(prog.name, `Empieza el ${fmtDate(prog.start_date)}.`);
  if (w >= totalWeeks(prog.data)) return msg('¡Programa terminado!', `Has completado «${prog.name}». Tu entrenador te preparará lo siguiente.`);
  const ss = sessionsOfWeek(prog, w);
  const todays = ss.filter((s) => s.date === today);
  const next = ss.find((s) => s.date > today) || sessionsOfWeek(prog, w + 1)[0];
  return (
    <div className="stack">
      {top}
      {todays.length ? todays.map((s) => <SessionCard key={s.id} ctx={ctx} s={s} open={false} hero />) : (
        <Hero color="t-s" kicker={`${prog.name} · semana ${w + 1} de ${totalWeeks(prog.data)}`} title="Hoy toca descanso"
          sub={next ? `Próxima sesión: ${DAYS[next.day - 1].toLowerCase()} ${Number(next.date.slice(8))}${next.name ? ` · ${next.name}` : ''}.` : 'Recupera bien: sueño, comida e hidratación.'} />
      )}
    </div>
  );
}

function Week({ ctx }) {
  const { prog, logs, today } = ctx;
  const [off, setOff] = useState(0);
  const [openId, setOpenId] = useState(null);
  const [edit, setEdit] = useState(false);
  const clubBox = ctx.team && (
    <section className="panel stack">
      <div className="between"><h3>Mi club</h3><button className="btn sm" aria-expanded={edit} onClick={() => setEdit(!edit)}>{edit ? 'Cerrar' : 'Días de club y partidos'}</button></div>
      {!edit && <p className="muted small">Marca qué días entrenas con tu club y cuándo juegas: tu entrenador lo ve al prepararte las sesiones.</p>}
      {edit && (ctx.club.ready ? <ClubEditor playerId={ctx.player.id} club={ctx.club} who="player" /> : <span className="muted">Cargando…</span>)}
    </section>
  );
  if (!prog) return <div className="stack"><Hero color="t-s" title="Sin programa" sub="Tu entrenador aún no te ha asignado un programa." />{clubBox}</div>;
  const base = Math.max(0, calendarWeekIdx(prog) ?? 0);
  const w = Math.max(0, Math.min(totalWeeks(prog.data) - 1, base + off));
  const ss = sessionsOfWeek(prog, w);
  const wk = prog.data.phases.flatMap((ph) => ph.weeks)[w];
  const monday = ss[0]?.date ? addDays(parseISO(ss[0].date), 1 - ss[0].day) : null;
  return (
    <div className="stack">
      <Hero color="t-b" kicker={ss[0]?.phase || prog.name} title={`Semana ${w + 1}${wk?.name ? ' · ' + wk.name : ''}`} sub={`${ss.length} ${ss.length === 1 ? 'sesión' : 'sesiones'} · ${ss.filter((s) => logs.some((l) => l.session_key === s.id)).length} hecha${ss.filter((s) => logs.some((l) => l.session_key === s.id)).length === 1 ? '' : 's'}`}>
        <div className="row">
          <button className="btn sm" disabled={w === 0} onClick={() => setOff(off - 1)}>‹ Anterior</button>
          <button className="btn sm" disabled={w >= totalWeeks(prog.data) - 1} onClick={() => setOff(off + 1)}>Siguiente ›</button>
        </div>
      </Hero>
      {(() => { const ph = prog.data.phases.find((x) => x.weeks.some((y) => y.id === wk?.id)); return ph?.notes ? (
        <details className="panel"><summary style={{ cursor: 'pointer' }}><b>Objetivos de esta fase</b></summary><p className="small" style={{ whiteSpace: 'pre-line', marginTop: 8 }}>{ph.notes}</p></details>
      ) : null; })()}
      <div className="week">
        {Array.from({ length: 7 }, (_, i) => {
          const day = i + 1; const date = monday ? iso(addDays(monday, i)) : null;
          const list = ss.filter((s) => s.day === day);
          const club = date && logs.filter((l) => l.date === date && CLUB_KEYS[l.session_key]);
          const clubTxt = club?.length ? club.map((l) => `${CLUB_KEYS[l.session_key]} · RPE ${Number(l.rpe)}`).join(' · ') : '';
          const cd = date ? clubDay(date, ctx.club) : {};
          const tags = <>{cd.match && <span className="ctag match">{matchText(cd.match)}</span>}{cd.training && <span className="ctag club">Club{cd.time ? ' ' + cd.time : ''}</span>}{cd.md && <span className="ctag md">{cd.md}</span>}</>;
          if (!list.length) return <div key={day} className="day"><b>{DAYS[i].slice(0, 3).toUpperCase()}{date ? ` ${Number(date.slice(8))}` : ''}</b><span className="row" style={{ gap: 6 }}>{tags}<span className={clubTxt ? '' : 'muted'}>{clubTxt || (cd.match || cd.training ? '' : 'Descanso')}</span></span><span className={'chip' + (clubTxt ? ' ok' : '')}>{clubTxt ? 'Hecho' : '—'}</span></div>;
          return list.map((s) => {
            const done = logs.some((l) => l.session_key === s.id);
            const st = done ? ['Hecha', 'ok'] : s.date === today ? ['Hoy', 'warn'] : s.date < today ? ['Sin registrar', 'bad'] : ['Pendiente', ''];
            return (
              <div key={s.id} className="stack" style={{ gap: 0 }}>
                <button type="button" className="day" aria-expanded={openId === s.id} onClick={() => setOpenId(openId === s.id ? null : s.id)}>
                  <b>{DAYS[i].slice(0, 3).toUpperCase()}{date ? ` ${Number(date.slice(8))}` : ''}</b><span className="row" style={{ gap: 6 }}><span>{s.name || 'Sesión'}</span>{tags}{clubTxt && <span className="small muted">{clubTxt}</span>}</span><span className={'chip ' + st[1]}>{st[0]}</span>
                </button>
                {openId === s.id && <div style={{ padding: '10px 0' }}><SessionCard ctx={ctx} s={s} open /></div>}
              </div>
            );
          });
        })}
      </div>
      {clubBox}
    </div>
  );
}

function Progress({ ctx }) {
  const { logs, checkins, tests = [] } = ctx;
  const sums = testSummary(tests);
  const [sel, setSel] = useState('');
  const mon = mondayOf(new Date());
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const a = addDays(mon, -7 * (7 - i)); const b = addDays(a, 6);
    const ls = logs.filter((l) => l.date >= iso(a) && l.date <= iso(b));
    return { label: `${a.getDate()}/${a.getMonth() + 1}`, value: ls.reduce((s, l) => s + Number(l.srpe || 0), 0), n: ls.length };
  });
  const days = Array.from({ length: 21 }, (_, i) => {
    const d = iso(addDays(new Date(), i - 20)); const c = checkins.find((x) => x.date === d);
    return { label: `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`, value: c ? wellness(c) : null };
  });
  const streak = (() => { let n = 0; for (let i = 0; i < 60; i++) { if (checkins.some((c) => c.date === iso(addDays(new Date(), -i)))) n++; else if (i > 0) break; } return n; })();
  const cur = sums.find((x) => x.name === sel) || sums.find((x) => x.list.length > 1) || sums[0];
  const vals = cur ? cur.list.map(testValue) : [];
  const lo = vals.length ? Math.min(...vals) : 0; const hi = vals.length ? Math.max(...vals) : 1; const pad = (hi - lo) * 0.25 || Math.abs(hi) * 0.05 || 1;
  return (
    <div className="stack">
      <div className="grid2 keep2">
        <Hero color="t-p" kicker="Esta semana"><div className="big num">{weeks[7].n}</div><span className="sub">{weeks[7].n === 1 ? 'sesión registrada' : 'sesiones registradas'}</span></Hero>
        <Hero color="t-o" kicker="Racha"><div className="big num">{streak}</div><span className="sub">{streak === 1 ? 'día con check-in' : 'días seguidos con check-in'}</span></Hero>
      </div>
      {sums.length > 0 && (
        <Hero color="t-a" kicker="Mis marcas">
          <ul>{sums.map((x) => (
            <li key={x.name}><span><b>{x.name}</b> <span className="small">{x.unit}</span></span>
              <span className="row num"><b>{fmtNum(x.v1)}</b>{x.change != null && <span className="pill">{x.change > 0 ? '+' : ''}{fmtNum(x.change, 1)} %{x.improved ? ' ↑' : ''}</span>}</span></li>
          ))}</ul>
        </Hero>
      )}
      {tests.length > 0 && <TestRadar tests={tests} storeKey={'yo:' + ctx.player.id} title="Mi perfil" />}
      {cur && cur.list.length > 1 && (
        <div className="panel stack">
          <div className="between"><h3>{cur.name} ({cur.unit || '—'})</h3>
            {sums.length > 1 && <select aria-label="Test" style={{ width: 'auto' }} value={cur.name} onChange={(e) => setSel(e.target.value)}>{sums.map((x) => <option key={x.name}>{x.name}</option>)}</select>}</div>
          <Line data={cur.list.map((t, i) => ({ label: `T${i}`, value: testValue(t) }))} min={Math.round((lo - pad) * 100) / 100} max={Math.round((hi + pad) * 100) / 100} />
          <p className="small muted">Inicio {fmtNum(cur.v0)} → ahora {fmtNum(cur.v1)} {cur.unit}{cur.improved ? ' · ¡mejorando!' : ''}</p>
        </div>
      )}
      <div className="panel stack"><h3>Tu carga semanal</h3><p className="muted small">RPE × minutos de cada sesión, sumado por semana.</p><Bars data={weeks} /></div>
      <div className="panel stack"><h3>Tu bienestar</h3><p className="muted small">De 5 a 25. Si baja varios días seguidos, coméntalo con tu entrenador.</p><Line data={days} min={5} max={25} refLine={13} /></div>
    </div>
  );
}

// Planes disponibles; el suyo marcado
function Plans({ ctx }) {
  const { player, coach } = ctx;
  const first = player.name.split(' ')[0];
  const com = commitment(player);
  const pay = payState(ctx);
  return (
    <div className="stack">
      <Hero color={pay?.paid === false ? 't-r' : 't-s'} kicker="Mi plan" title={player.plan || 'Sin plan todavía'} sub={player.plan ? `${player.fee != null ? money(player.fee) + feeSuffix(player.fee_type) : ''}${player.commitment_months ? ` · ${com.text}` : ''}` : 'Elige cómo quieres trabajar.'}>
        {pay && <span className={'paychip ' + (pay.paid ? 'ok' : 'bad')}>{pay.text}</span>}
        {pay && !pay.paid && coach?.whatsapp && <a className="btn" target="_blank" rel="noopener" href={waURL(coach.whatsapp, `Hola, soy ${first}. Te escribo por el pago de ${pay.month}.`)}><WAIcon /> Hablar del pago</a>}
      </Hero>
      {PLANS.map((pl) => {
        const mine = player.plan === pl.name;
        const msg = `Hola, soy ${first}. Me interesa ${mine ? 'seguir con' : pl.offer ? 'la oferta' : 'el plan'} «${pl.name}» (${feeLabel(pl)}). ¿Lo hablamos?`;
        return (
          <PlanCard key={pl.name} plan={pl} badge={mine ? 'Tu plan' : null} className={mine ? 'mine' : ''}>
            {coach?.whatsapp && <a className="btn" target="_blank" rel="noopener" href={waURL(coach.whatsapp, msg)}><WAIcon /> {mine ? 'Hablar de mi plan' : 'Me interesa'}</a>}
          </PlanCard>
        );
      })}
    </div>
  );
}

// Saludo según la hora
function greet() { const h = new Date().getHours(); return h < 6 ? 'Buenas noches' : h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches'; }

// Estado de pago del mes (o del pago único)
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function payState({ player, payments = [] }) {
  if (player.fee == null) return null;
  const mk = iso().slice(0, 7);
  const month = MONTHS_ES[Number(mk.slice(5)) - 1];
  if (player.fee_type === 'unico') {
    const p = payments[0];
    return p ? { paid: true, month, text: '✓ Pago único hecho' } : { paid: false, month: 'tu programa', text: 'Pago pendiente' };
  }
  if (player.fee_type === 'trimestral') {
    const c = payCover(player, payments.map((x) => ({ ...x, player_id: player.id })), mk);
    return c.paid ? { paid: true, month: c.period, text: `✓ Trimestre ${c.period} pagado` } : { paid: false, month: c.long, text: `Pago del trimestre ${c.period} pendiente` };
  }
  return payments.some((x) => x.month === mk) ? { paid: true, month, text: `✓ ${month[0].toUpperCase() + month.slice(1)} pagado` } : { paid: false, month, text: `Pago de ${month} pendiente` };
}

// Entrenos del club y partidos: también cuentan en la carga (RPE × minutos)
const CLUB_KEYS = { club: 'Entreno club', partido: 'Partido' };
function ClubRPE({ ctx }) {
  const { logs, player, load } = ctx;
  const act = useAction();
  const yday = iso(addDays(new Date(), -1));
  const skipKey = `noclub:${player.id}:${yday}`;
  const [skipped, setSkipped] = useState(() => { try { return localStorage.getItem(skipKey) === '1'; } catch { return false; } });
  const [kind, setKind] = useState('club');
  const [rpe, setRpe] = useState(null);
  const [min, setMin] = useState(90);
  const [open, setOpen] = useState(false);
  const done = logs.find((l) => l.date === yday && CLUB_KEYS[l.session_key]);
  const cy = clubDay(yday, ctx.club);
  const hasCal = (ctx.club.schedule?.weekdays || []).length > 0 || ctx.club.events.length > 0;
  if (hasCal && !cy.training && !cy.match) return null;
  if (skipped) return null;
  if (done) return null;
  const save = () => act(async () => {
    await q(supabase.from('session_logs').upsert({ player_id: player.id, program_id: null, session_key: kind, date: yday, rpe, duration_min: Number(min) || null, sets: [] }, { onConflict: 'player_id,session_key,date' }));
    await load();
  }, `${CLUB_KEYS[kind]} de ayer registrado.`);
  const skip = () => { try { localStorage.setItem(skipKey, '1'); } catch {} setSkipped(true); };
  return (
    <Hero color="t-r" kicker={cy.match ? `Ayer · ${matchText(cy.match)}` : cy.training ? 'Ayer tocaba club' : 'Ayer'} title={cy.match ? '¿Qué tal el partido?' : '¿Entrenaste con tu club o jugaste?'} sub="Apunta lo duro que fue y cuánto duró: tu entrenador suma esa carga a la tuya.">
      {!open ? (
        <div className="row">
          {(!hasCal || cy.training) && <button className="btn" onClick={() => { setKind('club'); setOpen(true); }}>Entreno con el club</button>}
          {(!hasCal || cy.match || cy.training) && <button className="btn" onClick={() => { setKind('partido'); setMin(80); setOpen(true); }}>Partido</button>}
          <button className="btn ghostw" onClick={skip}>No, ayer no</button>
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          <b>{CLUB_KEYS[kind]} · ¿qué tan duro fue? (RPE)</b>
          <span className="small">0 reposo · 5 duro · 7 muy duro · 10 máximo</span>
          <Scale name="RPE del club" n={11} from={0} value={rpe} onChange={setRpe} pain />
          <label className="f" style={{ color: 'inherit' }}>Minutos<input type="number" min="1" max="600" value={min} onChange={(e) => setMin(e.target.value)} /></label>
          {rpe != null && <span className="small">Carga: <b className="num">{rpe * (Number(min) || 0)}</b> (RPE × minutos)</span>}
          <div className="row"><button className="btn" disabled={rpe == null} onClick={save}>Guardar</button><button className="btn ghostw" onClick={() => setOpen(false)}>Cancelar</button></div>
        </div>
      )}
    </Hero>
  );
}

// Nota de la semana que deja el entrenador
function WeekNote({ ctx }) {
  const { weekNotes = [], coach } = ctx;
  const monday = iso(mondayOf(new Date()));
  const n = weekNotes.find((x) => x.week === monday);
  if (!n) return null;
  return (
    <Hero color="t-b" kicker={`Esta semana · ${coach?.brand_short || coach?.brand_name || 'tu entrenador'}`}>
      <p className="wnote">{n.text}</p>
    </Hero>
  );
}

// Hoy toca club o partido
function ClubToday({ ctx }) {
  const c = clubDay(ctx.today, ctx.club);
  if (!c.match && !c.training) return null;
  return c.match
    ? <Hero color="t-r" kicker="Hoy" title={matchText(c.match)} sub="Calienta bien, hidrátate y mañana apunta cómo fue." />
    : <Hero color="t-p" kicker="Hoy" title={`Entreno con tu club${c.time ? ' · ' + c.time : ''}`} sub="Mañana te pediré el RPE y los minutos." />;
}

// Iconos de la barra inferior (trazo, heredan el color)
function TabIcon({ k, done }) {
  const p = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (k === 'checkin') return <svg {...p}><path d="M12 21s-7-4.4-9.3-9A5.3 5.3 0 0 1 12 6a5.3 5.3 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9Z" />{done && <path d="m8.5 12 2.5 2.5 4.5-4.5" />}</svg>;
  if (k === 'semana') return <svg {...p}><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>;
  if (k === 'hoy') return <svg {...p} width={26} height={26} fill="currentColor" stroke="none"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.2-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5Z" /></svg>;
  if (k === 'progreso') return <svg {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>;
  return <svg {...p}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>;
}
