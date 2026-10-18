import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { matches, iso, fmtDate, DAYS, addDays, mondayOf } from '../lib/util.js';
import { useAction, useToast, Empty, Tabs } from '../ui/ui.jsx';
import {
  PACK_TYPES, emptyItem, emptyPack, emptySession, emptyWeek, emptyPhase, emptyProgram,
  cloneWithNewIds, label, totalWeeks, setsPerMuscle, calendarWeekIdx,
} from '../lib/program.js';

export default function Programs() {
  const { route } = useCoach();
  return route.id ? <Editor key={route.id} id={route.id} /> : <ProgramList />;
}

function ProgramList() {
  const { programs, players, uid, load, go } = useCoach();
  const act = useAction();
  const [show, setShow] = useState('tpl');
  const [qy, setQy] = useState('');
  const pname = (id) => players.find((p) => p.id === id)?.name || '';
  const list = programs.filter((p) => (show === 'tpl' ? !p.player_id : !!p.player_id) && matches(`${p.name} ${pname(p.player_id)}`, qy));
  const create = () => act(async () => {
    const row = await q(supabase.from('programs').insert({ coach_id: uid, name: 'Nueva plantilla', data: emptyProgram() }).select().single());
    await load('programs');
    go('programacion', row.id);
  });
  return (
    <>
      <div className="pagehead">
        <div><h1>Programación</h1><p>Crea plantillas y asígnalas. Cada jugador recibe una copia: si cambias la plantilla, lo asignado no cambia.</p></div>
        <button className="btn pri" onClick={create}>+ Nueva plantilla</button>
      </div>
      <div className="row">
        <Tabs tabs={[['tpl', 'Plantillas'], ['asig', 'Asignados a jugadores']]} value={show} onChange={setShow} />
        <input style={{ maxWidth: 280 }} placeholder="Buscar" value={qy} onChange={(e) => setQy(e.target.value)} />
      </div>
      {list.length ? (
        <ul className="list">
          {list.map((p) => (
            <li key={p.id} style={{ cursor: 'pointer' }} onClick={() => go('programacion', p.id)}>
              <span><b>{p.player_id ? `${pname(p.player_id)} · ` : ''}{p.name}</b> <span className="muted small">· {totalWeeks(p.data)} semanas{p.start_date ? ` · desde ${fmtDate(p.start_date)}` : ''}</span></span>
              <span className="muted small">editado {fmtDate(p.updated_at)}</span>
            </li>
          ))}
        </ul>
      ) : <Empty>{show === 'tpl' ? 'Aún no tienes plantillas. Crea la primera con «+ Nueva plantilla».' : 'Aún no has asignado programas. Abre una plantilla y pulsa «Asignar a jugador».'}</Empty>}
    </>
  );
}

// Portapapeles para copiar sesiones o bloques entre semanas y programas
const readClip = () => { try { return JSON.parse(localStorage.getItem('clip') || 'null'); } catch { return null; } };
const writeClip = (c) => { try { localStorage.setItem('clip', JSON.stringify(c)); } catch {} };

