import React, { useState, useEffect } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q, qOpt } from '../lib/supabase.js';
import { matches, iso, fmtDate, waURL, monthsActive, wellness, addDays, mondayOf, parseISO } from '../lib/util.js';
import { useAction, useToast, Tabs, Empty, Bars, Line, WAIcon } from '../ui/ui.jsx';
import { waText, inviteLink } from './Home.jsx';
import { MESSAGES, variants } from '../lib/messages.js';
import { calendarWeekIdx, totalWeeks } from '../lib/program.js';
import { assignTemplates, SelBar } from './Programs.jsx';
import {
  PLANS, defaultPlan, planOptions, planPatch, feeLabel, planDefaults, feeText, commitment, reviewInfo, REVIEW_OPTIONS, SCREENING, wellLevel, monthKey,
  TEST_PRESETS, presetOf, fmtNum, testValue, asym, testSummary, severity, INJ_STATUS, SIDES, ZONES, zoneName,
  FLAGS, EVO_CATS, evoLabel, isRecord, payCover,
} from '../lib/domain.js';
import Flag from './Flag.jsx';
import { PlayerPrograms, Health, Notes } from './PlayerTabs.jsx';
import WeekNoteEditor from './WeekNote.jsx';

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
  const [sel, setSel] = useState([]);
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const baja = show === 'baja';
  const list = players.filter((p) => (baja ? !!p.end_date : !p.end_date) && matches(`${p.name} ${p.position || ''} ${p.plan || ''} ${p.email}`, qy));
  const ended = players.filter((p) => p.end_date);
  const avg = ended.length ? ended.reduce((a, p) => a + monthsActive(p), 0) / ended.length : null;
  const mk = monthKey();
  const payChip = (p) => {
    if (p.fee == null) return '—';
    const c = payCover(p, payments, mk);
    if (c.paid) return p.fee_type === 'unico' ? <span className="muted small">Pago único hecho</span> : <Chip level="ok">Pagado{p.fee_type === 'trimestral' ? ` · ${c.period}` : ''}</Chip>;
    return <Chip level="bad">Pendiente</Chip>;
  };

  return (
    <>
      <div className="pagehead">
        <div><h1>Clientes</h1><p>{players.filter((p) => !p.end_date).length} activos{avg != null ? ` · permanencia media ${avg.toFixed(1).replace('.', ',')} meses` : ''}</p></div>
        <button className="btn pri" onClick={() => go('clientes', 'nuevo')}>+ Nuevo cliente</button>
      </div>
      {!baja && players.some((p) => !p.end_date) && (
        <details className="panel"><summary style={{ cursor: 'pointer', fontWeight: 700 }}>✎ Nota de la semana para todos</summary><div style={{ marginTop: 10 }}><WeekNoteEditor all /></div></details>
      )}
      <div className="row">
        <input id="cq" style={{ maxWidth: 320 }} placeholder="Buscar por nombre, posición o plan" value={qy} onChange={(e) => setQy(e.target.value)} />
        <Tabs tabs={[['activos', 'Activos'], ['baja', 'De baja']]} value={show} onChange={(v) => { setShow(v); setSel([]); }} />
      </div>
      {sel.length > 0 && <ClientSelBar chosen={players.filter((p) => sel.includes(p.id))} onClear={() => setSel([])} />}
      {list.length ? (
        <div className="panel tablewrap">
          <table className="seltbl">
            <thead><tr><th style={{ width: 28 }}><input type="checkbox" aria-label="Seleccionar todos" checked={list.every((p) => sel.includes(p.id))} onChange={() => setSel(list.every((p) => sel.includes(p.id)) ? [] : list.map((p) => p.id))} /></th><th>Nombre</th><th>Posición o deporte</th><th>Plan</th><th>Alta</th>{baja && <><th>Baja</th><th>Motivo</th></>}<th>Tiempo</th>{!baja && <><th>Revisión</th><th>Bienestar</th><th>Pago {['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(mk.slice(5)) - 1]}</th><th>Acceso</th></>}</tr></thead>
            <tbody>
              {list.map((p) => {
                const c = lastCheckin(checkins, p.id); const w = wellness(c); const r = reviewInfo(p);
                return (
                  <tr key={p.id} className={sel.includes(p.id) ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => go('clientes', p.id)}>
                    <td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Seleccionar ${p.name}`} checked={sel.includes(p.id)} onChange={() => toggle(p.id)} /></td>
                    <td><b>{p.name}</b><Flag p={p} sm /></td>
                    <td>{p.position || (p.kind === 'personal' ? 'Entrenamiento personal' : '—')}</td>
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
      ) : <Empty>{players.length ? 'Nadie coincide con la búsqueda.' : 'Aún no tienes clientes. Añade el primero con «+ Nuevo cliente».'}</Empty>}
    </>
  );
}

// Acciones sobre varios clientes a la vez
function ClientSelBar({ chosen, onClear }) {
  const { programs, uid, load } = useCoach();
  const act = useAction();
  const tpls = programs.filter((x) => !x.player_id);
  const [mode, setMode] = useState(null);
  const [tid, setTid] = useState(tpls[0]?.id || '');
  const [start, setStart] = useState(iso(mondayOf(addDays(new Date(), 7))));
  const [plan, setPlan] = useState(defaultPlan().name);
  const n = chosen.length;
  const who = `${n} cliente${n === 1 ? '' : 's'}`;
  const doTpl = () => act(async () => {
    await assignTemplates({ uid, templates: tpls.filter((x) => x.id === tid), clients: chosen, start });
    await load('programs'); onClear();
  }, `Plantilla asignada a ${who}.`);
  const doPlan = () => act(async () => {
    for (const p of chosen) await q(supabase.from('players').update(planPatch(plan, p)).eq('id', p.id));
    await load('players'); onClear();
  }, `${who} ${n === 1 ? "pasa" : "pasan"} a ${plan}.`);
  const doDel = () => act(async () => {
    await q(supabase.from('players').delete().in('id', chosen.map((p) => p.id)));
    await load(); onClear();
  }, `${who} ${n === 1 ? "eliminado" : "eliminados"} con todos sus datos.`);
  return (
    <>
      <SelBar n={n} noun="cliente" onClear={onClear}>
        <button className={'btn sm' + (mode === 'tpl' ? ' pri' : '')} aria-expanded={mode === 'tpl'} onClick={() => setMode(mode === 'tpl' ? null : 'tpl')}>Asignar plantilla</button>
        <button className={'btn sm' + (mode === 'plan' ? ' pri' : '')} aria-expanded={mode === 'plan'} onClick={() => setMode(mode === 'plan' ? null : 'plan')}>Cambiar plan</button>
        <button className={'btn sm danger'} aria-expanded={mode === 'del'} onClick={() => setMode(mode === 'del' ? null : 'del')}>Eliminar</button>
      </SelBar>
      {mode === 'tpl' && (tpls.length ? (
        <section className="panel row" aria-label="Asignar plantilla">
          <b>Plantilla</b>
          <select id="msel-tpl" style={{ width: 'auto', maxWidth: 360 }} value={tid} onChange={(e) => setTid(e.target.value)}>{tpls.map((t) => <option key={t.id} value={t.id}>{t.name} · {totalWeeks(t.data)} sem</option>)}</select>
          <label className="row small">Empieza el<input type="date" style={{ width: 'auto' }} value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <button className="btn pri" onClick={doTpl}>Asignar a {who}</button>
        </section>
      ) : <Empty>Aún no tienes plantillas. Créalas en Programación.</Empty>)}
      {mode === 'plan' && (
        <section className="panel row" aria-label="Cambiar plan">
          <b>Plan</b>
          <select id="msel-plan" style={{ width: 'auto' }} value={plan} onChange={(e) => setPlan(e.target.value)}>{PLANS.map((x) => <option key={x.name} value={x.name}>{x.name} · {feeLabel(x)}</option>)}</select>
          <button className="btn pri" onClick={doPlan}>Pasar a {who}</button>
          <span className="muted small">Pone el importe, el tipo de pago, el compromiso y las revisiones del plan.</span>
        </section>
      )}
      {mode === 'del' && (
        <section className="panel stack" aria-label="Eliminar clientes" style={{ borderColor: 'var(--bad)' }}>
          <b>¿Borrar a {chosen.map((p) => p.name).join(', ')} y todo su historial?</b>
          <p className="muted small">No se puede deshacer. Para una baja normal pon la fecha de baja en su ficha: así se conserva el historial.</p>
          <div className="row"><button className="btn danger" onClick={doDel}>Sí, borrar {who}</button><button className="btn" onClick={() => setMode(null)}>No</button></div>
        </section>
      )}
    </>
  );
}

function NewPlayer() {
  const { uid, load, go, coach } = useCoach();
  const act = useAction();
  const [f, setF] = useState({ kind: 'equipo', name: '', email: '', phone: '', position: '', plan: defaultPlan().name, fee: defaultPlan().fee, fee_type: defaultPlan().type, start_date: iso(), objective: '', review_days: 14, commitment_months: 3 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setPlan = (e) => { const d = planDefaults(e.target.value); setF({ ...f, plan: e.target.value, ...(d ? { fee: d.fee, fee_type: d.type, commitment_months: d.commitment ?? '', review_days: d.review || f.review_days } : {}) }); };
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      const rd = Number(f.review_days) || 14;
      const row = await qOpt((x) => supabase.from('players').insert(x).select().single(), {
        ...f, coach_id: uid, email: f.email.trim().toLowerCase() || null, name: f.name.trim(), fee: f.fee === '' ? null : Number(f.fee),
        review_days: rd, commitment_months: Number(f.commitment_months) || null, next_review: iso(addDays(parseISO(f.start_date), rd)), objective: f.objective || null,
      });
      await load('players');
      go('clientes', row.id);
    }, 'Cliente añadido. Mándale su enlace de acceso por WhatsApp.');
  };
  return (
    <>
      <div className="pagehead"><div><h1>Nuevo cliente</h1><p>Con su correo podrá entrar y ver solo lo suyo.</p></div><button className="btn" onClick={() => go('clientes')}>Volver</button></div>
      <form className="panel stack" onSubmit={save} style={{ maxWidth: 720 }}>
        <div className="grid2">
          <fieldset className="f kindpick" style={{ gridColumn: '1 / -1' }}><legend>Tipo de cliente</legend>
            <KindPick value={f.kind} onChange={(v) => setF({ ...f, kind: v })} />
          </fieldset>
          <label className="f">Nombre y apellidos<input id="np-name" required value={f.name} onChange={set('name')} /></label>
          <label className="f">Correo (opcional: si no lo sabes, se registra él con el enlace)<input id="np-email" type="email" value={f.email} onChange={set('email')} /></label>
          <label className="f">WhatsApp (con prefijo, ej. 34600111222)<input id="np-phone" inputMode="tel" value={f.phone} onChange={set('phone')} /></label>
          <label className="f">Posición o deporte<input id="np-pos" value={f.position} onChange={set('position')} placeholder={f.kind === 'personal' ? 'Ej. Running, pádel…' : 'Ej. Pilier, Ala…'} /></label>
          <label className="f">Plan<select id="np-plan" value={f.plan} onChange={setPlan}>{planOptions().map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="f">Importe (€)<span className="row"><input id="np-fee" inputMode="decimal" style={{ flex: 1 }} value={f.fee ?? ''} onChange={set('fee')} /><select style={{ width: 'auto' }} value={f.fee_type} onChange={set('fee_type')}><option value="mensual">al mes</option><option value="trimestral">al trimestre</option><option value="unico">único</option></select></span></label>
          <label className="f">Fecha de alta<input id="np-start" type="date" required value={f.start_date} onChange={set('start_date')} /></label>
          <label className="f">Compromiso (meses)<input inputMode="numeric" value={f.commitment_months} onChange={set('commitment_months')} /></label>
          <label className="f">Objetivo<input id="np-obj" value={f.objective} onChange={set('objective')} placeholder="Ej. Sprint 10 m < 1,80 s antes del 15/01" /></label>
          <label className="f">Revisiones<select value={f.review_days} onChange={set('review_days')}>{REVIEW_OPTIONS.map(([d, l]) => <option key={d} value={d}>{l}</option>)}</select></label>
        </div>
        <div className="row"><button className="btn pri" type="submit">Guardar cliente</button></div>
        <p className="muted small">Después de guardar te aparece el botón para mandarle por WhatsApp su enlace personal de {coach.brand_name}. Con él se registra con su correo y queda vinculado a esta ficha.</p>
      </form>
    </>
  );
}

const TEMPLATES = ['revision', 'checkin', 'bienestar', 'dolor', 'carga', 'sesiones', 'partido', 'marca', 'pago', 'renov', 'libre'].map((k) => [k, MESSAGES[k].label]);

function PlayerDetail({ id }) {
  const { players, go, coach, load, uid } = useCoach();
  const act = useAction();
  const p = players.find((x) => x.id === id);
  const [tab, setTab] = useState('resumen');
  const [waOpen, setWaOpen] = useState(false);
  if (!p) return <MissingPlayer id={id} />;
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
  return (
    <>
      <button className="btn ghost sm" style={{ justifySelf: 'start' }} onClick={() => go('clientes')}>← Todos los clientes</button>
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
          {!p.user_id && p.invite_code && <CopyInvite p={p} />}
          {p.phone && <button type="button" className="btn pri" aria-expanded={waOpen} onClick={() => setWaOpen(!waOpen)}><WAIcon /> {p.user_id ? 'WhatsApp' : 'Enviar acceso'}</button>}
        </div>
      </div>
      {waOpen && p.phone && <WaComposer p={p} kinds={p.user_id ? TEMPLATES : [['invitar', MESSAGES.invitar.label]]} />}
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
      {!p.end_date && <WeekNoteEditor p={p} />}
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
          <div className="tablewrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>RPE</th><th>Min</th><th>sRPE</th><th>Comentario</th></tr></thead>
            <tbody>{[...ls].reverse().slice(0, 10).map((l) => <tr key={l.id}><td>{fmtDate(l.date)}</td><td>{l.session_key === 'club' ? <span className="pill brand">Club</span> : l.session_key === 'partido' ? <span className="pill warn">Partido</span> : 'Sesión'}</td><td className="num">{l.rpe ?? '—'}</td><td className="num">{l.duration_min ?? '—'}</td><td className="num">{l.srpe ?? '—'}</td><td>{l.note || ''}</td></tr>)}</tbody>
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
      <div><h3>Evolución y ajustes</h3><p className="muted small">Lo que valoras, lo que el cliente te cuenta y lo que cambias en su plan. Aparece también en su Programación.</p></div>
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
                  // En la vista frontal la izquierda del cliente queda a la derecha del dibujo
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
      const keys = ['kind', 'name', 'phone', 'position', 'plan', 'start_date', 'end_date', 'end_reason', 'important', 'restrictions', 'objective', 'club_days', 'extra_days', 'equipment', 'fee_type', 'flags'];
      const patch = Object.fromEntries(keys.map((k) => [k, f[k] ?? null]));
      patch.flags = f.flags || [];
      patch.email = (f.email || '').trim().toLowerCase() || null;
      patch.fee = f.fee == null || f.fee === '' ? null : Number(String(f.fee).replace(',', '.'));
      patch.commitment_months = f.commitment_months == null || f.commitment_months === '' ? null : Number(f.commitment_months);
      if (!p.kind && patch.kind === 'equipo') delete patch.kind;
      await qOpt((x) => supabase.from('players').update(x).eq('id', p.id), patch);
      await load('players');
    }, 'Datos guardados.');
  };
  const remove = () => act(async () => {
    await q(supabase.from('players').delete().eq('id', p.id));
    await load();
    go('clientes');
  }, 'Cliente y todos sus datos eliminados.');
  const [confirm, setConfirm] = useState(false);
  return (
    <form className="panel stack" onSubmit={save}>
      <fieldset className="f kindpick"><legend>Tipo de cliente</legend><KindPick value={f.kind || 'equipo'} onChange={(v) => setF({ ...f, kind: v })} /></fieldset>
      <div className="grid2">
        <label className="f">Nombre<input value={f.name || ''} onChange={set('name')} required /></label>
        <label className="f">Correo{p.user_id ? '' : ' (opcional)'}<input type="email" value={f.email || ''} onChange={set('email')} required={!!p.user_id} /></label>
        <label className="f">WhatsApp<input value={f.phone || ''} onChange={set('phone')} /></label>
        <label className="f">Posición o deporte<input value={f.position || ''} onChange={set('position')} /></label>
        <label className="f">Plan<select value={f.plan || ''} onChange={(e) => { const d = planDefaults(e.target.value); setF({ ...f, plan: e.target.value, ...(d ? { fee: d.fee, fee_type: d.type, commitment_months: d.commitment } : {}) }); }}>{planOptions(f.plan).map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="f">Importe (€)<span className="row"><input id="d-fee" inputMode="decimal" style={{ flex: 1 }} value={f.fee ?? ''} onChange={set('fee')} /><select style={{ width: 'auto' }} value={f.fee_type || 'mensual'} onChange={set('fee_type')}><option value="mensual">al mes</option><option value="trimestral">al trimestre</option><option value="unico">único</option></select></span></label>
        <label className="f">Objetivo<input id="d-obj" value={f.objective || ''} onChange={set('objective')} placeholder="Ej. Sprint 10 m < 1,80 s antes del 15/01" /></label>
        {f.kind !== 'personal' && <label className="f">Club / partido<input id="d-club" value={f.club_days || ''} onChange={set('club_days')} placeholder="Ej. Mar y jue · domingo" /></label>}
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
          : <button type="button" className="btn danger" onClick={() => setConfirm(true)}>Eliminar cliente</button>}
      </div>
      <p className="muted small">Para una baja normal pon la fecha de baja y el motivo: así se conserva el historial y se calcula la permanencia media. Eliminar borra todo (derecho de supresión del RGPD).</p>
    </form>
  );
}

// Redactor de WhatsApp: elige la situación, cambia de versión y retoca el texto antes de enviarlo
function WaComposer({ p, kinds }) {
  const { coach, tests = [], checkins } = useCoach();
  const [kind, setKind] = useState(kinds[0][0]);
  const [off, setOff] = useState(0);
  const extraFor = (k) => {
    if (k === 'pago') return new Date().toLocaleDateString('es-ES', { month: 'long' });
    if (k === 'marca') { const t = [...tests].filter((x) => x.player_id === p.id).pop(); return t ? `${t.test} ${fmtNum(testValue(t))} ${t.unit || ''}`.trim() : ''; }
    if (k === 'dolor') { const c = lastCheckin(checkins, p.id); return c?.pain ? `${c.pain}/10` : ''; }
    return '';
  };
  const [text, setText] = useState(() => waText(p, kind, coach, extraFor(kind), 0));
  const regen = (k, o) => { setKind(k); setOff(o); setText(waText(p, k, coach, extraFor(k), o)); };
  return (
    <div className="panel stack wacomp">
      <div className="row">
        {kinds.length > 1 && <select aria-label="Tipo de mensaje" style={{ width: 'auto' }} value={kind} onChange={(e) => regen(e.target.value, 0)}>{kinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
        {variants(kind) > 1 && <button type="button" className="btn sm" onClick={() => regen(kind, off + 1)}>↻ Otra versión ({(off % variants(kind)) + 1}/{variants(kind)})</button>}
      </div>
      <textarea aria-label="Mensaje de WhatsApp" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row"><a className="btn pri" target="_blank" rel="noopener" href={waURL(p.phone, text)}><WAIcon /> Abrir en WhatsApp</a><span className="muted small">Puedes retocarlo antes de enviarlo.</span></div>
    </div>
  );
}

// Cliente que aún no está en la lista: recarga una vez antes de decir que no existe
function MissingPlayer({ id }) {
  const { load, go } = useCoach();
  const [tried, setTried] = useState(false);
  useEffect(() => { let off = false; load('players').finally(() => { if (!off) setTried(true); }); return () => { off = true; }; }, [id]);
  if (!tried) return <p className="muted">Cargando…</p>;
  return <Empty>No se encuentra este cliente. <button className="btn sm" onClick={() => go('clientes')}>Volver</button></Empty>;
}

// Juega en un equipo (club, partidos, RPE del club) o entrena por su cuenta
export const KINDS = [['equipo', 'Juega en un equipo', 'Club, partidos y RPE del club'], ['personal', 'Entrenamiento personal', 'Sin club ni partidos']];
function KindPick({ value, onChange }) {
  return (
    <div className="seg" role="radiogroup" aria-label="Tipo de cliente">
      {KINDS.map(([k, l, d]) => (
        <button type="button" key={k} role="radio" aria-checked={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}><b>{l}</b><span className="muted small">{d}</span></button>
      ))}
    </div>
  );
}

// Copia el enlace personal para mandarlo por donde quieras
function CopyInvite({ p }) {
  const toast = useToast();
  const copy = async () => {
    try { await navigator.clipboard.writeText(inviteLink(p)); toast('Enlace copiado. Pégalo en WhatsApp.'); }
    catch { window.prompt('Copia el enlace:', inviteLink(p)); }
  };
  return <button type="button" className="btn" onClick={copy}>Copiar enlace de acceso</button>;
}
