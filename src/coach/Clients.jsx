import React, { useState, useEffect } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { matches, iso, fmtDate, waURL, monthsActive, wellness, addDays, mondayOf, parseISO } from '../lib/util.js';
import { useAction, useToast, Tabs, Empty, Bars, Line, WAIcon } from '../ui/ui.jsx';
import { waText } from './Home.jsx';
import { calendarWeekIdx, totalWeeks } from '../lib/program.js';
import {
  PLANS, planOptions, planDefaults, feeText, commitment, reviewInfo, REVIEW_OPTIONS, SCREENING, wellLevel, monthKey,
  TEST_PRESETS, presetOf, fmtNum, testValue, asym, testSummary, severity, INJ_STATUS, SIDES, ZONES, zoneName,
  FLAGS, EVO_CATS, evoLabel, isRecord,
} from '../lib/domain.js';
import Flag from './Flag.jsx';
import { PlayerPrograms, Health, Notes } from './PlayerTabs.jsx';

const END_REASONS = ['Objetivo cumplido', 'Precio', 'Falta de tiempo', 'Lesión', 'Se pasa a presencial', 'Sin respuesta', 'Otro'];

export default function Clients() {
  const { route } = useCoach();
  if (route.id === 'nuevo') return <NewPlayer />;
  if (route.id) return <PlayerDetail id={route.id} />;
  return <PlayerList />;
}