function Editor({ id }) {
  const { programs, players, exercises, uid, load, go } = useCoach();
  const act = useAction();
  const toast = useToast();
  const orig = programs.find((p) => p.id === id);
  const [prog, setProg] = useState(orig);
  const [status, setStatus] = useState('Guardado');
  const [ph, setPh] = useState(0);
  const [wk, setWk] = useState(0);
  const [clip, setClip] = useState(readClip);
  const hist = useRef([]);
  const timer = useRef(null);
  const latest = useRef(orig);
  const pending = useRef(false);

  // Abre en la semana actual si es un programa asignado
  useEffect(() => {
    if (!orig?.start_date) return;
    let n = calendarWeekIdx(orig);
    if (n == null || n < 0) return;
    for (let i = 0; i < orig.data.phases.length; i++) {
      const len = orig.data.phases[i].weeks.length;
      if (n < len) { setPh(i); setWk(n); return; }
      n -= len;
    }
  }, []);

  const persist = useCallback(async (p) => {
    pending.current = false;
    setStatus('Guardando…');
    const { error } = await supabase.from('programs').update({ name: p.name, start_date: p.start_date, data: p.data }).eq('id', p.id);
    if (error) { setStatus('Error al guardar'); toast('No se pudo guardar: ' + error.message, { error: true }); return; }
    setStatus('Guardado');
    load('programs');
  }, [load, toast]);

  // Guardado automático 1 s después del último cambio
  const commit = useCallback((next, pushHistory = true) => {
    if (pushHistory) { hist.current.push(latest.current); if (hist.current.length > 60) hist.current.shift(); }
    latest.current = next;
    setProg(next);
    pending.current = true;
    setStatus('Cambios sin guardar');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(latest.current), 1000);
  }, [persist]);

  useEffect(() => () => { clearTimeout(timer.current); if (pending.current) persist(latest.current); }, []);

  const undo = useCallback(() => {
    const prev = hist.current.pop();
    if (prev) { commit(prev, false); toast('Cambio deshecho.'); }
  }, [commit, toast]);
  useEffect(() => {
    const on = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [undo]);

  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.name, e])), [exercises]);

  if (!prog) return <Empty>No se encuentra este programa. <button className="btn sm" onClick={() => go('programacion')}>Volver</button></Empty>;

  // Mutación inmutable sencilla: clona y aplica
  const mut = (fn) => { const d = structuredClone(prog.data); fn(d); commit({ ...prog, data: d }); };
  const phases = prog.data.phases;
  const phase = phases[Math.min(ph, phases.length - 1)];
  const week = phase?.weeks[Math.min(wk, phase.weeks.length - 1)];
  const pi = Math.min(ph, phases.length - 1);
  const wi = phase ? Math.min(wk, phase.weeks.length - 1) : 0;
  const W = (d) => d.phases[pi].weeks[wi];
  const weekNumber = phases.slice(0, pi).reduce((a, x) => a + x.weeks.length, 0) + wi + 1;
  const player = players.find((p) => p.id === prog.player_id);
  const muscles = setsPerMuscle(week, exMap);

  const copy = (kind, data, msg) => { const c = { kind, data }; writeClip(c); setClip(c); toast(msg); };

  const delWithUndo = (fn, msg) => { mut(fn); toast(msg, { undo }); };

  return (
    <>
      <div className="pagehead">
        <div style={{ flex: '1 1 320px' }}>
          <input aria-label="Nombre del programa" value={prog.name} onChange={(e) => commit({ ...prog, name: e.target.value })}
            style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 600, background: 'transparent', border: 'none', padding: 0 }} />
          <p className="muted">{player ? <>Copia de <b>{player.name}</b></> : 'Plantilla'} · {totalWeeks(prog.data)} semanas · <span className="save">{status}</span></p>
        </div>
        <div className="row">
          {player && <label className="row small">Empieza el<input type="date" style={{ width: 'auto' }} value={prog.start_date || ''} onChange={(e) => commit({ ...prog, start_date: e.target.value || null })} /></label>}
          <button className="btn" onClick={undo} disabled={!hist.current.length} title="Ctrl+Z">Deshacer</button>
          <button className="btn" onClick={() => go('programacion')}>Volver</button>
        </div>
      </div>

      {!player && <Assign prog={prog} />}

      {/* Fases */}
      <div className="row">
        {phases.map((p, i) => (
          <button key={p.id} className={'btn sm' + (i === pi ? ' pri' : '')} onClick={() => { setPh(i); setWk(0); }}>{p.name}</button>
        ))}
        <button className="btn sm" onClick={() => { mut((d) => d.phases.push(emptyPhase(d.phases.length + 1))); setPh(phases.length); setWk(0); }}>+ Fase</button>
      </div>
      {phase && (
        <div className="panel stack">
          <div className="row">
            <input aria-label="Nombre de la fase" style={{ maxWidth: 260 }} value={phase.name} onChange={(e) => mut((d) => { d.phases[pi].name = e.target.value; })} />
            {phases.length > 1 && <button className="btn sm danger" onClick={() => { delWithUndo((d) => d.phases.splice(pi, 1), `Fase «${phase.name}» eliminada.`); setPh(0); setWk(0); }}>Eliminar fase</button>}
          </div>
          {/* Semanas */}
          <div className="between">
            <div className="weekbar">
              {phase.weeks.map((w, i) => {
                const n = phases.slice(0, pi).reduce((a, x) => a + x.weeks.length, 0) + i + 1;
                return <button key={w.id} aria-pressed={i === wi} onClick={() => setWk(i)}>Semana {n}</button>;
              })}
            </div>
            <div className="row">
              <button className="btn sm" onClick={() => { mut((d) => d.phases[pi].weeks.push(emptyWeek())); setWk(phase.weeks.length); }}>+ Semana vacía</button>
              <button className="btn sm" onClick={() => { mut((d) => d.phases[pi].weeks.splice(wi + 1, 0, cloneWithNewIds(d.phases[pi].weeks[wi]))); setWk(wi + 1); }}>Duplicar semana</button>
              {phase.weeks.length > 1 && <button className="btn sm danger" onClick={() => { delWithUndo((d) => d.phases[pi].weeks.splice(wi, 1), `Semana ${weekNumber} eliminada.`); setWk(Math.max(0, wi - 1)); }}>Eliminar semana</button>}
            </div>
          </div>
        </div>
      )}

      {week && (
        <>
          {[...week.sessions].map((s, si) => ({ s, si })).sort((a, b) => a.s.day - b.s.day).map(({ s, si }) => (
            <section key={s.id} className="sess">
              <header>
                <select aria-label="Día" value={s.day} onChange={(e) => mut((d) => { W(d).sessions[si].day = Number(e.target.value); })}>{DAYS.map((x, i) => <option key={i} value={i + 1}>{x}</option>)}</select>
                <input aria-label="Nombre de la sesión" placeholder="Ej. Fuerza tren inferior" style={{ flex: '1 1 200px' }} value={s.name} onChange={(e) => mut((d) => { W(d).sessions[si].name = e.target.value; })} />
                <button className="btn sm" onClick={() => copy('session', s, 'Sesión copiada. Pégala en otra semana o programa.')}>Copiar</button>
                <button className="btn sm" onClick={() => mut((d) => { const c = cloneWithNewIds(s); c.day = Math.min(7, s.day + 1); W(d).sessions.push(c); })}>Duplicar</button>
                <button className="ib" aria-label="Eliminar sesión" onClick={() => delWithUndo((d) => W(d).sessions.splice(si, 1), 'Sesión eliminada.')}>✕</button>
              </header>
              {s.packs.map((p, k) => (
                <div className="pack" key={p.id}>
                  <header>
                    <span className="lt">{String.fromCharCode(65 + k)}</span>
                    <select aria-label="Tipo de bloque" value={p.type} onChange={(e) => mut((d) => { W(d).sessions[si].packs[k].type = e.target.value; })}>{[...new Set([...PACK_TYPES, p.type])].map((t) => <option key={t}>{t}</option>)}</select>
                    <label className="row small">Vueltas<input aria-label="Vueltas" style={{ width: 60 }} inputMode="numeric" value={p.rounds} onChange={(e) => mut((d) => { W(d).sessions[si].packs[k].rounds = e.target.value; })} /></label>
                    <input aria-label="Indicaciones del bloque" placeholder="Indicaciones (ej. superserie, descanso entre vueltas)" style={{ flex: '1 1 180px' }} value={p.notes} onChange={(e) => mut((d) => { W(d).sessions[si].packs[k].notes = e.target.value; })} />
                    <button className="ib" aria-label="Subir bloque" disabled={!k} onClick={() => mut((d) => { const a = W(d).sessions[si].packs; [a[k - 1], a[k]] = [a[k], a[k - 1]]; })}>↑</button>
                    <button className="ib" aria-label="Bajar bloque" disabled={k === s.packs.length - 1} onClick={() => mut((d) => { const a = W(d).sessions[si].packs; [a[k + 1], a[k]] = [a[k], a[k + 1]]; })}>↓</button>
                    <button className="btn sm" onClick={() => copy('pack', p, 'Bloque copiado.')}>Copiar</button>
                    <button className="ib" aria-label="Eliminar bloque" onClick={() => delWithUndo((d) => W(d).sessions[si].packs.splice(k, 1), 'Bloque eliminado.')}>✕</button>
                  </header>
                  <div className="items">
                    <div className="item itemhead"><span></span><span>Ejercicio</span><span>Series</span><span>Reps</span><span>Carga</span><span>Desc.</span><span>Notas</span><span></span></div>
                    {p.items.map((it, j) => {
                      const set = (f) => (e) => mut((d) => { W(d).sessions[si].packs[k].items[j][f] = e.target.value; });
                      const known = !it.exercise || exMap[it.exercise];
                      return (
                        <div className="item" key={it.id}>
                          <span className="lb">{label(k, j)}</span>
                          <input className="ex" list="exlist" aria-label="Ejercicio" placeholder="Escribe para buscar…" value={it.exercise} onChange={set('exercise')} style={known ? {} : { borderColor: 'var(--warn)' }} title={known ? '' : 'No está en tu biblioteca'} />
                          <input aria-label="Series" inputMode="numeric" placeholder="Series" value={it.sets} onChange={set('sets')} />
                          <input aria-label="Repeticiones" placeholder="Reps" value={it.reps} onChange={set('reps')} />
                          <input aria-label="Carga" placeholder="Carga" value={it.load} onChange={set('load')} />
                          <input aria-label="Descanso" placeholder="Desc." value={it.rest} onChange={set('rest')} />
                          <input className="nt" aria-label="Notas" placeholder="Notas" value={it.notes} onChange={set('notes')} />
                          <button className="ib" aria-label="Eliminar ejercicio" onClick={() => delWithUndo((d) => W(d).sessions[si].packs[k].items.splice(j, 1), `${label(k, j)} eliminado.`)}>✕</button>
                        </div>
                      );
                    })}
                    <div className="row"><button className="btn sm" onClick={() => mut((d) => W(d).sessions[si].packs[k].items.push(emptyItem()))}>+ Ejercicio</button></div>
                  </div>
                </div>
              ))}
              <div className="row" style={{ padding: '0 12px 12px' }}>
                <select aria-label="Tipo del nuevo bloque" id={'nb-' + s.id} style={{ width: 'auto' }} defaultValue="Fuerza">{PACK_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                <button className="btn sm" onClick={() => mut((d) => W(d).sessions[si].packs.push(emptyPack(document.getElementById('nb-' + s.id).value)))}>+ Bloque</button>
                {clip?.kind === 'pack' && <button className="btn sm" onClick={() => mut((d) => W(d).sessions[si].packs.push(cloneWithNewIds(clip.data)))}>Pegar bloque ({clip.data.type})</button>}
              </div>
            </section>
          ))}
          <div className="row">
            <button className="btn pri" onClick={() => mut((d) => { const used = W(d).sessions.map((x) => x.day); W(d).sessions.push(emptySession([1, 3, 5, 2, 4, 6, 7].find((x) => !used.includes(x)) || 1)); })}>+ Sesión</button>
            {clip?.kind === 'session' && <button className="btn" onClick={() => mut((d) => W(d).sessions.push(cloneWithNewIds(clip.data)))}>Pegar sesión ({clip.data.name || DAYS[clip.data.day - 1]})</button>}
          </div>
          {!week.sessions.length && <Empty>Semana sin sesiones. Añade una con «+ Sesión».</Empty>}
          {Object.keys(muscles).length > 0 && (
            <div className="panel stack">
              <h3>Series semanales por músculo · semana {weekNumber}</h3>
              <p className="muted small">Principal cuenta 1 serie y secundario 0,5 (Pelland et al., 2025). Para hipertrofia, unas 10 o más series semanales por músculo suelen funcionar mejor que menos (Schoenfeld et al., 2017).</p>
              <div className="row">{Object.entries(muscles).sort((a, b) => b[1] - a[1]).map(([m, v]) => <span key={m} className={'pill ' + (v >= 10 ? 'ok' : v >= 5 ? 'brand' : '')}>{m} {v.toString().replace('.', ',')}</span>)}</div>
            </div>
          )}
        </>
      )}

      <datalist id="exlist">{exercises.map((e) => <option key={e.id} value={e.name}>{e.primary_muscle || e.type}</option>)}</datalist>
      <Danger prog={prog} />
    </>
  );
}

