import { testSummary, fmtNum } from '../lib/domain.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, q, PLATFORM, fetchAll } from '../lib/supabase.js';
import { applyBrand } from '../App.jsx';
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
  const [tab, setTab] = useState(() => { try { return sessionStorage.getItem('ptab') || 'checkin'; } catch { return 'checkin'; } });
  const act = useAction();

  const load = useCallback(async () => {
    const since = iso(addDays(new Date(), -90));
    const [coach, programs, checkins, logs, exercises, tests] = await Promise.all([
      q(supabase.from('coaches').select('*').eq('id', player.coach_id).limit(1)).then((r) => r[0] || null),
      q(supabase.from('programs').select('*').eq('player_id', player.id).order('start_date', { ascending: false })),
      q(supabase.from('checkins').select('*').eq('player_id', player.id).gte('date', since).order('date')),
      q(supabase.from('session_logs').select('*').eq('player_id', player.id).gte('date', since).order('date')),
      fetchAll(() => supabase.from('exercises').select('name,video_url,notes').order('id')),
      supabase.from('tests').select('*').eq('player_id', player.id).order('date').order('created_at').then(({ data }) => data || []),
    ]);
    setD({ coach, programs, checkins, logs, exercises, tests });
  }, [player.id, player.coach_id]);

  useEffect(() => { act(load); }, [load]);
  useEffect(() => { if (d?.coach) { applyBrand(d.coach.color); document.title = d.coach.brand_short || d.coach.brand_name; } }, [d?.coach]);
  const setT = (t) => { setTab(t); try { sessionStorage.setItem('ptab', t); } catch {} window.scrollTo(0, 0); };

  if (!d) return <Loading />;
  const today = iso();
  // Programa vigente: el más reciente que ya ha empezado; si no, el próximo
  const prog = d.programs.find((p) => p.start_date && p.start_date <= today) || d.programs[d.programs.length - 1] || null;
  const ctx = { ...d, player, prog, load, today };
  const doneToday = d.checkins.some((c) => c.date === today);

  return (
    <div>
      <header className="topbar" style={{ display: 'flex' }}>
        <div className="brand">
          {d.coach?.logo ? <img src={d.coach.logo} alt="" /> : <span className="logo">{(d.coach?.brand_short || d.coach?.brand_name || 'R').slice(0, 2)}</span>}
          <div><b>{d.coach?.brand_name}</b><div className="small muted">Hola, {player.name.split(' ')[0]}</div></div>
        </div>
        <button className="btn sm" aria-pressed={tab === 'cuenta'} onClick={() => setT(tab === 'cuenta' ? 'hoy' : 'cuenta')}>{tab === 'cuenta' ? 'Volver' : 'Mi cuenta'}</button>
      </header>
      <div className="pwrap">
        {tab !== 'cuenta' && <Tabs tabs={[['checkin', doneToday ? 'Check-in ✓' : 'Check-in'], ['hoy', 'Hoy'], ['semana', 'Semana'], ['progreso', 'Progreso']]} value={tab} onChange={setT} />}
        {tab === 'checkin' && <Checkin ctx={ctx} onDone={() => setT('hoy')} />}
        {tab === 'hoy' && <Today ctx={ctx} />}
        {tab === 'semana' && <Week ctx={ctx} />}
        {tab === 'progreso' && <Progress ctx={ctx} />}
        {tab === 'cuenta' && <Account ctx={ctx} session={session} onLogout={onLogout} canSwitch={canSwitch} onSwitch={onSwitch} />}
        <Footer coach={d.coach} />
      </div>
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

// Mi cuenta del jugador
function Account({ ctx, session, onLogout, canSwitch, onSwitch }) {
  const { player, coach, checkins, logs } = ctx;
  const act = useAction();
  const [hasPw, setHasPw] = useState(!!session?.user?.user_metadata?.has_password);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showData, setShowData] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installed = window.matchMedia?.('(display-mode: standalone)').matches;
  const first = player.name.split(' ')[0];
  const coachName = coach?.brand_name || 'tu entrenador';

  const savePw = (e) => {
    e.preventDefault();
    if (pw !== pw2) return act(async () => { throw new Error('Las dos contraseñas no coinciden.'); });
    act(async () => {
      const { error } = await supabase.auth.updateUser({ password: pw, data: { has_password: true } });
      if (error) throw new Error(/different from the old/i.test(error.message) ? 'La nueva contraseña tiene que ser distinta de la anterior.' : error.message);
      setPw(''); setPw2(''); setPwOpen(false); setHasPw(true);
    }, 'Contraseña guardada. Ya puedes entrar con ella.');
  };

  const askData = (kind) => waURL(coach?.whatsapp, kind === 'copia'
    ? `Hola, soy ${player.name}. Quería pedir una copia de los datos que guardas de mí en la app.`
    : `Hola, soy ${player.name}. Quería pedir que borres mis datos de la app.`);

  return (
    <div className="stack">
      <div><h2>Mi cuenta</h2><p className="muted">Tus datos, tu acceso y cómo contactar con {coachName}.</p></div>

      <section className="panel stack">
        <h3>Mis datos</h3>
        <dl className="kv">
          <dt>Nombre</dt><dd>{player.name}</dd>
          <dt>Correo</dt><dd>{player.email}</dd>
          {player.position && <><dt>Posición</dt><dd>{player.position}</dd></>}
          {player.plan && <><dt>Plan</dt><dd>{player.plan}</dd></>}
          <dt>Con {coachName} desde</dt><dd>{fmtDate(player.start_date)}</dd>
          <dt>Check-ins (90 días)</dt><dd className="num">{checkins.length}</dd>
          <dt>Sesiones registradas</dt><dd className="num">{logs.length}</dd>
        </dl>
        <p className="muted small">¿Algún dato mal? Díselo a tu entrenador y lo corrige.</p>
      </section>

      <section className="panel stack">
        <h3>Mi entrenador</h3>
        <div className="row">
          {coach?.logo ? <img src={coach.logo} alt="" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 10, background: 'var(--soft)' }} /> : null}
          <b>{coachName}</b>
        </div>
        <div className="row">
          {coach?.whatsapp && <a className="btn pri" target="_blank" rel="noopener" href={waURL(coach.whatsapp, `Hola, soy ${first}. `)}><WAIcon /> Escribir por WhatsApp</a>}
          {coach?.instagram && <a className="btn" target="_blank" rel="noopener" href={igURL(coach.instagram)}><IGIcon /> @{coach.instagram.replace(/^@/, '')}</a>}
        </div>
      </section>

      <section className="panel stack">
        <h3>Acceso</h3>
        <div className="between">
          <span>Contraseña</span>
          {hasPw ? <span className="pill ok">Creada ✓</span> : <span className="pill">Sin contraseña</span>}
        </div>
        <p className="muted small">
          {hasPw ? 'Puedes entrar con tu correo y contraseña, o pedir un enlace por correo.'
            : 'Ahora entras con un enlace por correo. Si prefieres, crea una contraseña para entrar más rápido.'}
        </p>
        {pwOpen ? (
          <form className="stack" style={{ gap: 8 }} onSubmit={savePw}>
            <input id="pw-new" type="password" minLength={8} required autoComplete="new-password" placeholder="Nueva contraseña (mínimo 8 caracteres)" value={pw} onChange={(e) => setPw(e.target.value)} />
            <input id="pw-rep" type="password" minLength={8} required autoComplete="new-password" placeholder="Repite la contraseña" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            <div className="row"><button className="btn pri" type="submit">Guardar contraseña</button><button type="button" className="btn" onClick={() => { setPwOpen(false); setPw(''); setPw2(''); }}>Cancelar</button></div>
          </form>
        ) : (
          <div className="row"><button className="btn" onClick={() => setPwOpen(true)}>{hasPw ? 'Cambiar contraseña' : 'Crear contraseña'}</button></div>
        )}
      </section>

      {!installed && (
        <section className="panel stack">
          <h3>Tener la app en el móvil</h3>
          <p className="small">Añádela a tu pantalla de inicio y se abre como una app normal, sin buscarla en el navegador.</p>
          {isIOS
            ? <ol className="small" style={{ margin: 0, paddingLeft: 20 }}><li>Abre esta página en <b>Safari</b>.</li><li>Pulsa el botón <b>Compartir</b> (cuadrado con flecha).</li><li>Elige <b>Añadir a pantalla de inicio</b>.</li></ol>
            : <ol className="small" style={{ margin: 0, paddingLeft: 20 }}><li>Abre esta página en <b>Chrome</b>.</li><li>Pulsa el menú <b>⋮</b> arriba a la derecha.</li><li>Elige <b>Instalar app</b> o <b>Añadir a pantalla de inicio</b>.</li></ol>}
        </section>
      )}

      <section className="panel stack">
        <h3>Mis datos y privacidad</h3>
        <p className="small">Consentimiento aceptado el <b>{fmtDate(player.consent_at)}</b>. Solo {coachName} ve tus datos, guardados cifrados en servidores de la Unión Europea.</p>
        <button className="btn sm" style={{ justifySelf: 'start' }} aria-expanded={showData} onClick={() => setShowData(!showData)}>{showData ? 'Ocultar' : 'Qué datos se guardan'}</button>
        {showData && (
          <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>
            <li>Contacto y plan: nombre, correo, teléfono, posición.</li>
            <li>Entrenamiento: programas, sesiones hechas, cargas, RPE y duración.</li>
            <li>Bienestar diario: sueño, energía, agujetas, estrés, ánimo y dolor.</li>
            <li>Salud: lesiones, antecedentes e informes que compartas con tu entrenador.</li>
          </ul>
        )}
        {coach?.whatsapp && (
          <div className="row">
            <a className="btn sm" target="_blank" rel="noopener" href={askData('copia')}>Pedir una copia de mis datos</a>
            <a className="btn sm" target="_blank" rel="noopener" href={askData('borrar')}>Pedir que se borren</a>
          </div>
        )}
      </section>

      <div className="row">
        {canSwitch && <button className="btn" onClick={onSwitch}>Ir a mi panel de entrenador</button>}
        <button className="btn" onClick={onLogout}>Cerrar sesión</button>
      </div>
    </div>
  );
}

