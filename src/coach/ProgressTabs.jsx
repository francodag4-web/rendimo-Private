import React, { useMemo, useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { iso, fmtDate, addDays, parseISO } from '../lib/util.js';
import { useAction, useToast, Empty } from '../ui/ui.jsx';
import { fmtNum, TEST_PRESETS, presetOf, parseTestValue } from '../lib/domain.js';
import { metricSeries, goalStatus, GOAL_STATUS, BODY_METRICS, PERIMETERS, SKINFOLDS, bodyFat, ageAt, skinSum } from '../lib/progress.js';
import Report from '../ui/Report.jsx';

const num = (v) => { const n = parseTestValue(v); return n == null || Number.isNaN(n) ? null : n; };

// ---------- Objetivos con plazo ----------
export function Goals({ p }) {
  const { goals = [], tests = [], body = [], uid, load } = useCoach();
  const act = useAction();
  const toast = useToast();
  const mine = goals.filter((g) => g.player_id === p.id);
  const ctx = { tests: tests.filter((t) => t.player_id === p.id), body: body.filter((m) => m.player_id === p.id), player: p };
  const own = [...new Set(ctx.tests.map((t) => t.test))].filter((x) => !presetOf(x) && x !== 'Peso corporal');
  const metrics = [...TEST_PRESETS.filter((t) => t[0] !== 'Peso corporal').map((t) => [t[0], t[1], t[2]]), ...own.map((x) => [x, ctx.tests.find((t) => t.test === x)?.unit || '', ctx.tests.find((t) => t.test === x)?.better || 'mas']), ...BODY_METRICS];
  const blank = { title: '', metric: 'CMJ', unit: 'cm', better: 'mas', start_value: '', target: '', start_date: iso(), deadline: iso(addDays(new Date(), 56)), note: '' };
  const [f, setF] = useState(blank);
  const [open, setOpen] = useState(false);
  // El punto de partida, si no se escribe, es el registro que había en la fecha de inicio
  const pick = (m) => { const x = metrics.find((r) => r[0] === m); setF({ ...f, metric: m, unit: x?.[1] || '', better: x?.[2] || 'mas', start_value: '' }); };
  const startHint = (() => { const s = metricSeries(f.metric, ctx); const v = (s.filter((x) => x.date <= f.start_date).pop() || s[0]); return v ? `${fmtNum(v.v)} (${fmtDate(v.date)})` : 'sin registros'; })();
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      if (num(f.target) == null) throw new Error('Pon la meta (un número).');
      await q(supabase.from('goals').insert({ coach_id: uid, player_id: p.id, title: f.title.trim() || `${f.metric} ${f.better === 'menos' ? '≤' : '≥'} ${f.target} ${f.unit}`, metric: f.metric, unit: f.unit || null, better: f.better, start_value: num(f.start_value), target: num(f.target), start_date: f.start_date, deadline: f.deadline || null, note: f.note || null }));
      await load('goals'); setF(blank); setOpen(false);
    }, 'Objetivo guardado. Se marcará como conseguido en cuanto un registro alcance la meta.');
  };
  const setDone = (g, v) => act(async () => { await q(supabase.from('goals').update({ achieved_at: v }).eq('id', g.id)); await load('goals'); }, v ? 'Marcado como conseguido.' : 'Vuelve a estar en curso.');
  const del = (g) => act(async () => {
    await q(supabase.from('goals').delete().eq('id', g.id)); await load('goals');
    toast('Objetivo eliminado.', { undo: () => act(async () => { await q(supabase.from('goals').insert(g)); await load('goals'); }) });
  });
  const rows = mine.map((g) => ({ g, s: goalStatus(g, metricSeries(g.metric, ctx)) }));
  return (
    <div className="stack">
      <div className="between">
        <div><h3>Objetivos</h3><p className="muted small">Meta, plazo y cuándo se consigue. Se marcan solos al registrar un test o una medida que alcance la meta.</p></div>
        <button className="btn pri" aria-expanded={open} onClick={() => setOpen(!open)}>+ Objetivo</button>
      </div>
      {open && (
        <form className="panel stack" onSubmit={save}>
          <div className="grid2">
            <label className="f">Qué se mide<select id="g-metric" value={f.metric} onChange={(e) => pick(e.target.value)}>
              <optgroup label="Tests">{metrics.filter((m) => !BODY_METRICS.some((b) => b[0] === m[0])).map((m) => <option key={m[0]}>{m[0]}</option>)}</optgroup>
              <optgroup label="Composición corporal">{BODY_METRICS.map((m) => <option key={m[0]}>{m[0]}</option>)}</optgroup>
            </select></label>
            <label className="f">Nombre (opcional)<input id="g-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={`Ej. ${f.metric} ${f.better === 'menos' ? 'por debajo de' : 'por encima de'} …`} /></label>
            <label className="f">Punto de partida ({f.unit || '—'})<input id="g-start" inputMode="decimal" value={f.start_value} onChange={(e) => setF({ ...f, start_value: e.target.value })} placeholder={`Automático: ${startHint}`} /></label>
            <label className="f">Meta ({f.unit || '—'}) · {f.better === 'menos' ? 'bajar hasta' : 'llegar a'}<input id="g-target" inputMode="decimal" required value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></label>
            <label className="f">Desde<input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></label>
            <label className="f">Fecha límite<input id="g-deadline" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></label>
          </div>
          <label className="f">Nota (opcional)<input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Ej. Clave para la convocatoria de diciembre" /></label>
          <div className="row"><button className="btn pri" type="submit">Guardar objetivo</button><button type="button" className="btn" onClick={() => setOpen(false)}>Cancelar</button></div>
        </form>
      )}
      {rows.length ? (
        <div className="panel tablewrap">
          <table className="goals">
            <thead><tr><th>Objetivo</th><th>Inicio</th><th>Ahora</th><th>Meta</th><th>Plazo</th><th>Estado</th><th></th></tr></thead>
            <tbody>{rows.map(({ g, s }) => (
              <tr key={g.id}>
                <td><b>{g.title}</b>{g.note && <div className="muted small">{g.note}</div>}
                  {s.prog != null && <div className="gbar" aria-hidden="true"><i style={{ width: `${s.prog * 100}%` }} className={GOAL_STATUS[s.status][1]} /></div>}</td>
                <td className="num">{fmtNum(s.start)} <span className="muted small">{fmtDate(g.start_date)}</span></td>
                <td className="num">{fmtNum(s.cur)}</td>
                <td className="num"><b>{fmtNum(g.target)}</b> <span className="muted small">{g.unit}</span></td>
                <td className="small">{g.deadline ? fmtDate(g.deadline) : '—'}{s.left != null && <div className="muted">{s.left >= 0 ? `quedan ${s.left} día${s.left === 1 ? '' : 's'}` : `${-s.left} día${s.left === -1 ? '' : 's'} tarde`}</div>}</td>
                <td><span className={'pill ' + GOAL_STATUS[s.status][1]}>{GOAL_STATUS[s.status][0]}</span>{s.hit && <div className="muted small">el {fmtDate(s.hit)} · {s.days} días{s.onTime === false ? ' (fuera de plazo)' : ''}</div>}</td>
                <td><span className="row" style={{ flexWrap: 'nowrap' }}>
                  {!s.hit ? <button className="btn sm" onClick={() => setDone(g, iso())} title="Si no se mide con un test">Conseguido</button> : g.achieved_at ? <button className="btn sm" onClick={() => setDone(g, null)}>Deshacer</button> : null}
                  <button className="ib" aria-label={`Eliminar ${g.title}`} onClick={() => del(g)}>✕</button></span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <Empty>Sin objetivos. Añade el primero con meta y fecha límite: saldrán en su app y en el informe.</Empty>}
    </div>
  );
}

// ---------- Composición corporal ----------
export function Body({ p }) {
  const { body = [], uid, load } = useCoach();
  const act = useAction();
  const toast = useToast();
  const mine = body.filter((m) => m.player_id === p.id);
  const blank = { date: iso(), weight: '', ...Object.fromEntries([...PERIMETERS, ...SKINFOLDS].map(([k]) => [k, ''])), note: '' };
  const [f, setF] = useState(blank);
  const [sex, setSex] = useState(p.sex || ''); const [birth, setBirth] = useState(p.birth_date || '');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const age = ageAt(birth || p.birth_date, f.date);
  const live = bodyFat(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, num(v)])), sex || p.sex, age);
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      if ((sex && sex !== p.sex) || (birth && birth !== p.birth_date)) await q(supabase.from('players').update({ sex: sex || null, birth_date: birth || null }).eq('id', p.id));
      const row = { coach_id: uid, player_id: p.id, date: f.date, note: f.note || null, ...Object.fromEntries(Object.keys(blank).filter((k) => k !== 'date' && k !== 'note').map((k) => [k, num(f[k])])) };
      if (Object.entries(row).every(([k, v]) => ['coach_id', 'player_id', 'date', 'note'].includes(k) || v == null)) throw new Error('Pon al menos una medida.');
      await q(supabase.from('body_measures').insert(row));
      await load(['body', 'players']); setF({ ...blank, date: f.date });
    }, 'Medidas guardadas.');
  };
  const del = (m) => act(async () => {
    await q(supabase.from('body_measures').delete().eq('id', m.id)); await load('body');
    toast('Registro eliminado.', { undo: () => act(async () => { await q(supabase.from('body_measures').insert(m)); await load('body'); }) });
  });
  const cols = useMemo(() => [['weight', 'Peso', 'kg'], ...PERIMETERS.map(([k, l]) => [k, l, 'cm'])].filter(([k]) => mine.some((m) => m[k] != null)), [mine]);
  const three = (sex || p.sex) === 'm' ? ['sf_triceps', 'sf_suprailiac', 'sf_thigh'] : ['sf_chest', 'sf_abdomen', 'sf_thigh'];
  return (
    <div className="stack">
      <form className="panel stack" onSubmit={save}>
        <div className="between"><h3>Nueva medición</h3><input aria-label="Fecha de la medición" type="date" style={{ width: 'auto' }} value={f.date} onChange={set('date')} /></div>
        <div className="row">
          <label className="f" style={{ width: 160 }}>Sexo<select id="b-sex" value={sex} onChange={(e) => setSex(e.target.value)}><option value="">—</option><option value="h">Hombre</option><option value="m">Mujer</option></select></label>
          <label className="f" style={{ width: 190 }}>Fecha de nacimiento<input id="b-birth" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} /></label>
          <label className="f" style={{ width: 130 }}>Peso (kg)<input id="b-weight" inputMode="decimal" value={f.weight} onChange={set('weight')} placeholder="82,4" /></label>
        </div>
        <fieldset className="mgroup"><legend>Perímetros (cm, cinta métrica, protocolo ISAK)</legend>
          <div className="mgrid">{PERIMETERS.map(([k, l]) => <label key={k} className="f">{l}<input id={'b-' + k} inputMode="decimal" value={f[k]} onChange={set(k)} /></label>)}</div>
        </fieldset>
        <fieldset className="mgroup"><legend>Pliegues (mm, plicómetro, lado derecho)</legend>
          <div className="mgrid">{SKINFOLDS.map(([k, l]) => <label key={k} className={'f' + (three.includes(k) ? ' key3' : '')}>{l}<input id={'b-' + k} inputMode="decimal" value={f[k]} onChange={set(k)} /></label>)}</div>
          <p className="muted small">Con los 7 pliegues se usa Jackson-Pollock 7; con los 3 marcados ({three.map((k) => SKINFOLDS.find((x) => x[0] === k)[1]).join(', ')}), Jackson-Pollock 3. % grasa con la ecuación de Siri. Error típico de la plicometría: ±3-5 %; mira la tendencia de la suma de pliegues.</p>
        </fieldset>
        {live && <p className="small"><b>% grasa estimado: {fmtNum(live.pct, 1)} %</b> <span className="muted">· {live.method} · suma {fmtNum(live.sum, 1)} mm · {age} años</span></p>}
        {!live && (!(sex || p.sex) || !(birth || p.birth_date)) && <p className="muted small">Para calcular el % de grasa hacen falta el sexo y la fecha de nacimiento.</p>}
        <div className="row"><input aria-label="Nota" style={{ flex: '1 1 220px' }} value={f.note} onChange={set('note')} placeholder="Nota (opcional): en ayunas, tras entrenar…" /><button className="btn pri" type="submit">Guardar medición</button></div>
      </form>
      {mine.length ? (
        <div className="panel tablewrap">
          <table>
            <thead><tr><th>Fecha</th>{cols.map(([k, l, u]) => <th key={k}>{l} <span className="muted">{u}</span></th>)}<th>Pliegues <span className="muted">mm</span></th><th>% grasa</th><th></th></tr></thead>
            <tbody>{[...mine].reverse().map((m, i, arr) => {
              const bf = bodyFat(m, p.sex, ageAt(p.birth_date, m.date)); const prev = arr[i + 1];
              const d = (k) => (prev && m[k] != null && prev[k] != null ? Number(m[k]) - Number(prev[k]) : null);
              return (
                <tr key={m.id}>
                  <td className="num">{fmtDate(m.date)}</td>
                  {cols.map(([k]) => <td key={k} className="num">{fmtNum(m[k], 1)}{d(k) ? <span className="muted small"> ({d(k) > 0 ? '+' : ''}{fmtNum(d(k), 1)})</span> : null}</td>)}
                  <td className="num">{fmtNum(skinSum(m), 1)}</td>
                  <td className="num">{bf ? <b>{fmtNum(bf.pct, 1)} %</b> : '—'}</td>
                  <td><button className="ib" aria-label={`Eliminar medición del ${fmtDate(m.date)}`} onClick={() => del(m)}>✕</button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      ) : <Empty>Sin mediciones. Registra la valoración inicial para tener el punto de partida.</Empty>}
    </div>
  );
}

// ---------- Informes ----------
const PERIODS = [['block', 'Último bloque (4 semanas)'], ['8w', 'Últimas 8 semanas'], ['all', 'Desde el inicio'], ['custom', 'Fechas concretas']];
export function Reports({ p }) {
  const { reports = [], uid, load } = useCoach();
  const act = useAction();
  const toast = useToast();
  const mine = reports.filter((r) => r.player_id === p.id);
  const [per, setPer] = useState('block');
  const today = iso();
  const range = (k) => (k === 'block' ? [iso(addDays(new Date(), -27)), today] : k === '8w' ? [iso(addDays(new Date(), -55)), today] : k === 'all' ? [p.start_date, today] : null);
  const [from, setFrom] = useState(range('block')[0]); const [to, setTo] = useState(today);
  const [summary, setSummary] = useState(''); const [next, setNext] = useState('');
  const [view, setView] = useState(null); // informe abierto
  const choose = (k) => { setPer(k); const r = range(k); if (r) { setFrom(r[0]); setTo(r[1]); } };
  const publish = () => act(async () => {
    const row = await q(supabase.from('reports').insert({ coach_id: uid, player_id: p.id, date_from: from, date_to: to, title: `Informe de progreso · ${fmtDate(from)} – ${fmtDate(to)}`, summary: summary || null, next_steps: next || null }).select().single());
    await load('reports'); setSummary(''); setNext(''); setView(row);
  }, `Informe publicado. ${p.name.split(' ')[0]} ya lo ve en su app (Progreso).`);
  const del = (r) => act(async () => {
    await q(supabase.from('reports').delete().eq('id', r.id)); await load('reports');
    toast('Informe eliminado.', { undo: () => act(async () => { await q(supabase.from('reports').insert(r)); await load('reports'); }) });
  });
  return (
    <div className="stack">
      <section className="panel stack">
        <div><h3>Nuevo informe de progreso</h3><p className="muted small">Objetivos y plazos, rendimiento, carga, composición corporal y recuperación por bloques de 4 semanas. Se descarga en PDF con tu marca.</p></div>
        <div className="row">
          <select aria-label="Periodo" style={{ width: 'auto' }} value={per} onChange={(e) => choose(e.target.value)}>{PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <label className="row small">Desde<input id="r-from" type="date" style={{ width: 'auto' }} value={from} onChange={(e) => { setFrom(e.target.value); setPer('custom'); }} /></label>
          <label className="row small">Hasta<input id="r-to" type="date" style={{ width: 'auto' }} value={to} onChange={(e) => { setTo(e.target.value); setPer('custom'); }} /></label>
        </div>
        <label className="f">Tu valoración<textarea id="r-summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Qué ha ido bien, qué hay que mejorar y por qué." /></label>
        <label className="f">Próximos pasos<textarea id="r-next" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Ej. Bloque de potencia 4 semanas; revaloración CMJ y Bronco el 20/11." /></label>
        <div className="row">
          <button className="btn" onClick={() => setView({ preview: true, date_from: from, date_to: to, summary, next_steps: next })}>Vista previa y PDF</button>
          <button className="btn pri" onClick={publish}>Publicar para {p.name.split(' ')[0]}</button>
        </div>
      </section>
      {mine.length > 0 && (
        <section className="panel stack">
          <h3>Informes publicados</h3>
          <ul className="list">{mine.map((r) => (
            <li key={r.id}><span><b>{fmtDate(r.date_from)} – {fmtDate(r.date_to)}</b> <span className="muted small">· publicado el {fmtDate(r.created_at.slice(0, 10))}</span></span>
              <span className="row"><button className="btn sm" onClick={() => setView(r)}>Abrir</button><button className="ib" aria-label="Eliminar informe" onClick={() => del(r)}>✕</button></span></li>
          ))}</ul>
        </section>
      )}
      {view && <Report playerId={p.id} report={view} onClose={() => setView(null)} />}
    </div>
  );
}