function Assign({ prog }) {
  const { players, uid, load, go } = useCoach();
  const act = useAction();
  const active = players.filter((p) => !p.end_date);
  const [pid, setPid] = useState(active[0]?.id || '');
  const [start, setStart] = useState(iso(mondayOf(addDays(new Date(), 7))));
  if (!active.length) return null;
  const assign = () => act(async () => {
    const row = await q(supabase.from('programs').insert({ coach_id: uid, player_id: pid, template_id: prog.id, name: prog.name, start_date: start, data: cloneWithNewIds(prog.data) }).select().single());
    await load('programs');
    go('programacion', row.id);
  }, 'Asignado. Ahora editas la copia del jugador.');
  return (
    <div className="panel row">
      <b>Asignar a jugador</b>
      <select id="asg-player" style={{ width: 'auto' }} value={pid} onChange={(e) => setPid(e.target.value)}>{active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <label className="row small">Empieza el<input id="asg-start" type="date" style={{ width: 'auto' }} value={start} onChange={(e) => setStart(e.target.value)} /></label>
      <button className="btn pri" onClick={assign}>Asignar copia</button>
    </div>
  );
}

function Danger({ prog }) {
  const { uid, load, go } = useCoach();
  const act = useAction();
  const [c, setC] = useState(false);
  const dup = () => act(async () => {
    const row = await q(supabase.from('programs').insert({ coach_id: uid, name: prog.name + ' (copia)', data: cloneWithNewIds(prog.data) }).select().single());
    await load('programs');
    go('programacion', row.id);
  }, 'Guardado como nueva plantilla.');
  const del = () => act(async () => {
    await q(supabase.from('programs').delete().eq('id', prog.id));
    await load('programs');
    go('programacion');
  }, 'Programa eliminado.');
  return (
    <div className="between" style={{ marginTop: 10 }}>
      <button className="btn" onClick={dup}>Guardar como nueva plantilla</button>
      {c ? <span className="row"><span className="small">¿Eliminar este programa?</span><button className="btn danger" onClick={del}>Sí, eliminar</button><button className="btn" onClick={() => setC(false)}>No</button></span>
        : <button className="btn danger" onClick={() => setC(true)}>Eliminar programa</button>}
    </div>
  );
}