function Scale({ value, onChange, n = 5, from = 1, name }) {
  return (
    <div className={'scale' + (n > 5 ? ' eleven' : '')} role="radiogroup" aria-label={name}>
      {Array.from({ length: n }, (_, i) => i + from).map((v) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} aria-pressed={value === v} onClick={() => onChange(v)}>{v}</button>
      ))}
    </div>
  );
}

function Checkin({ ctx, onDone }) {
  const { checkins, today, player, load } = ctx;
  const act = useAction();
  const existing = checkins.find((c) => c.date === today);
  const [f, setF] = useState(existing || { sleep: null, fatigue: null, soreness: null, stress: null, mood: null, pain: 0, note: '' });
  const complete = ITEMS.every(([k]) => f[k]);
  const save = () => act(async () => {
    const { sleep, fatigue, soreness, stress, mood, pain, note } = f;
    await q(supabase.from('checkins').upsert({ player_id: player.id, date: today, sleep, fatigue, soreness, stress, mood, pain, note: note || null }, { onConflict: 'player_id,date' }));
    await load();
    onDone();
  }, '¡Gracias! Check-in guardado.');
  return (
    <div className="stack">
      <div><h2>¿Cómo estás hoy?</h2><p className="muted">20 segundos. 1 es lo peor y 5 lo mejor.</p></div>
      {ITEMS.map(([k, l, lo, hi]) => (
        <div key={k} className="panel stack" style={{ gap: 8 }}>
          <div className="between"><b>{l}</b><span className="muted small">1 {lo} · 5 {hi}</span></div>
          <Scale name={l} value={f[k]} onChange={(v) => setF({ ...f, [k]: v })} />
        </div>
      ))}
      <div className="panel stack" style={{ gap: 8 }}>
        <div className="between"><b>¿Tienes algún dolor o molestia?</b><span className="muted small">0 nada · 10 máximo</span></div>
        <Scale name="Dolor" n={11} from={0} value={f.pain} onChange={(v) => setF({ ...f, pain: v })} />
        {f.pain > 0 && <input placeholder="¿Dónde? Ej. isquio derecho al esprintar" value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} />}
      </div>
      <button className="btn pri" disabled={!complete} onClick={save}>{existing ? 'Actualizar check-in' : 'Enviar check-in'}</button>
      {complete && <p className="muted small" style={{ textAlign: 'center' }}>Bienestar de hoy: {wellness(f)}/25</p>}
    </div>
  );
}

