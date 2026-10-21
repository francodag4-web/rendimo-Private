import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase.js';
import { fmtDate, iso, addDays, parseISO, wellness } from '../lib/util.js';
import { fmtNum, testValue } from '../lib/domain.js';
import { Loading } from './ui.jsx';
import TestRadar from './TestRadar.jsx';
import {
  metricSeries, goalStatus, GOAL_STATUS, blocks, blockStats, itemIndex, weeklyLoads, loadProgression,
  bodyFat, ageAt, skinSum, PERIMETERS,
} from '../lib/progress.js';

const soft = (b) => b.then(({ data, error }) => (error ? [] : data || []));
const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)} %`);
const delta = (a, b, d = 1, better = 'mas') => {
  if (a == null || b == null) return null;
  const v = b - a; if (Math.abs(v) < 1e-9) return <span className="dl">=</span>;
  const good = better === 'mas' ? v > 0 : v < 0;
  return <span className={'dl ' + (better === 'neutro' ? '' : good ? 'up' : 'down')}>{v > 0 ? '+' : ''}{fmtNum(v, d)}</span>;
};

// Informe de progreso del cliente (lo abren el entrenador y el cliente). «Descargar PDF» usa la impresión del navegador.
export default function Report(props) { return createPortal(<ReportView {...props} />, document.body); }

function ReportView({ playerId, report, coach: coachProp, onClose }) {
  const [d, setD] = useState(null);
  const from = report.date_from; const to = report.date_to;
  useEffect(() => {
    let off = false;
    (async () => {
      const prevFrom = iso(addDays(parseISO(from), -28));
      const [pl, tests, body, goals, logs, checkins, programs, injuries, evolution] = await Promise.all([
        soft(supabase.from('players').select('*').eq('id', playerId).limit(1)),
        soft(supabase.from('tests').select('*').eq('player_id', playerId).order('date').order('created_at')),
        soft(supabase.from('body_measures').select('*').eq('player_id', playerId).order('date')),
        soft(supabase.from('goals').select('*').eq('player_id', playerId).order('deadline')),
        soft(supabase.from('session_logs').select('*').eq('player_id', playerId).gte('date', prevFrom).lte('date', to).order('date')),
        soft(supabase.from('checkins').select('*').eq('player_id', playerId).gte('date', prevFrom).lte('date', to).order('date')),
        soft(supabase.from('programs').select('*').eq('player_id', playerId)),
        soft(supabase.from('injuries').select('*').eq('player_id', playerId).gte('date', from).lte('date', to).order('date')),
        soft(supabase.from('evolution').select('*').eq('player_id', playerId).gte('date', from).lte('date', to).order('date')),
      ]);
      const player = pl[0];
      let coach = coachProp;
      if (!coach && player) coach = (await soft(supabase.from('coaches').select('*').eq('id', player.coach_id).limit(1)))[0];
      if (!off) setD({ player, coach, tests, body, goals, logs, checkins, programs, injuries, evolution, prevFrom });
    })();
    return () => { off = true; };
  }, [playerId, from, to]);
  useEffect(() => { document.body.classList.add('report-open'); return () => document.body.classList.remove('report-open'); }, []);

  const r = useMemo(() => {
    if (!d?.player) return null;
    const idx = itemIndex(d.programs);
    const inP = (x) => x.date >= from && x.date <= to;
    const bl = blocks(from, to).map((b) => blockStats(b, d, idx));
    const prevB = blockStats({ from: d.prevFrom, to: iso(addDays(parseISO(from), -1)) }, d, idx);
    const all = blockStats({ from, to }, d, idx);
    const goals = d.goals.map((g) => ({ g, s: goalStatus(g, metricSeries(g.metric, d), to) }));
    // Tests: primer registro hasta el inicio del periodo (o el primero dentro) frente al último del periodo
    const names = [...new Set(d.tests.filter((t) => t.date <= to).map((t) => t.test))];
    const tests = names.map((n) => {
      const list = d.tests.filter((t) => t.test === n && t.date <= to && testValue(t) != null);
      const before = list.filter((t) => t.date <= from); const within = list.filter(inP);
      const a = before.length ? before[before.length - 1] : within[0]; const b = list[list.length - 1];
      if (!a || !b) return null;
      const va = testValue(a), vb = testValue(b);
      return { n, unit: b.unit, better: b.better || 'mas', a, b, va, vb, ch: a.id !== b.id && va ? ((vb - va) / Math.abs(va)) * 100 : null };
    }).filter(Boolean);
    const body = d.body.filter((m) => m.date <= to);
    const bodyA = [...body].reverse().find((m) => m.date <= from) || body.find(inP); const bodyB = body[body.length - 1];
    const weeks = weeklyLoads(d.logs.filter(inP), from, to);
    const wdays = Array.from({ length: Math.round((parseISO(to) - parseISO(from)) / 864e5) + 1 }, (_, i) => { const x = iso(addDays(parseISO(from), i)); const c = d.checkins.find((k) => k.date === x); return { date: x, v: c ? wellness(c) : null }; });
    return { bl, prevB, all, goals, tests, bodyA, bodyB, body: body.filter(inP), weeks, wdays, prog: loadProgression(d.logs.filter(inP), idx).slice(0, 8), inj: d.injuries, evo: d.evolution };
  }, [d, from, to]);

  const download = () => {
    const t = document.title;
    const name = (d?.player?.name || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-');
    document.title = `Informe-${name}-${from}-a-${to}`;
    window.print();
    setTimeout(() => { document.title = t; }, 1000);
  };

  if (!d) return <div className="report-wrap"><Loading /></div>;
  if (!d.player || !r) return <div className="report-wrap"><div className="report-bar"><button className="btn" onClick={onClose}>Cerrar</button></div><p>No se pudo cargar el informe.</p></div>;
  const { player: p, coach } = d;
  const met = r.goals.filter((x) => x.s.status === 'conseguido').length;
  const maxW = Math.max(1, ...r.weeks.map((w) => w.value));
  const age = ageAt(p.birth_date, to);
  return (
    <div className="report-wrap" role="dialog" aria-label="Informe de progreso">
      <div className="report-bar">
        <button className="btn" onClick={onClose}>Cerrar</button>
        <span className="muted small">{report.preview ? 'Vista previa' : 'Informe publicado'}</span>
        <button className="btn pri" onClick={download}>Descargar PDF</button>
      </div>
      <article className="report-sheet">
        <header className="rp-head">
          <div className="rp-brand">
            {coach?.logo ? <img src={coach.logo} alt="" /> : <span className="logo">{(coach?.brand_short || coach?.brand_name || 'R').slice(0, 2)}</span>}
            <div><b>{coach?.brand_name}</b><span>Informe de progreso</span></div>
          </div>
          <div className="rp-meta"><b>{p.name}</b><span>{fmtDate(from)} – {fmtDate(to)}</span></div>
        </header>
        <div className="rp-sub">{[p.position, p.plan, age ? `${age} años` : null, `con ${coach?.brand_short || coach?.brand_name || 'su entrenador'} desde el ${fmtDate(p.start_date)}`].filter(Boolean).join(' · ')}{p.objective ? <><br /><b>Objetivo principal:</b> {p.objective}</> : null}</div>

        <section className="rp-kpis">
          <div><span>Sesiones</span><b>{r.all.sessions}</b><small>{r.all.programSessions} del programa · {r.all.clubSessions} club/partido</small></div>
          <div><span>Adherencia</span><b>{pct(r.all.adherence)}</b><small>{r.all.scheduled ? `de ${r.all.scheduled} programadas` : 'sin sesiones programadas'}</small></div>
          <div><span>Carga semanal media</span><b>{fmtNum(r.all.weeklyLoad, 0)}</b><small>UA (RPE × min)</small></div>
          <div><span>Bienestar medio</span><b>{fmtNum(r.all.wellness, 1)}<i>/25</i></b><small>{r.all.checkinDays} check-ins</small></div>
          <div><span>Objetivos</span><b>{met}<i>/{r.goals.length}</i></b><small>conseguidos</small></div>
        </section>

        <section className="rp-sec">
          <h2>Objetivos y plazos</h2>
          {r.goals.length ? (
            <table className="rp-t">
              <thead><tr><th>Objetivo</th><th>Inicio</th><th>Actual</th><th>Meta</th><th>Fecha límite</th><th>Estado</th></tr></thead>
              <tbody>{r.goals.map(({ g, s }) => (
                <tr key={g.id}>
                  <td><b>{g.title}</b>{s.prog != null && <div className="gbar"><i className={GOAL_STATUS[s.status][1]} style={{ width: `${s.prog * 100}%` }} /></div>}</td>
                  <td className="num">{fmtNum(s.start)} <small>{fmtDate(g.start_date)}</small></td>
                  <td className="num">{fmtNum(s.cur)}</td>
                  <td className="num"><b>{fmtNum(g.target)}</b> {g.unit}</td>
                  <td>{g.deadline ? fmtDate(g.deadline) : '—'}</td>
                  <td><span className={'pill ' + GOAL_STATUS[s.status][1]}>{GOAL_STATUS[s.status][0]}</span>{s.hit && <small> el {fmtDate(s.hit)} · en {s.days} días{s.onTime === true ? ', en plazo' : s.onTime === false ? ', fuera de plazo' : ''}</small>}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="muted">Sin objetivos registrados.</p>}
        </section>

        {r.tests.length > 0 && (
          <section className="rp-sec">
            <h2>Rendimiento</h2>
            <div className="rp-two">
              <TestRadar tests={d.tests} storeKey={'rep:' + p.id} title="Perfil de tests" from={from} to={to} controls={false} />
              <table className="rp-t">
                <thead><tr><th>Test</th><th>Antes</th><th>Ahora</th><th>Cambio</th></tr></thead>
                <tbody>{r.tests.map((t) => (
                  <tr key={t.n}><td><b>{t.n}</b></td><td className="num">{fmtNum(t.va)} <small>{fmtDate(t.a.date)}</small></td><td className="num">{fmtNum(t.vb)} {t.unit} <small>{fmtDate(t.b.date)}</small></td>
                    <td>{t.ch == null ? '—' : <span className={'dl ' + ((t.better === 'mas' ? t.ch > 0 : t.ch < 0) ? 'up' : 'down')}>{t.ch > 0 ? '+' : ''}{fmtNum(t.ch, 1)} %</span>}</td></tr>
                ))}</tbody>
              </table>
            </div>
            {r.prog.length > 0 && (<>
              <h3>Progresión de cargas</h3>
              <table className="rp-t"><thead><tr><th>Ejercicio</th><th>Primera</th><th>Última</th><th>Cambio</th></tr></thead>
                <tbody>{r.prog.map((e) => <tr key={e.name}><td>{e.name}</td><td className="num">{fmtNum(e.first.kg)} kg <small>{fmtDate(e.first.date)}</small></td><td className="num">{fmtNum(e.last.kg)} kg <small>{fmtDate(e.last.date)}</small></td><td>{delta(e.first.kg, e.last.kg, 1)}</td></tr>)}</tbody></table>
            </>)}
          </section>
        )}

        <section className="rp-sec">
          <h2>Carga e intensidad</h2>
          <div className="rp-bars" aria-label="Carga semanal">
            {r.weeks.map((w) => <div key={w.from}><i style={{ height: `${(w.value / maxW) * 100}%` }} title={`${w.value}`} /><span>{w.label}</span><b>{w.value ? fmtNum(w.value, 0) : ''}</b></div>)}
          </div>
          <p className="muted small">Carga semanal = suma de RPE × minutos de cada sesión, incluidos entrenos de club y partidos (Foster et al., 2001).</p>
          <BlockTable rows={[r.prevB, ...r.bl]} prev={r.prevB} cols={[
            ['Sesiones', (b) => b.sessions, 0], ['Adherencia', (b) => b.adherence, 'pct'], ['RPE medio', (b) => b.rpe, 1, 'neutro'], ['Carga semanal', (b) => b.weeklyLoad, 0, 'neutro'],
            ['Volumen est. (kg)', (b) => b.volume, 0], ['FC media', (b) => b.hrAvg, 0, 'neutro'], ['FC máx', (b) => b.hrMax, 0, 'neutro'], ['Descanso medio (s)', (b) => b.rest, 0, 'neutro'],
          ]} />
        </section>

        {(r.bodyB || r.body.length > 0) && (
          <section className="rp-sec">
            <h2>Composición corporal</h2>
            <table className="rp-t">
              <thead><tr><th>Medida</th><th>{r.bodyA ? fmtDate(r.bodyA.date) : 'Inicio'}</th><th>{r.bodyB ? fmtDate(r.bodyB.date) : 'Ahora'}</th><th>Cambio</th></tr></thead>
              <tbody>
                {[['Peso (kg)', 'weight', 'neutro'], ...PERIMETERS.map(([k, l]) => [`${l} (cm)`, k, k === 'waist' || k === 'hip' ? 'menos' : 'mas'])].filter(([, k]) => r.bodyB?.[k] != null).map(([l, k, bt]) => (
                  <tr key={k}><td>{l}</td><td className="num">{fmtNum(r.bodyA?.[k], 1)}</td><td className="num">{fmtNum(r.bodyB?.[k], 1)}</td><td>{r.bodyA && r.bodyA.id !== r.bodyB.id ? delta(Number(r.bodyA[k]), Number(r.bodyB[k]), 1, bt) : '—'}</td></tr>
                ))}
                {skinSum(r.bodyB || {}) != null && <tr><td>Suma de pliegues (mm)</td><td className="num">{fmtNum(r.bodyA && skinSum(r.bodyA), 1)}</td><td className="num">{fmtNum(skinSum(r.bodyB), 1)}</td><td>{r.bodyA && r.bodyA.id !== r.bodyB.id ? delta(skinSum(r.bodyA), skinSum(r.bodyB), 1, 'menos') : '—'}</td></tr>}
                {bodyFat(r.bodyB || {}, p.sex, ageAt(p.birth_date, r.bodyB?.date || to)) && (() => {
                  const fb = bodyFat(r.bodyB, p.sex, ageAt(p.birth_date, r.bodyB.date)); const fa = r.bodyA && bodyFat(r.bodyA, p.sex, ageAt(p.birth_date, r.bodyA.date));
                  return <tr><td>% grasa <small>({fb.method}, Siri)</small></td><td className="num">{fa ? fmtNum(fa.pct, 1) : '—'}</td><td className="num"><b>{fmtNum(fb.pct, 1)}</b></td><td>{fa && r.bodyA.id !== r.bodyB.id ? delta(fa.pct, fb.pct, 1, 'menos') : '—'}</td></tr>;
                })()}
              </tbody>
            </table>
            <p className="muted small">Perímetros con cinta y pliegues con plicómetro (protocolo ISAK). La plicometría tiene un error de ±3-5 % en el % de grasa: la tendencia de la suma de pliegues es el dato más fiable.</p>
          </section>
        )}

        <section className="rp-sec">
          <h2>Recuperación y bienestar</h2>
          <Spark days={r.wdays} />
          <BlockTable rows={[r.prevB, ...r.bl]} prev={r.prevB} cols={[
            ['Bienestar (5-25)', (b) => b.wellness, 1], ['Sueño (1-5)', (b) => b.sleep, 1], ['Energía (1-5)', (b) => b.fatigue, 1], ['Agujetas (1-5)', (b) => b.soreness, 1],
            ['Estrés (1-5)', (b) => b.stress, 1], ['Dolor (0-10)', (b) => b.pain, 1, 'menos'], ['Días con check-in', (b) => b.checkinDays, 0],
          ]} />
          <p className="muted small">Escalas del check-in diario: 5 es el mejor valor (más sueño, más energía, menos agujetas y estrés). Se comparan bloques de 4 semanas porque el rendimiento de un solo día fluctúa.</p>
        </section>

        {(r.inj.length > 0 || r.evo.length > 0) && (
          <section className="rp-sec">
            <h2>Incidencias y ajustes</h2>
            <ul className="rp-list">
              {r.inj.map((i) => <li key={i.id}><b>{fmtDate(i.date)}</b> · Lesión: {i.zone}{i.side ? ` (${i.side})` : ''}{i.days_out ? ` · ${i.days_out} días de baja` : ''}{i.note ? ` · ${i.note}` : ''}</li>)}
              {r.evo.map((e) => <li key={e.id}><b>{fmtDate(e.date)}</b> · {e.text}</li>)}
            </ul>
          </section>
        )}

        {(report.summary || report.next_steps) && (
          <section className="rp-sec rp-coach">
            <h2>Valoración del entrenador</h2>
            {report.summary && <p>{report.summary}</p>}
            {report.next_steps && <><h3>Próximos pasos</h3><p>{report.next_steps}</p></>}
          </section>
        )}
        <footer className="rp-foot">{coach?.brand_name} · generado el {fmtDate(iso())} con Rendimo</footer>
      </article>
    </div>
  );
}

// Tabla por bloques de 4 semanas; la primera columna es el bloque anterior al periodo (referencia)
function BlockTable({ rows, cols, prev }) {
  const show = cols.filter(([, f]) => rows.some((b) => f(b) != null && f(b) !== 0));
  if (!show.length) return null;
  const fmt = (v, dg) => (v == null ? '—' : dg === 'pct' ? pct(v) : fmtNum(v, dg));
  return (
    <table className="rp-t rp-blocks">
      <thead><tr><th></th>{rows.map((b, i) => <th key={b.from}>{i === 0 ? 'Bloque anterior' : `Bloque ${i}`}<small>{fmtDate(b.from)} – {fmtDate(b.to)}</small></th>)}</tr></thead>
      <tbody>{show.map(([l, f, dg, better]) => (
        <tr key={l}><td>{l}</td>{rows.map((b, i) => <td key={b.from} className={'num' + (i === 0 ? ' muted' : '')}>{fmt(f(b), dg)}{i > 0 && f(rows[i - 1]) != null && f(b) != null ? <> {delta(f(rows[i - 1]) * (dg === 'pct' ? 100 : 1), f(b) * (dg === 'pct' ? 100 : 1), dg === 'pct' ? 0 : dg, better || 'mas')}</> : null}</td>)}</tr>
      ))}</tbody>
    </table>
  );
  void prev;
}

// Bienestar diario (5-25) en el periodo
function Spark({ days }) {
  const W = 700, H = 120, pad = 16;
  const pts = days.map((x, i) => (x.v == null ? null : [pad + (i * (W - 2 * pad)) / Math.max(1, days.length - 1), H - pad - ((x.v - 5) / 20) * (H - 2 * pad)]));
  // Una sola línea uniendo los días con check-in (los días sin dato no cortan la tendencia)
  const segs = [pts.filter(Boolean)].filter((x) => x.length);
  if (!segs.length) return <p className="muted small">Sin check-ins en el periodo.</p>;
  const y13 = H - pad - ((13 - 5) / 20) * (H - 2 * pad);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rp-spark" role="img" aria-label="Bienestar diario">
      <line x1={pad} x2={W - pad} y1={y13} y2={y13} className="ref" />
      {segs.map((s, i) => <polyline key={i} points={s.map((p) => p.join(',')).join(' ')} />)}
      {pts.filter(Boolean).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" />)}
      <text x={W - pad} y={y13 - 4} textAnchor="end">13 · umbral bajo</text>
    </svg>
  );
}