const lastCheckin = (checkins, id) => { const c = checkins.filter((x) => x.player_id === id); return c[c.length - 1]; };
const avgWellness = (checkins, id, days = 14) => {
  const since = iso(addDays(new Date(), -days));
  const v = checkins.filter((c) => c.player_id === id && c.date >= since).map(wellness).filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const Chip = ({ level, children }) => <span className={'chip ' + (level || '')}><span className="dot" />{children}</span>;

function PlayerList() {
  const { players, go, checkins, payments = [] } = useCoach();
  const [qy, setQy] = useState('');
  const [show, setShow] = useState('activos');
  const baja = show === 'baja';
  const list = players.filter((p) => (baja ? !!p.end_date : !p.end_date) && matches(`${p.name} ${p.position || ''} ${p.plan || ''} ${p.email}`, qy));
  const ended = players.filter((p) => p.end_date);
  const avg = ended.length ? ended.reduce((a, p) => a + monthsActive(p), 0) / ended.length : null;
  const mk = monthKey();
  const payChip = (p) => {
    if (p.fee == null) return '—';
    if (payments.some((x) => x.player_id === p.id && x.month === mk)) return <Chip level="ok">Pagado</Chip>;
    if (p.fee_type === 'unico' && payments.some((x) => x.player_id === p.id)) return <span className="muted small">Pago único hecho</span>;
    return <Chip level="bad">Pendiente</Chip>;
  };

  return (
    <>
      <div className="pagehead">
        <div><h1>Jugadores</h1><p>{players.filter((p) => !p.end_date).length} activos{avg != null ? ` · permanencia media ${avg.toFixed(1).replace('.', ',')} meses` : ''}</p></div>
        <button className="btn pri" onClick={() => go('clientes', 'nuevo')}>+ Nuevo jugador</button>
      </div>
      <div className="row">
        <input id="cq" style={{ maxWidth: 320 }} placeholder="Buscar por nombre, posición o plan" value={qy} onChange={(e) => setQy(e.target.value)} />
        <Tabs tabs={[['activos', 'Activos'], ['baja', 'De baja']]} value={show} onChange={setShow} />
      </div>
      {list.length ? (
        <div className="panel tablewrap">
          <table>
            <thead><tr><th>Nombre</th><th>Posición</th><th>Plan</th><th>Alta</th>{baja && <><th>Baja</th><th>Motivo</th></>}<th>Tiempo</th>{!baja && <><th>Revisión</th><th>Bienestar</th><th>Pago {['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(mk.slice(5)) - 1]}</th><th>Acceso</th></>}</tr></thead>
            <tbody>
              {list.map((p) => {
                const c = lastCheckin(checkins, p.id); const w = wellness(c); const r = reviewInfo(p);
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => go('clientes', p.id)}>
                    <td><b>{p.name}</b><Flag p={p} sm /></td>
                    <td>{p.position || '—'}</td>
                    <td>{p.plan || '—'}</td>
                    <td className="num">{fmtDate(p.start_date)}</td>
                    {baja && <><td className="num">{fmtDate(p.end_date)}</td><td>{p.end_reason || '—'}</td></>}
                    <td className="num">{monthsActive(p).toFixed(1).replace('.', ',')} m</td>
                    {!baja && <>
                      <td>{r ? <span className={'pill ' + r.level}>{r.text}</span> : <span className="muted small">sin fecha</span>}</td>
                      <td>{c ? <Chip level={wellLevel(w)}>{w}/25</Chip> : '—'}{c?.pain >= 4 && <span className="pill bad">dolor {c.pain}</span>}</td>
                      <td>{payChip(p)}</td>
                      <td>{p.user_id ? <span className="pill ok">Activo</span> : <span className="pill warn">Invitado</span>}</td>
                    </>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <Empty>{players.length ? 'Nadie coincide con la búsqueda.' : 'Aún no tienes jugadores. Añade el primero con «+ Nuevo jugador».'}</Empty>}
    </>
  );
}

function NewPlayer() {
  const { uid, load, go, coach } = useCoach();
  const act = useAction();
  const [f, setF] = useState({ name: '', email: '', phone: '', position: '', plan: PLANS[1].name, fee: PLANS[1].fee, fee_type: PLANS[1].type, start_date: iso(), objective: '', review_days: 14, commitment_months: 3 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setPlan = (e) => { const d = planDefaults(e.target.value); setF({ ...f, plan: e.target.value, ...(d ? { fee: d.fee, fee_type: d.type, commitment_months: d.commitment ?? '', review_days: d.review || f.review_days } : {}) }); };
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      const rd = Number(f.review_days) || 14;
      const row = await q(supabase.from('players').insert({
        ...f, coach_id: uid, email: f.email.trim().toLowerCase(), name: f.name.trim(), fee: f.fee === '' ? null : Number(f.fee),
        review_days: rd, commitment_months: Number(f.commitment_months) || null, next_review: iso(addDays(parseISO(f.start_date), rd)), objective: f.objective || null,
      }).select().single());
      await load('players');
      go('clientes', row.id);
    }, 'Jugador añadido. Mándale el acceso por WhatsApp.');
  };
  return (
    <>
      <div className="pagehead"><div><h1>Nuevo jugador</h1><p>Con su correo podrá entrar y ver solo lo suyo.</p></div><button className="btn" onClick={() => go('clientes')}>Volver</button></div>
      <form className="panel stack" onSubmit={save} style={{ maxWidth: 720 }}>
        <div className="grid2">
          <label className="f">Nombre y apellidos<input id="np-name" required value={f.name} onChange={set('name')} /></label>
          <label className="f">Correo (con el que entrará)<input id="np-email" type="email" required value={f.email} onChange={set('email')} /></label>
          <label className="f">WhatsApp (con prefijo, ej. 34600111222)<input id="np-phone" inputMode="tel" value={f.phone} onChange={set('phone')} /></label>
          <label className="f">Posición o deporte<input id="np-pos" value={f.position} onChange={set('position')} placeholder="Ej. Pilier, Ala…" /></label>
          <label className="f">Plan<select id="np-plan" value={f.plan} onChange={setPlan}>{planOptions().map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="f">Importe (€)<span className="row"><input id="np-fee" inputMode="decimal" style={{ flex: 1 }} value={f.fee ?? ''} onChange={set('fee')} /><select style={{ width: 'auto' }} value={f.fee_type} onChange={set('fee_type')}><option value="mensual">al mes</option><option value="unico">único</option></select></span></label>
          <label className="f">Fecha de alta<input id="np-start" type="date" required value={f.start_date} onChange={set('start_date')} /></label>
          <label className="f">Compromiso (meses)<input inputMode="numeric" value={f.commitment_months} onChange={set('commitment_months')} /></label>
          <label className="f">Objetivo<input id="np-obj" value={f.objective} onChange={set('objective')} placeholder="Ej. Sprint 10 m < 1,80 s antes del 15/01" /></label>
          <label className="f">Revisiones<select value={f.review_days} onChange={set('review_days')}>{REVIEW_OPTIONS.map(([d, l]) => <option key={d} value={d}>{l}</option>)}</select></label>
        </div>
        <div className="row"><button className="btn pri" type="submit">Guardar jugador</button></div>
        <p className="muted small">Después de guardar te aparece el botón para mandarle el acceso por WhatsApp ({coach.brand_name}).</p>
      </form>
    </>
  );
}

const TEMPLATES = [['revision', 'Revisión'], ['checkin', 'Recordar check-in'], ['marca', 'Felicitar marca'], ['pago', 'Recordar pago'], ['renov', 'Renovación'], ['libre', 'Mensaje libre']];

function PlayerDetail({ id }) {
  const { players, go, coach, load, uid } = useCoach();
  const act = useAction();
  const p = players.find((x) => x.id === id);
  const [tab, setTab] = useState('resumen');
  const [tpl, setTpl] = useState('revision');
  if (!p) return <Empty>No se encuentra este jugador. <button className="btn sm" onClick={() => go('clientes')}>Volver</button></Empty>;
  const upd = (patch, msg) => act(async () => { await q(supabase.from('players').update(patch).eq('id', p.id)); await load('players'); }, msg);
  const scr = SCREENING.find((s) => s[0] === (p.screening || 'pendiente')) || SCREENING[0];
  const r = reviewInfo(p);
  const reviewDone = () => act(async () => {
    const next = iso(addDays(new Date(), Number(p.review_days) || 14));
    await q(supabase.from('players').update({ next_review: next }).eq('id', p.id));
    await q(supabase.from('evolution').insert({ coach_id: uid, player_id: p.id, category: 'valor', text: 'Revisión hecha.' }));
    await load(['players', 'evolution']);
    return next;
  }, 'Revisión hecha. La siguiente queda programada.');
  const kind = p.user_id ? tpl : 'invitar';
  return (
    <>
      <button className="btn ghost sm" style={{ justifySelf: 'start' }} onClick={() => go('clientes')}>← Todos los jugadores</button>
      <div className="pagehead">
        <div>
          <h1 style={{ fontSize: 'clamp(30px,5vw,44px)' }}>{p.name}<Flag p={p} /></h1>
          <p>{[p.position, p.plan, p.end_date ? 'De baja' : null].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="row">
          <label className={'chip ' + scr[2]} style={{ cursor: 'pointer', position: 'relative' }}>
            <span className="dot" />{scr[1]} ▾
            <select aria-label="Cribado" value={scr[0]} onChange={(e) => upd({ screening: e.target.value }, 'Cribado actualizado.')}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}>{SCREENING.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
          {p.phone && (
            <span className="row">
              {p.user_id && <select aria-label="Plantilla de WhatsApp" style={{ width: 'auto' }} value={tpl} onChange={(e) => setTpl(e.target.value)}>{TEMPLATES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
              <a className="btn pri" target="_blank" rel="noopener" href={waURL(p.phone, waText(p, kind, coach, kind === 'pago' ? new Date().toLocaleDateString('es-ES', { month: 'long' }) : ''))}>
                <WAIcon /> {p.user_id ? 'WhatsApp' : 'Enviar acceso'}
              </a>
            </span>
          )}
        </div>
      </div>
      <div className="row">
        <select aria-label="Frecuencia de revisión" style={{ width: 'auto' }} value={p.review_days || 14} onChange={(e) => upd({ review_days: Number(e.target.value) }, 'Frecuencia de revisión guardada.')}>
          {[...new Set([...REVIEW_OPTIONS.map((o) => o[0]), p.review_days || 14])].map((d) => <option key={d} value={d}>{REVIEW_OPTIONS.find((o) => o[0] === d)?.[1] || `Revisión cada ${d} días`}</option>)}
        </select>
        <span className="small">Próxima: <b>{p.next_review ? fmtDate(p.next_review) : 'sin fecha'}</b> {r && <span className={'pill ' + r.level}>{r.text}</span>}</span>
        <input aria-label="Fecha de la próxima revisión" type="date" style={{ width: 'auto' }} value={p.next_review || ''} onChange={(e) => upd({ next_review: e.target.value || null }, 'Fecha de revisión guardada.')} />
        <button className="btn sm" onClick={reviewDone}>Revisión hecha</button>
      </div>
      <Tabs tabs={[['resumen', 'Resumen'], ['tests', 'Tests'], ['lesiones', 'Lesiones'], ['plan', 'Plan'], ['clinica', 'Historia clínica'], ['notas', 'Notas'], ['datos', 'Datos']]} value={tab} onChange={setTab} />
      {tab === 'resumen' && <Summary p={p} onTab={setTab} />}
      {tab === 'tests' && <Tests p={p} />}
      {tab === 'lesiones' && <Injuries p={p} />}
      {tab === 'plan' && <PlayerPrograms p={p} />}
      {tab === 'clinica' && <Health p={p} />}
      {tab === 'notas' && <Notes p={p} />}
      {tab === 'datos' && <Data p={p} />}
    </>
  );
}

function TestChart({ p, onTab }) {
  const { tests = [] } = useCoach();
  const mine = tests.filter((t) => t.player_id === p.id);
  const sums = testSummary(mine);
  const [sel, setSel] = useState('');
  const cur = sums.find((s) => s.name === sel) || sums.find((s) => s.list.length > 1) || sums[0];
  if (!cur) return <div className="panel stack"><h3>Tests</h3><Empty>Sin tests todavía. <button className="btn sm" onClick={() => onTab('tests')}>Añadir test</button></Empty></div>;
  const vals = cur.list.map(testValue);
  const lo = Math.min(...vals); const hi = Math.max(...vals); const pad = (hi - lo) * 0.25 || Math.abs(hi) * 0.05 || 1;
  const dec = (x) => Math.round(x * 100) / 100;
  return (
    <div className="panel stack">
      <div className="between">
        <h3>{cur.name} ({cur.unit || '—'})</h3>
        {sums.length > 1 && <select aria-label="Test" style={{ width: 'auto' }} value={cur.name} onChange={(e) => setSel(e.target.value)}>{sums.map((s) => <option key={s.name}>{s.name}</option>)}</select>}
      </div>
      <Line data={cur.list.map((t, i) => ({ label: `T${i}`, value: testValue(t) }))} min={dec(lo - pad)} max={dec(hi + pad)} />
      <p className="small muted">T0 {fmtNum(cur.v0)} → último {fmtNum(cur.v1)} {cur.unit}{cur.change != null && <> · <b className={cur.improved ? '' : ''}>{cur.change > 0 ? '+' : ''}{fmtNum(cur.change, 1)} %</b> {cur.improved ? '(mejora)' : '(empeora)'}</>}</p>
    </div>
  );
}

function Summary({ p, onTab }) {
  const { checkins, logs, programs, go, load } = useCoach();
  const act = useAction();
  const cs = checkins.filter((c) => c.player_id === p.id);
  const ls = logs.filter((l) => l.player_id === p.id);
  const mon = mondayOf(new Date());
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const a = addDays(mon, -7 * (7 - i)); const b = addDays(a, 6);
    const v = ls.filter((l) => l.date >= iso(a) && l.date <= iso(b)).reduce((s, l) => s + Number(l.srpe || 0), 0);
    return { label: `${a.getDate()}/${a.getMonth() + 1}`, value: v };
  });
  const acute = weeks[7].value; const chronic = weeks.slice(4, 8).reduce((a, w) => a + w.value, 0) / 4;
  // Ratio orientativo solo con 4 semanas con carga (Impellizzeri et al., 2020)
  const acwr = chronic && weeks.slice(4, 8).filter((w) => w.value > 0).length >= 4 ? acute / chronic : null;
  const days = Array.from({ length: 21 }, (_, i) => {
    const d = iso(addDays(new Date(), i - 20)); const c = cs.find((x) => x.date === d);
    return { label: `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`, value: c ? wellness(c) : null };
  });
  const prog = programs.find((x) => x.player_id === p.id);
  const wk = prog ? calendarWeekIdx(prog) : null;
  const wAvg = avgWellness(checkins, p.id);
  const com = commitment(p);
  const setDate = (k) => (e) => act(async () => { await q(supabase.from('players').update({ [k]: e.target.value || null }).eq('id', p.id)); await load('players'); }, 'Fecha guardada.');

  return (
    <div className="stack">
      <div className="grid2">
        <TestChart p={p} onTab={onTab} />
        <div className="panel">
          <dl className="kv2">
            <dt>Objetivo</dt><dd>{p.objective || <span className="muted">— (en Datos)</span>}</dd>
            <dt>Club / partido</dt><dd>{p.club_days || '—'}</dd>
            <dt>Días extra</dt><dd>{p.extra_days || '—'}</dd>
            <dt>Material</dt><dd>{p.equipment || '—'}</dd>
            <dt>Bienestar medio</dt><dd>{wAvg != null ? <Chip level={wellLevel(wAvg)}>{fmtNum(wAvg, 1)}/25</Chip> : '—'} <span className="muted small">14 días</span></dd>
            <dt>Compromiso</dt><dd>{com.text}</dd>
            <dt>Plan e importe</dt><dd>{p.plan || '—'} · {feeText(p)}</dd>
            <dt>Fecha de alta</dt><dd><input aria-label="Fecha de alta" type="date" value={p.start_date || ''} onChange={setDate('start_date')} required /></dd>
            <dt>Fecha de baja</dt><dd><input aria-label="Fecha de baja" type="date" value={p.end_date || ''} onChange={setDate('end_date')} /><div className="muted small">vacío = activo</div></dd>
            <dt>Tiempo conmigo</dt><dd>{monthsActive(p).toFixed(1).replace('.', ',')} meses</dd>
          </dl>
        </div>
      </div>

      <Evolution p={p} />

      <div className="grid3">
        <div className="panel"><div className="muted small">Programa actual</div>
          {prog ? <><b>{prog.name}</b><div className="small muted">{wk != null && wk >= 0 ? `Semana ${wk + 1} de ${totalWeeks(prog.data)}` : 'Sin fecha de inicio'}</div><button className="btn sm" style={{ marginTop: 6 }} onClick={() => go('programacion', prog.id)}>Abrir</button></> : <span className="muted">Sin programa</span>}
        </div>
        <div className="panel"><div className="muted small">Carga esta semana (sRPE)</div><h2 className="num">{Math.round(acute)}</h2>
          {acwr != null && <span className={'pill ' + (acwr > 1.5 ? 'warn' : 'ok')} title="Carga de esta semana dividida por la media de las últimas 4. Orientativo.">Esta semana / media 4 sem.: {acwr.toFixed(2).replace('.', ',')}</span>}
        </div>
        <div className="panel"><div className="muted small">Sesiones registradas</div><h2 className="num">{ls.length}</h2><span className="muted small">últimos 4 meses</span></div>
      </div>
      <div className="grid2">
        <div className="panel stack"><h3>Carga semanal</h3><p className="muted small">Suma de RPE × minutos de cada sesión (Foster 2001).</p><Bars data={weeks} /></div>
        <div className="panel stack"><h3>Bienestar (21 días)</h3><p className="muted small">Sueño, fatiga, dolor muscular, estrés y ánimo (5 a 25). Por debajo de 13, conviene preguntar.</p><Line data={days} min={5} max={25} refLine={13} /></div>
      </div>
      <div className="panel stack">
        <h3>Últimas sesiones</h3>
        {ls.length ? (
          <div className="tablewrap"><table><thead><tr><th>Fecha</th><th>RPE</th><th>Min</th><th>sRPE</th><th>Comentario</th></tr></thead>
            <tbody>{[...ls].reverse().slice(0, 10).map((l) => <tr key={l.id}><td>{fmtDate(l.date)}</td><td className="num">{l.rpe ?? '—'}</td><td className="num">{l.duration_min ?? '—'}</td><td className="num">{l.srpe ?? '—'}</td><td>{l.note || ''}</td></tr>)}</tbody>
          </table></div>
        ) : <Empty>Todavía no ha registrado sesiones.</Empty>}
      </div>
    </div>
  );
}

// Evolución y ajustes: historial con categorías. También se ve en Programación.
export function Evolution({ p }) {
  const { evolution = [], uid, load } = useCoach();
  const act = useAction();
  const toast = useToast();
  const [cat, setCat] = useState('');
  const [f, setF] = useState({ date: iso(), category: 'ajuste', text: '' });
  const mine = evolution.filter((e) => e.player_id === p.id && (!cat || e.category === cat));
  const add = (e) => {
    e.preventDefault();
    act(async () => {
      await q(supabase.from('evolution').insert({ coach_id: uid, player_id: p.id, ...f, text: f.text.trim() }));
      setF({ ...f, text: '' });
      await load('evolution');
    }, 'Añadido a la evolución.');
  };
  const del = (x) => act(async () => {
    await q(supabase.from('evolution').delete().eq('id', x.id));
    await load('evolution');
    toast('Entrada eliminada.', { undo: () => act(async () => { await q(supabase.from('evolution').insert(x)); await load('evolution'); }) });
  });
  return (
    <section className="panel stack">
      <div><h3>Evolución y ajustes</h3><p className="muted small">Lo que valoras, lo que el jugador te cuenta y lo que cambias en su plan. Aparece también en su Programación.</p></div>
      <Tabs tabs={[['', 'Todo'], ['ajuste', 'Ajustes de plan'], ['valor', 'Valoraciones'], ['molestia', 'Molestias'], ['test', 'Tests'], ['comunicacion', 'Comunicación']]} value={cat} onChange={setCat} />
      {mine.length ? (
        <ul className="list evo">
          {mine.map((x) => (
            <li key={x.id}><span className={'cat cat-' + x.category}>{evoLabel(x.category)}</span><span>{x.text}</span><span className="muted small num">{fmtDate(x.date)}</span><button className="ib" aria-label="Eliminar entrada" onClick={() => del(x)}>✕</button></li>
          ))}
        </ul>
      ) : <Empty>Sin entradas{cat ? ' en esta categoría' : ''}.</Empty>}
      <form className="row" onSubmit={add}>
        <input aria-label="Fecha" type="date" required style={{ width: 'auto' }} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <select id="evo-cat" aria-label="Categoría" style={{ width: 'auto' }} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{EVO_CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <input id="evo-text" aria-label="Qué ha pasado" required style={{ flex: '1 1 240px' }} placeholder="Ej. Dolor 2/10 en press, cambio a landmine" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
        <button className="btn pri" type="submit">Añadir</button>
      </form>
    </section>
  );
}

function Tests({ p }) {
  const { tests = [], uid, load } = useCoach();
  const act = useAction();
  const toast = useToast();
  const mine = tests.filter((t) => t.player_id === p.id);
  const sums = testSummary(mine);
  const [f, setF] = useState({ date: iso(), test: 'CMJ', unit: 'cm', better: 'mas', bilateral: false, value: '', value_r: '', note: '' });
  const pickTest = (name) => { const pr = presetOf(name); setF({ ...f, test: name, ...(pr ? { unit: pr[1], better: pr[2], bilateral: pr[3] } : {}) }); };
  const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));
  const add = (e) => {
    e.preventDefault();
    act(async () => {
      const row = { coach_id: uid, player_id: p.id, date: f.date, test: f.test.trim(), unit: f.unit || null, better: f.better, value: num(f.value), value_r: f.bilateral ? num(f.value_r) : null, note: f.note || null };
      if (row.value == null && row.value_r == null) throw new Error('Pon al menos un valor.');
      const prev = testSummary(mine).find((s) => s.name === row.test);
      const saved = await q(supabase.from('tests').insert(row).select().single());
      const v = testValue(saved);
      const txt = `${row.test} ${fmtNum(v)} ${row.unit || ''}${row.value_r != null ? ` (izq. ${fmtNum(row.value)} · der. ${fmtNum(row.value_r)})` : ''}${prev ? ` · antes ${fmtNum(prev.v1)}` : ''}.`;
      await q(supabase.from('evolution').insert({ coach_id: uid, player_id: p.id, date: f.date, category: 'test', text: txt }));
      setF({ ...f, value: '', value_r: '', note: '' });
      await load(['tests', 'evolution']);
      if (isRecord(saved, [...tests, saved])) toast('¡Nueva marca! Sale en Inicio para que le felicites.');
    }, 'Test guardado y añadido a su evolución.');
  };
  const del = (t) => act(async () => {
    await q(supabase.from('tests').delete().eq('id', t.id));
    await load('tests');
    toast('Registro eliminado.', { undo: () => act(async () => { await q(supabase.from('tests').insert(t)); await load('tests'); }) });
  });
  return (
    <div className="stack">
      <form className="panel stack" onSubmit={add}>
        <h3>Nuevo registro</h3>
        <div className="row">
          <input aria-label="Fecha" type="date" required style={{ width: 'auto' }} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <input id="t-name" aria-label="Test" list="test-presets" required style={{ flex: '1 1 180px' }} value={f.test} onChange={(e) => pickTest(e.target.value)} placeholder="Test" />
          <datalist id="test-presets">{TEST_PRESETS.map((t) => <option key={t[0]} value={t[0]} />)}</datalist>
          <input aria-label="Unidad" style={{ width: 70 }} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="Unidad" />
          <select aria-label="Mejor si" style={{ width: 'auto' }} value={f.better} onChange={(e) => setF({ ...f, better: e.target.value })}><option value="mas">Mejor más alto</option><option value="menos">Mejor más bajo</option></select>
          <label className="row small"><input type="checkbox" style={{ width: 'auto' }} checked={f.bilateral} onChange={(e) => setF({ ...f, bilateral: e.target.checked })} /> Por lados</label>
        </div>
        <div className="row">
          <input id="t-val" aria-label={f.bilateral ? 'Izquierda' : 'Valor'} inputMode="decimal" style={{ width: 120 }} placeholder={f.bilateral ? 'Izquierda' : 'Valor'} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
          {f.bilateral && <input aria-label="Derecha" inputMode="decimal" style={{ width: 120 }} placeholder="Derecha" value={f.value_r} onChange={(e) => setF({ ...f, value_r: e.target.value })} />}
          <input aria-label="Nota" style={{ flex: '1 1 200px' }} placeholder="Nota (opcional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <button className="btn pri" type="submit">Guardar</button>
        </div>
      </form>
      {sums.length ? (
        <div className="panel tablewrap">
          <table>
            <thead><tr><th>Test</th><th>T0</th><th>Último</th><th>Cambio</th><th>Asimetría</th><th>Registros</th></tr></thead>
            <tbody>{sums.map((s) => {
              const a = asym(s.last);
              return (
                <tr key={s.name}>
                  <td><b>{s.name}</b> <span className="muted small">{s.unit}</span></td>
                  <td className="num">{fmtNum(s.v0)} <span className="muted small">{fmtDate(s.first.date)}</span></td>
                  <td className="num">{fmtNum(s.v1)} <span className="muted small">{fmtDate(s.last.date)}</span></td>
                  <td>{s.change == null ? '—' : <span className={'pill ' + (s.improved ? 'ok' : 'bad')}>{s.change > 0 ? '+' : ''}{fmtNum(s.change, 1)} %</span>}</td>
                  <td>{a == null ? '—' : <span className={'pill ' + (a > 15 ? 'bad' : a > 10 ? 'warn' : 'ok')} title="|izq − der| / mayor × 100. Más de 10-15 % merece revisarse (Bishop et al., 2018).">{fmtNum(a, 1)} %</span>}</td>
                  <td><span className="row">{s.list.map((t) => <span key={t.id} className="pill">{fmtNum(testValue(t))}{t.value_r != null ? ` (${fmtNum(t.value)}/${fmtNum(t.value_r)})` : ''}<button className="ib" style={{ width: 18, height: 18 }} aria-label={`Eliminar registro del ${fmtDate(t.date)}`} onClick={() => del(t)}>✕</button></span>)}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
          <p className="muted small" style={{ marginTop: 8 }}>Asimetría: diferencia entre lados respecto al mejor. Por encima del 10-15 % conviene revisarla junto con el resto de datos (Bishop et al., 2018).</p>
        </div>
      ) : <Empty>Sin tests. Guarda la valoración inicial como T0.</Empty>}
    </div>
  );
}

function BodyMap({ list, onPick }) {
  const color = (st) => (st === 'activa' ? 'var(--bad)' : st === 'readaptacion' ? 'var(--warn)' : 'var(--ok)');
  const views = [['f', 'Delante'], ['p', 'Detrás']];
  return (
    <div className="bodymap">
      <svg viewBox="0 0 250 290" role="img" aria-label="Mapa de lesiones">
        {views.map(([v, l], vi) => (
          <g key={v} transform={`translate(${vi * 125 + 2},0)`}>
            <text x="60" y="286" textAnchor="middle" fontSize="11" fill="var(--muted)">{l}</text>
            <g fill="var(--soft)" stroke="var(--line)" strokeWidth="1.5">
              <circle cx="60" cy="20" r="14" /><rect x="53" y="33" width="14" height="10" />
              <path d="M30 46 Q60 40 90 46 L86 120 Q60 128 34 120 Z" />
              <path d="M30 48 L18 110 L14 140 L22 141 L30 112 L38 60 Z" /><path d="M90 48 L102 110 L106 140 L98 141 L90 112 L82 60 Z" />
              <path d="M36 122 Q60 132 84 122 L80 205 L72 265 L62 266 L60 140 L58 266 L48 265 L40 205 Z" />
            </g>
            {ZONES.filter((z) => z[4] === v).map((z) => (
              <g key={z[0]}>
                {['izq', 'der'].map((side) => {
                  const mirrored = z[2] !== 60;
                  if (!mirrored && side === 'der') return null;
                  // En la vista frontal la izquierda del jugador queda a la derecha del dibujo
                  const x = !mirrored ? 60 : (v === 'f') === (side === 'izq') ? 120 - z[2] : z[2];
                  const hits = list.filter((i) => i.zone === z[0] && (!mirrored || i.side === side || i.side === 'central' || !i.side));
                  const st = hits.find((h) => h.status === 'activa') ? 'activa' : hits.find((h) => h.status === 'readaptacion') ? 'readaptacion' : hits.length ? 'recuperada' : null;
                  return (
                    <circle key={side} cx={x} cy={z[3]} r={st ? 7 : 5} fill={st ? color(st) : 'transparent'} stroke={st ? '#fff' : 'var(--muted)'} strokeDasharray={st ? '' : '2 2'}
                      style={{ cursor: 'pointer' }} onClick={() => onPick(z[0], mirrored ? side : 'central')}>
                      <title>{z[1]}{mirrored ? ` ${side === 'izq' ? 'izquierda' : 'derecha'}` : ''}{st ? ` · ${INJ_STATUS.find((s) => s[0] === st)[1]}` : ''}</title>
                    </circle>
                  );
                })}
              </g>
            ))}
          </g>
        ))}
      </svg>
      <p className="small muted" style={{ textAlign: 'center' }}>Toca una zona para registrar una lesión. Rojo activa · ámbar readaptación · verde recuperada.</p>
    </div>
  );
}

function Injuries({ p }) {
  const { injuries = [], uid, load } = useCoach();
  const act = useAction();
  const toast = useToast();
  const mine = injuries.filter((i) => i.player_id === p.id);
  const blank = { date: iso(), zone: 'isquio', side: 'der', kind: '', days_out: '', status: 'activa', recurrence: false, note: '' };
  const [f, setF] = useState(blank);
  const add = (e) => {
    e.preventDefault();
    act(async () => {
      await q(supabase.from('injuries').insert({ coach_id: uid, player_id: p.id, ...f, days_out: f.days_out === '' ? null : Number(f.days_out), kind: f.kind || null, note: f.note || null }));
      await q(supabase.from('evolution').insert({ coach_id: uid, player_id: p.id, date: f.date, category: 'molestia', text: `Lesión: ${zoneName(f.zone)}${f.side !== 'central' ? ` ${f.side === 'izq' ? 'izquierda' : 'derecha'}` : ''}${f.kind ? ` · ${f.kind}` : ''}${f.recurrence ? ' (recidiva)' : ''}.` }));
      setF(blank);
      await load(['injuries', 'evolution']);
    }, 'Lesión registrada.');
  };
  const upd = (i, patch) => act(async () => { await q(supabase.from('injuries').update(patch).eq('id', i.id)); await load('injuries'); });
  const del = (i) => act(async () => {
    await q(supabase.from('injuries').delete().eq('id', i.id));
    await load('injuries');
    toast('Lesión eliminada.', { undo: () => act(async () => { await q(supabase.from('injuries').insert(i)); await load('injuries'); }) });
  });
  return (
    <div className="grid2">
      <div className="panel stack">
        <h3>Mapa de lesiones</h3>
        <BodyMap list={mine} onPick={(zone, side) => { setF({ ...f, zone, side }); document.getElementById('inj-kind')?.focus(); }} />
      </div>
      <div className="stack">
        <form className="panel stack" onSubmit={add}>
          <h3>Registrar lesión</h3>
          <div className="grid2">
            <label className="f">Zona<select id="inj-zone" value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })}>{ZONES.map((z) => <option key={z[0]} value={z[0]}>{z[1]}</option>)}</select></label>
            <label className="f">Lado<select value={f.side} onChange={(e) => setF({ ...f, side: e.target.value })}>{SIDES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label className="f">Tipo<input id="inj-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} placeholder="Ej. Rotura fibrilar grado I" /></label>
            <label className="f">Fecha<input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
            <label className="f">Días de baja<input inputMode="numeric" value={f.days_out} onChange={(e) => setF({ ...f, days_out: e.target.value })} /></label>
            <label className="f">Estado<select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{INJ_STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          </div>
          <label className="row small"><input type="checkbox" style={{ width: 'auto' }} checked={f.recurrence} onChange={(e) => setF({ ...f, recurrence: e.target.checked })} /> Recidiva (misma lesión, mismo lado)</label>
          <input aria-label="Nota" placeholder="Nota (opcional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <div className="row"><button className="btn pri" type="submit">Guardar lesión</button><span className="muted small">{severity(f.days_out)?.[0] || ''}</span></div>
        </form>
        {mine.length ? (
          <ul className="list">
            {mine.map((i) => { const sv = severity(i.days_out); return (
              <li key={i.id}>
                <span><b>{zoneName(i.zone)}{i.side && i.side !== 'central' ? ` ${i.side === 'izq' ? 'izq.' : 'der.'}` : ''}</b>{i.kind ? ` · ${i.kind}` : ''} <span className="muted small">{fmtDate(i.date)}</span>
                  {sv && <span className={'pill ' + sv[1]}>{sv[0]}</span>}{i.recurrence && <span className="pill bad">Recidiva</span>}
                  {i.note && <div className="small muted">{i.note}</div>}</span>
                <span className="row">
                  <select aria-label="Estado" style={{ width: 'auto' }} value={i.status} onChange={(e) => upd(i, { status: e.target.value })}>{INJ_STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  <button className="ib" aria-label="Eliminar lesión" onClick={() => del(i)}>✕</button>
                </span>
              </li>
            ); })}
          </ul>
        ) : <Empty>Sin lesiones registradas.</Empty>}
        <p className="muted small">Gravedad por días de baja según el consenso de rugby de Fuller et al. (2007).</p>
      </div>
    </div>
  );
}

function Data({ p }) {
  const { load, go } = useCoach();
  const act = useAction();
  const [f, setF] = useState(p);
  useEffect(() => setF(p), [p.id]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value === '' ? null : e.target.value });
  const toggleFlag = (k) => setF({ ...f, flags: (f.flags || []).includes(k) ? f.flags.filter((x) => x !== k) : [...(f.flags || []), k] });
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      const keys = ['name', 'phone', 'position', 'plan', 'start_date', 'end_date', 'end_reason', 'important', 'restrictions', 'objective', 'club_days', 'extra_days', 'equipment', 'fee_type', 'flags'];
      const patch = Object.fromEntries(keys.map((k) => [k, f[k] ?? null]));
      patch.flags = f.flags || [];
      patch.email = (f.email || '').trim().toLowerCase();
      patch.fee = f.fee == null || f.fee === '' ? null : Number(String(f.fee).replace(',', '.'));
      patch.commitment_months = f.commitment_months == null || f.commitment_months === '' ? null : Number(f.commitment_months);
      await q(supabase.from('players').update(patch).eq('id', p.id));
      await load('players');
    }, 'Datos guardados.');
  };
  const remove = () => act(async () => {
    await q(supabase.from('players').delete().eq('id', p.id));
    await load();
    go('clientes');
  }, 'Jugador y todos sus datos eliminados.');
  const [confirm, setConfirm] = useState(false);
  return (
    <form className="panel stack" onSubmit={save}>
      <div className="grid2">
        <label className="f">Nombre<input value={f.name || ''} onChange={set('name')} required /></label>
        <label className="f">Correo<input type="email" value={f.email || ''} onChange={set('email')} required /></label>
        <label className="f">WhatsApp<input value={f.phone || ''} onChange={set('phone')} /></label>
        <label className="f">Posición<input value={f.position || ''} onChange={set('position')} /></label>
        <label className="f">Plan<select value={f.plan || ''} onChange={(e) => { const d = planDefaults(e.target.value); setF({ ...f, plan: e.target.value, ...(d ? { fee: d.fee, fee_type: d.type, commitment_months: d.commitment } : {}) }); }}>{planOptions(f.plan).map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="f">Importe (€)<span className="row"><input id="d-fee" inputMode="decimal" style={{ flex: 1 }} value={f.fee ?? ''} onChange={set('fee')} /><select style={{ width: 'auto' }} value={f.fee_type || 'mensual'} onChange={set('fee_type')}><option value="mensual">al mes</option><option value="unico">único</option></select></span></label>
        <label className="f">Objetivo<input id="d-obj" value={f.objective || ''} onChange={set('objective')} placeholder="Ej. Sprint 10 m < 1,80 s antes del 15/01" /></label>
        <label className="f">Club / partido<input id="d-club" value={f.club_days || ''} onChange={set('club_days')} placeholder="Ej. Mar y jue · domingo" /></label>
        <label className="f">Días extra conmigo<input value={f.extra_days || ''} onChange={set('extra_days')} placeholder="Ej. Lun, mié, vie · 60 min" /></label>
        <label className="f">Material<input value={f.equipment || ''} onChange={set('equipment')} placeholder="Ej. Gimnasio completo" /></label>
        <label className="f">Alta<input type="date" value={f.start_date || ''} onChange={set('start_date')} required /></label>
        <label className="f">Compromiso (meses)<input inputMode="numeric" value={f.commitment_months ?? ''} onChange={set('commitment_months')} /></label>
        <label className="f">Baja<input id="d-end" type="date" value={f.end_date || ''} onChange={set('end_date')} /></label>
        <label className="f">Motivo de baja<select value={f.end_reason || ''} onChange={set('end_reason')}><option value="">—</option>{END_REASONS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="f">Importante (aviso fijo, sale con el «!»)<input id="d-imp" value={f.important || ''} onChange={set('important')} placeholder="Ej. Turnos rotativos: en semanas de noche, bajar volumen" /></label>
        <label className="f">Restricciones (texto libre)<input value={f.restrictions || ''} onChange={set('restrictions')} /></label>
      </div>
      <fieldset className="stack" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
        <legend className="small" style={{ fontWeight: 700 }}>Restricciones que la Programación vigila</legend>
        <div className="row">{FLAGS.map(([k, l]) => <label key={k} className="row small" style={{ marginRight: 10 }}><input type="checkbox" style={{ width: 'auto' }} checked={(f.flags || []).includes(k)} onChange={() => toggleFlag(k)} /> {l}</label>)}</div>
        <p className="muted small">Si su programa incluye un ejercicio que choca, se marca en amarillo al editarlo.</p>
      </fieldset>
      <div className="between">
        <button className="btn pri" type="submit">Guardar datos</button>
        {confirm
          ? <span className="row"><span className="small">¿Borrar a {p.name} y todo su historial? No se puede deshacer.</span><button type="button" className="btn danger" onClick={remove}>Sí, borrar</button><button type="button" className="btn" onClick={() => setConfirm(false)}>No</button></span>
          : <button type="button" className="btn danger" onClick={() => setConfirm(true)}>Eliminar jugador</button>}
      </div>
      <p className="muted small">Para una baja normal pon la fecha de baja y el motivo: así se conserva el historial y se calcula la permanencia media. Eliminar borra todo (derecho de supresión del RGPD).</p>
    </form>
  );
}