// Una sesión con sus bloques; permite registrar RPE y duración
function SessionCard({ ctx, s, open: startOpen }) {
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
  return (
    <section className="panel stack">
      <div className="between">
        <div><b>{DAYS[s.day - 1]}{s.date ? ` ${Number(s.date.slice(8))}` : ''} · {title}</b><div className="muted small">{s.phase} · semana {s.weekN}</div></div>
        <span className="row">{log && <span className="pill ok">Hecha · RPE {log.rpe}</span>}<button className="btn sm" onClick={() => setOpen(!open)}>{open ? 'Cerrar' : log ? 'Ver o editar' : 'Ver'}</button></span>
      </div>
      {open && (
        <>
          {s.packs.map((p, k) => (
            <div key={p.id} className="stack" style={{ gap: 6 }}>
              <div><b style={{ color: 'var(--brand)' }}>Bloque {String.fromCharCode(65 + k)} · {p.type}</b>{p.rounds ? <span className="muted"> · {p.rounds} vueltas</span> : ''}{p.notes && <div className="small muted">{p.notes}</div>}</div>
              {p.items.filter((it) => it.exercise).map((it, j) => {
                const v = vid[it.exercise];
                const st = done[it.id] || { id: it.id, done: false, load: '' };
                return (
                  <div key={it.id} className="exrow">
                    <span className="lb">{label(k, j)}</span>
                    <div className="stack" style={{ gap: 4 }}>
                      <div className="between">
                        <b>{it.exercise}</b>
                        <input type="checkbox" aria-label={'Hecho: ' + it.exercise} checked={!!st.done} onChange={(e) => setDone({ ...done, [it.id]: { ...st, done: e.target.checked } })} />
                      </div>
                      <span className="small">{[it.sets && `${it.sets} series`, it.reps && `${it.reps} reps`, it.load && `carga ${it.load}`, it.rest && `descanso ${it.rest}`].filter(Boolean).join(' · ')}</span>
                      {it.notes && <span className="small muted">{it.notes}</span>}
                      {v?.notes && <details className="small"><summary>Cómo hacerlo</summary><p className="muted" style={{ whiteSpace: 'pre-line', marginTop: 4 }}>{v.notes.split('\nMás vídeos:')[0]}</p></details>}
                      <div className="row">
                        {v?.video_url && <a className="btn sm" href={v.video_url} target="_blank" rel="noopener">▶ Vídeo</a>}
                        <input style={{ width: 130 }} placeholder="Carga usada" aria-label={'Carga usada en ' + it.exercise} value={st.load || ''} onChange={(e) => setDone({ ...done, [it.id]: { ...st, load: e.target.value } })} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div className="stack" style={{ gap: 8, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <b>¿Qué tan dura ha sido la sesión? (RPE)</b>
            <span className="muted small">0 reposo · 5 dura · 7 muy dura · 10 máximo esfuerzo</span>
            <Scale name="RPE" n={11} from={0} value={rpe} onChange={setRpe} />
            <label className="f">Duración (minutos)<input type="number" min="1" max="600" value={min} onChange={(e) => setMin(e.target.value)} /></label>
            <label className="f">Comentario para tu entrenador (opcional)<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
            <button className="btn pri" disabled={rpe == null} onClick={save}>{log ? 'Actualizar registro' : 'Terminar y registrar sesión'}</button>
          </div>
        </>
      )}
    </section>
  );
}

function Today({ ctx }) {
  const { prog, today } = ctx;
  if (!prog) return <Empty>Tu entrenador aún no te ha asignado un programa.</Empty>;
  const w = calendarWeekIdx(prog);
  if (w == null) return <Empty>Tu programa todavía no tiene fecha de inicio.</Empty>;
  if (w < 0) return <Empty>Tu programa «{prog.name}» empieza el {fmtDate(prog.start_date)}.</Empty>;
  if (w >= totalWeeks(prog.data)) return <Empty>Has terminado «{prog.name}». Tu entrenador te preparará lo siguiente.</Empty>;
  const ss = sessionsOfWeek(prog, w);
  const todays = ss.filter((s) => s.date === today);
  const next = ss.find((s) => s.date > today) || sessionsOfWeek(prog, w + 1)[0];
  return (
    <div className="stack">
      <div><h2>Hoy</h2><p className="muted">{prog.name} · semana {w + 1} de {totalWeeks(prog.data)}</p></div>
      {todays.length ? todays.map((s) => <SessionCard key={s.id} ctx={ctx} s={s} open />) : (
        <Empty>Hoy toca descanso.{next ? ` Próxima sesión: ${DAYS[next.day - 1].toLowerCase()} ${Number(next.date.slice(8))}${next.name ? ` · ${next.name}` : ''}.` : ''}</Empty>
      )}
    </div>
  );
}

function Week({ ctx }) {
  const { prog } = ctx;
  const [off, setOff] = useState(0);
  if (!prog) return <Empty>Tu entrenador aún no te ha asignado un programa.</Empty>;
  const base = Math.max(0, calendarWeekIdx(prog) ?? 0);
  const w = Math.max(0, Math.min(totalWeeks(prog.data) - 1, base + off));
  const ss = sessionsOfWeek(prog, w);
  return (
    <div className="stack">
      <div className="between">
        <button className="btn sm" disabled={w === 0} onClick={() => setOff(off - 1)}>‹ Anterior</button>
        <div style={{ textAlign: 'center' }}><h2>Semana {w + 1}</h2><span className="muted small">{ss[0]?.phase}</span></div>
        <button className="btn sm" disabled={w >= totalWeeks(prog.data) - 1} onClick={() => setOff(off + 1)}>Siguiente ›</button>
      </div>
      {ss.length ? ss.map((s) => <SessionCard key={s.id} ctx={ctx} s={s} open={false} />) : <Empty>Semana sin sesiones.</Empty>}
    </div>
  );
}

function Progress({ ctx }) {
  const { logs, checkins, tests = [] } = ctx;
  const sums = testSummary(tests);
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
  return (
    <div className="stack">
      <div className="grid2">
        <div className="panel"><div className="muted small">Sesiones esta semana</div><h2 className="num">{weeks[7].n}</h2></div>
        <div className="panel"><div className="muted small">Días seguidos con check-in</div><h2 className="num">{streak}</h2></div>
      </div>
      <div className="panel stack"><h3>Tu carga semanal</h3><p className="muted small">RPE × minutos de cada sesión, sumado por semana.</p><Bars data={weeks} /></div>
      <div className="panel stack"><h3>Tu bienestar</h3><p className="muted small">De 5 a 25. Si baja varios días seguidos, coméntalo con tu entrenador.</p><Line data={days} min={5} max={25} refLine={13} /></div>
      {sums.length > 0 && (
        <div className="panel stack">
          <h3>Tus tests</h3>
          <ul className="list">{sums.map((s) => (
            <li key={s.name}><span><b>{s.name}</b> <span className="muted small">{s.unit}</span></span>
              <span className="row num">{s.list.length > 1 && <span className="muted small">inicio {fmtNum(s.v0)} →</span>}<b>{fmtNum(s.v1)}</b>{s.change != null && <span className={'pill ' + (s.improved ? 'ok' : 'warn')}>{s.change > 0 ? '+' : ''}{fmtNum(s.change, 1)} %</span>}</span></li>
          ))}</ul>
        </div>
      )}
    </div>
  );
}
