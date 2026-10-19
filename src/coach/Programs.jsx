import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { matches, iso, fmtDate, DAYS, addDays, mondayOf, parseISO } from '../lib/util.js';
import { useAction, useToast, Empty, Tabs, Loading } from '../ui/ui.jsx';
import ExercisePicker from './ExercisePicker.jsx';
import {
  PACK_TYPES, emptyItem, emptyPack, emptySession, emptyWeek, emptyPhase, emptyProgram,
  cloneWithNewIds, label, totalWeeks, setsPerMuscle, calendarWeekIdx,
} from '../lib/program.js';
import { clashes, SET_RANGE, evoLabel, flagLabel } from '../lib/domain.js';
import { MUSCLES } from './Library.jsx';
import Flag, { importantOf } from './Flag.jsx';
import WeekNoteEditor from './WeekNote.jsx';
import ClubEditor from '../ui/ClubEditor.jsx';
import { TemplateImporter, ProtocolGallery, exportProgramCSV } from './TemplateTools.jsx';
import { useClub, clubDay, matchText, nextMatch } from '../lib/club.js';
import { sessionDate } from '../lib/program.js';

export default function Programs() {
  const { route } = useCoach();
  return route.id ? <Editor key={route.id} id={route.id} /> : <ProgramList />;
}

// Asigna una o varias plantillas a uno o varios clientes. Varias plantillas se encadenan: cada una empieza al acabar la anterior.
export async function assignTemplates({ uid, templates, clients, start }) {
  const rows = [];
  for (const c of clients) {
    let d = parseISO(start);
    for (const t of templates) {
      rows.push({ coach_id: uid, player_id: c.id, template_id: t.id, name: t.name, start_date: iso(d), data: cloneWithNewIds(t.data) });
      d = addDays(d, Math.max(1, totalWeeks(t.data)) * 7);
    }
  }
  return q(supabase.from('programs').insert(rows).select());
}

// Barra de selección múltiple
export function SelBar({ n, noun, fem = false, onClear, children }) {
  return (
    <div className="selbar" role="region" aria-label="Selección">
      <b>{n} {noun}{n === 1 ? '' : 's'} seleccionad{fem ? 'a' : 'o'}{n === 1 ? '' : 's'}</b>
      <div className="row">{children}<button className="btn sm ghost" onClick={onClear}>Quitar selección</button></div>
    </div>
  );
}

function ProgramList() {
  const { programs, players, uid, load, go } = useCoach();
  const act = useAction();
  const toast = useToast();
  const [show, setShow] = useState('tpl');
  const [qy, setQy] = useState('');
  const [tool, setTool] = useState(null); // 'csv' | 'proto'
  const [sel, setSel] = useState([]); // ids en el orden en que se marcan
  const [mode, setMode] = useState(null); // 'asignar' | 'borrar'
  const pname = (id) => players.find((p) => p.id === id)?.name || '';
  const list = programs.filter((p) => (show === 'tpl' ? !p.player_id : !!p.player_id) && matches(`${p.name} ${pname(p.player_id)}`, qy));
  const chosen = sel.map((id) => programs.find((p) => p.id === id)).filter(Boolean);
  const clear = () => { setSel([]); setMode(null); };
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allOn = list.length > 0 && list.every((p) => sel.includes(p.id));
  const create = () => act(async () => {
    const row = await q(supabase.from('programs').insert({ coach_id: uid, name: 'Nueva plantilla', data: emptyProgram() }).select().single());
    await load('programs');
    go('programacion', row.id);
  });
  const del = () => act(async () => {
    const rows = chosen;
    await q(supabase.from('programs').delete().in('id', rows.map((r) => r.id)));
    await load('programs');
    clear();
    toast(`${rows.length} programa${rows.length === 1 ? '' : 's'} eliminado${rows.length === 1 ? '' : 's'}.`, { undo: () => act(async () => { await q(supabase.from('programs').insert(rows)); await load('programs'); }) });
  });
  return (
    <>
      <div className="pagehead">
        <div><h1>Programación</h1><p>Crea plantillas y asígnalas. Cada cliente recibe una copia: si cambias la plantilla, lo asignado no cambia.</p></div>
        <div className="row">
          <button className="btn" aria-expanded={tool === 'proto'} onClick={() => setTool(tool === 'proto' ? null : 'proto')}>Protocolos de readaptación</button>
          <button className="btn" aria-expanded={tool === 'csv'} onClick={() => setTool(tool === 'csv' ? null : 'csv')}>Importar CSV</button>
          <button className="btn pri" onClick={create}>+ Nueva plantilla</button>
        </div>
      </div>
      {tool === 'csv' && <TemplateImporter onClose={() => setTool(null)} />}
      {tool === 'proto' && <ProtocolGallery onClose={() => setTool(null)} />}
      <div className="row">
        <Tabs tabs={[['tpl', 'Plantillas'], ['asig', 'Asignados a clientes']]} value={show} onChange={(v) => { setShow(v); clear(); }} />
        <input style={{ maxWidth: 280 }} placeholder="Buscar" value={qy} onChange={(e) => setQy(e.target.value)} />
      </div>
      {sel.length > 0 && (
        <SelBar n={sel.length} noun={show === 'tpl' ? 'plantilla' : 'programa'} fem={show === 'tpl'} onClear={clear}>
          {show === 'tpl' && <button className={'btn sm' + (mode === 'asignar' ? ' pri' : '')} aria-expanded={mode === 'asignar'} onClick={() => setMode(mode === 'asignar' ? null : 'asignar')}>Asignar a clientes</button>}
          {mode === 'borrar'
            ? <span className="row"><span className="small">¿Eliminar {sel.length}?</span><button className="btn sm danger" onClick={del}>Sí, eliminar</button><button className="btn sm" onClick={() => setMode(null)}>No</button></span>
            : <button className="btn sm danger" onClick={() => setMode('borrar')}>Eliminar</button>}
        </SelBar>
      )}
      {mode === 'asignar' && show === 'tpl' && <MultiAssign templates={chosen} onDone={clear} />}
      {list.length ? (
        <ul className="list sel">
          <li className="selall"><label className="row small"><input type="checkbox" checked={allOn} onChange={() => setSel(allOn ? [] : list.map((p) => p.id))} /> Seleccionar todo</label></li>
          {list.map((p) => (
            <li key={p.id} className={sel.includes(p.id) ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => go('programacion', p.id)}>
              <span className="row" style={{ flexWrap: 'nowrap' }}>
                <input type="checkbox" aria-label={`Seleccionar ${p.player_id ? pname(p.player_id) + ' · ' : ''}${p.name}`} checked={sel.includes(p.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(p.id)} />
                <span><b>{p.player_id ? `${pname(p.player_id)} · ` : ''}{p.name}</b> <span className="muted small">· {totalWeeks(p.data)} semanas{p.start_date ? ` · desde ${fmtDate(p.start_date)}` : ''}</span></span>
              </span>
              <span className="muted small">editado {fmtDate(p.updated_at)}</span>
            </li>
          ))}
        </ul>
      ) : <Empty>{show === 'tpl' ? 'Aún no tienes plantillas. Crea la primera con «+ Nueva plantilla».' : 'Aún no has asignado programas. Marca plantillas y pulsa «Asignar a clientes».'}</Empty>}
      <SavedBlocks />
    </>
  );
}

// Elegir clientes y fecha de inicio para las plantillas marcadas
function MultiAssign({ templates, onDone }) {
  const { players, uid, load } = useCoach();
  const act = useAction();
  const active = players.filter((p) => !p.end_date);
  const [who, setWho] = useState([]);
  const [qy, setQy] = useState('');
  const [start, setStart] = useState(iso(mondayOf(addDays(new Date(), 7))));
  const shown = active.filter((p) => matches(`${p.name} ${p.plan || ''}`, qy));
  const toggle = (id) => setWho((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  const go = () => act(async () => {
    await assignTemplates({ uid, templates, clients: active.filter((p) => who.includes(p.id)), start });
    await load('programs');
    onDone();
  }, `Asignado a ${who.length} cliente${who.length === 1 ? '' : 's'}. Lo ves en «Asignados a clientes».`);
  if (!active.length) return <Empty>Aún no tienes clientes activos.</Empty>;
  return (
    <section className="panel stack" aria-label="Asignar a clientes">
      <div className="between">
        <b>Asignar {templates.length === 1 ? `«${templates[0].name}»` : `${templates.length} plantillas`} a…</b>
        <input style={{ maxWidth: 220 }} placeholder="Buscar cliente" value={qy} onChange={(e) => setQy(e.target.value)} />
      </div>
      <div className="pickgrid">
        {shown.map((p) => <label key={p.id} className={'pick' + (who.includes(p.id) ? ' on' : '')}><input type="checkbox" checked={who.includes(p.id)} onChange={() => toggle(p.id)} /> {p.name}</label>)}
      </div>
      {templates.length > 1 && <p className="muted small">Se encadenan en el orden en que las marcaste: {templates.map((t, i) => `${i + 1}. ${t.name}`).join(' → ')}. Cada una empieza al acabar la anterior.</p>}
      <div className="row">
        <label className="row small">Empieza el<input id="masg-start" type="date" style={{ width: 'auto' }} value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <button className="btn pri" disabled={!who.length} onClick={go}>Asignar a {who.length} cliente{who.length === 1 ? '' : 's'}</button>
        <button className="btn sm ghost" onClick={() => setWho(who.length === shown.length ? [] : shown.map((p) => p.id))}>{who.length === shown.length ? 'Ninguno' : 'Todos'}</button>
      </div>
    </section>
  );
}

function SavedBlocks() {
  const { blocks = [], load } = useCoach();
  const act = useAction();
  const toast = useToast();
  const del = (b) => act(async () => {
    await q(supabase.from('saved_blocks').delete().eq('id', b.id));
    await load('blocks');
    toast(`Bloque «${b.name}» eliminado.`, { undo: () => act(async () => { await q(supabase.from('saved_blocks').insert(b)); await load('blocks'); }) });
  });
  return (
    <section className="panel stack">
      <div><h3>Bloques guardados</h3><p className="muted small">Calentamientos, prevención, contrastes… Guárdalos desde cualquier bloque con «Guardar» y se insertan en cualquier sesión.</p></div>
      {blocks.length ? (
        <ul className="list">{blocks.map((b) => (
          <li key={b.id}><span><b>{b.name}</b> <span className="muted small">· {b.data.type} · {(b.data.items || []).map((i) => i.exercise).filter(Boolean).join(' · ')}</span></span>
            <button className="ib" aria-label={`Eliminar bloque ${b.name}`} onClick={() => del(b)}>✕</button></li>
        ))}</ul>
      ) : <Empty>Aún no has guardado ningún bloque.</Empty>}
    </section>
  );
}

// Portapapeles para copiar sesiones o bloques entre semanas y programas
const readClip = () => { try { return JSON.parse(localStorage.getItem('clip') || 'null'); } catch { return null; } };
const writeClip = (c) => { try { localStorage.setItem('clip', JSON.stringify(c)); } catch {} };

function Editor({ id }) {
  const { programs, players, exercises, uid, load, go, blocks = [] } = useCoach();
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

  // Si el programa aún no está en la lista (recién creado o lista desactualizada), lo trae directamente
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (prog) return undefined;
    if (orig) { setProg(orig); latest.current = orig; return undefined; }
    let off = false;
    supabase.from('programs').select('*').eq('id', id).limit(1).then(({ data }) => {
      if (off) return;
      if (data?.[0]) { setProg(data[0]); latest.current = data[0]; load('programs'); } else setMissing(true);
    });
    return () => { off = true; };
  }, [orig, prog, id]);

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
  const club = useClub(orig?.player_id);

  if (!prog && !missing) return <Loading />;
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
  const pflags = player?.flags || [];
  const clash = (it) => (pflags.length && it.exercise ? clashes(pflags, it.exercise, exMap[it.exercise]).map((c) => c[1]).join(', ') : '');

  // Crea el ejercicio en la biblioteca desde el propio buscador
  const quickAdd = (name, type) => act(async () => {
    await q(supabase.from('exercises').insert({ coach_id: uid, name, type: PACK_TYPES.includes(type) ? type : 'Fuerza' }));
    await load('exercises');
  }, `«${name}» añadido a la biblioteca. Complétale músculos y vídeo en Biblioteca.`);

  const copy = (kind, data, msg) => { const c = { kind, data }; writeClip(c); setClip(c); toast(msg); };

  const delWithUndo = (fn, msg) => { mut(fn); toast(msg, { undo }); };

  return (
    <>
      <div className="pagehead">
        <div style={{ flex: '1 1 320px' }}>
          <input aria-label="Nombre del programa" value={prog.name} onChange={(e) => commit({ ...prog, name: e.target.value })}
            style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 600, background: 'transparent', border: 'none', padding: 0 }} />
          <p className="muted">{player ? <>Copia de <b>{player.name}</b><Flag p={player} sm /></> : 'Plantilla'} · {totalWeeks(prog.data)} semanas · <span className="save">{status}</span></p>
        </div>
        <div className="row">
          {player && <label className="row small">Empieza el<input type="date" style={{ width: 'auto' }} value={prog.start_date || ''} onChange={(e) => commit({ ...prog, start_date: e.target.value || null })} /></label>}
          <button className="btn" onClick={undo} disabled={!hist.current.length} title="Ctrl+Z">Deshacer</button>
          <button className="btn" onClick={() => go('programacion')}>Volver</button>
        </div>
      </div>

      {!player && <Assign prog={prog} />}
      {player && <PlayerContext player={player} />}
      {player && player.kind !== 'personal' && <ClubPanel player={player} club={club} />}

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
            <button className="ib" aria-label="Mover fase antes" disabled={!pi} onClick={() => { mut((d) => { const a = d.phases; [a[pi - 1], a[pi]] = [a[pi], a[pi - 1]]; }); setPh(pi - 1); }}>↑</button>
            <button className="ib" aria-label="Mover fase después" disabled={pi === phases.length - 1} onClick={() => { mut((d) => { const a = d.phases; [a[pi + 1], a[pi]] = [a[pi], a[pi + 1]]; }); setPh(pi + 1); }}>↓</button>
            <button className="btn sm" onClick={() => { mut((d) => { const c = cloneWithNewIds(d.phases[pi]); c.name = `${c.name} (copia)`; d.phases.splice(pi + 1, 0, c); }); setPh(pi + 1); setWk(0); }}>Duplicar fase</button>
            {phases.length > 1 && <button className="btn sm danger" onClick={() => { delWithUndo((d) => d.phases.splice(pi, 1), `Fase «${phase.name}» eliminada.`); setPh(0); setWk(0); }}>Eliminar fase</button>}
          </div>
          <details open={!!phase.notes}>
            <summary className="small" style={{ cursor: 'pointer', fontWeight: 700 }}>Objetivos y criterios para pasar de fase</summary>
            <textarea aria-label="Objetivos y criterios de la fase" rows={phase.notes ? Math.min(10, phase.notes.split('\n').length + 1) : 3} style={{ marginTop: 6 }}
              placeholder="Ej. Duración orientativa, objetivos, criterios para avanzar y qué evitar" value={phase.notes || ''} onChange={(e) => mut((d) => { d.phases[pi].notes = e.target.value; })} />
          </details>
          {/* Semanas */}
          <div className="between">
            <div className="weekbar">
              {phase.weeks.map((w, i) => {
                const n = phases.slice(0, pi).reduce((a, x) => a + x.weeks.length, 0) + i + 1;
                return <button key={w.id} aria-pressed={i === wi} onClick={() => setWk(i)}>Semana {n}{w.name ? ` · ${w.name}` : ''}</button>;
              })}
            </div>
            <div className="row">
              <button className="btn sm" onClick={() => { mut((d) => d.phases[pi].weeks.push(emptyWeek())); setWk(phase.weeks.length); }}>+ Semana vacía</button>
              <button className="btn sm" onClick={() => { mut((d) => d.phases[pi].weeks.splice(wi + 1, 0, cloneWithNewIds(d.phases[pi].weeks[wi]))); setWk(wi + 1); }}>Duplicar semana</button>
              {phase.weeks.length > 1 && <button className="btn sm danger" onClick={() => { delWithUndo((d) => d.phases[pi].weeks.splice(wi, 1), `Semana ${weekNumber} eliminada.`); setWk(Math.max(0, wi - 1)); }}>Eliminar semana</button>}
            </div>
          </div>
          {week && <label className="row small">Nombre de la semana {weekNumber} (opcional)<input id="wk-name" aria-label="Nombre de la semana" list="wk-names" style={{ maxWidth: 220 }} placeholder="Ej. descarga, test, partido" value={week.name || ''} onChange={(e) => mut((d) => { W(d).name = e.target.value; })} /></label>}
          <datalist id="wk-names"><option value="descarga" /><option value="test" /><option value="carga" /><option value="semana de partido" /><option value="vuelta" /></datalist>
        </div>
      )}

      {week && player && player.kind !== 'personal' && prog.start_date && <WeekStrip prog={prog} n={weekNumber} week={week} club={club} />}
      {week && (
        <>
          {[...week.sessions].map((s, si) => ({ s, si })).sort((a, b) => a.s.day - b.s.day).map(({ s, si }) => (
            <section key={s.id} className="sess">
              <header>
                <select aria-label="Día" value={s.day} onChange={(e) => mut((d) => { W(d).sessions[si].day = Number(e.target.value); })}>{DAYS.map((x, i) => <option key={i} value={i + 1}>{x}</option>)}</select>
                {player && prog.start_date && <DayTag date={sessionDate(prog, weekNumber, s.day)} club={club} />}
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
                    <SaveBlock pack={p} />
                    <button className="ib" aria-label="Eliminar bloque" onClick={() => delWithUndo((d) => W(d).sessions[si].packs.splice(k, 1), 'Bloque eliminado.')}>✕</button>
                  </header>
                  <div className="items">
                    <div className="item itemhead"><span></span><span>Ejercicio</span><span>Series</span><span>Reps</span><span>Carga</span><span>Desc.</span><span>Notas</span><span></span></div>
                    {p.items.map((it, j) => {
                      const set = (f) => (e) => mut((d) => { W(d).sessions[si].packs[k].items[j][f] = e.target.value; });
                      return (
                        <div className={'item' + (clash(it) ? ' clash' : '')} key={it.id} title={clash(it) ? 'Choca con: ' + clash(it) : undefined}>
                          <span className="lb">{label(k, j)}</span>
                          <ExercisePicker className="ex" value={it.exercise} exercises={exercises}
                            onChange={(v) => mut((d) => { W(d).sessions[si].packs[k].items[j].exercise = v; })}
                            onCreate={(name) => quickAdd(name, p.type)} />
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
                {blocks.length > 0 && (
                  <select aria-label="Insertar bloque guardado" style={{ width: 'auto' }} value="" onChange={(e) => { const b = blocks.find((x) => x.id === e.target.value); if (b) { mut((d) => W(d).sessions[si].packs.push(cloneWithNewIds(b.data))); toast(`«${b.name}» insertado.`); } }}>
                    <option value="">Insertar bloque guardado…</option>{blocks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
              </div>
            </section>
          ))}
          <div className="row">
            <button className="btn pri" onClick={() => mut((d) => { const used = W(d).sessions.map((x) => x.day); W(d).sessions.push(emptySession([1, 3, 5, 2, 4, 6, 7].find((x) => !used.includes(x)) || 1)); })}>+ Sesión</button>
            {clip?.kind === 'session' && <button className="btn" onClick={() => mut((d) => W(d).sessions.push(cloneWithNewIds(clip.data)))}>Pegar sesión ({clip.data.name || DAYS[clip.data.day - 1]})</button>}
          </div>
          {!week.sessions.length && <Empty>Semana sin sesiones. Añade una con «+ Sesión».</Empty>}
          <MuscleBars muscles={muscles} title={`Series por músculo · ${phase.name} · semana ${weekNumber}${week.name ? ' · ' + week.name : ''}`} />
        </>
      )}

      {prog.data.refs?.length > 0 && (
        <details className="panel small"><summary style={{ cursor: 'pointer' }}><b>Bibliografía</b></summary><ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>{prog.data.refs.map((r) => <li key={r}>{r}</li>)}</ul></details>
      )}
      <div className="row"><button className="btn sm" onClick={() => exportProgramCSV(prog)}>Descargar en CSV (Excel)</button></div>
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
  }, 'Asignado. Ahora editas la copia del cliente.');
  return (
    <div className="panel row">
      <b>Asignar a cliente</b>
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

// Lo importante del cliente y su evolución reciente, delante al programar
function PlayerContext({ player }) {
  const { notes, evolution = [], go } = useCoach();
  const items = importantOf(player, notes);
  const evo = evolution.filter((e) => e.player_id === player.id).slice(0, 3);
  const first = player.name.split(' ')[0];
  return (
    <div className="grid2">
      <div className="notebox stack">
        <b>! Notas importantes de {first}</b>
        {items.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{items.map((t, i) => <li key={i}>{t}</li>)}</ul> : <span className="muted small">Nada marcado. Añádelo en su ficha (Datos o Notas).</span>}
        {(player.flags || []).length > 0 && <span className="small">Los ejercicios marcados en amarillo chocan con: {(player.flags || []).map(flagLabel).join(', ')}.</span>}
      </div>
      <div className="evobox stack">
        <div className="between"><b>Evolución reciente de {first}</b><button className="btn ghost sm" onClick={() => go('clientes', player.id)}>Ver todo</button></div>
        {evo.length ? evo.map((e) => (
          <div key={e.id}><span className={'cat cat-' + e.category}>{evoLabel(e.category)}</span> <span className="muted small">{fmtDate(e.date)}</span><div>{e.text}</div></div>
        )) : <span className="muted small">Sin entradas todavía.</span>}
      </div>
      <div style={{ gridColumn: '1 / -1' }}><WeekNoteEditor p={player} /></div>
    </div>
  );
}

// Series semanales por músculo con la franja objetivo
function MuscleBars({ muscles, title }) {
  const all = [...new Set([...MUSCLES, ...Object.keys(muscles)])];
  if (!Object.keys(muscles).length) return null;
  const [lo, hi] = SET_RANGE;
  const max = Math.max(hi * 1.25, ...Object.values(muscles));
  const pct = (v) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <div className="panel stack">
      <h3>{title}</h3>
      <p className="muted small">Principal cuenta 1 serie y secundario 0,5 (Pelland et al., 2025); las vueltas del bloque multiplican. Franja verde = {lo}-{hi} series semanales, lo habitual para hipertrofia (Schoenfeld et al., 2017). En fases de fuerza o potencia puede ser menos.</p>
      <div className="stack" style={{ gap: 8 }}>
        {all.map((m) => {
          const v = muscles[m] || 0;
          const col = v > hi ? 'var(--bad)' : v >= lo ? 'var(--ok)' : 'var(--warn)';
          return (
            <div className="mbar" key={m}>
              <span>{m}</span>
              <span className="track" role="img" aria-label={`${m}: ${v} series`}>
                <span className="range" style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }} />
                <span className="val" style={{ width: pct(v), background: col }} />
              </span>
              <b className="num" style={{ textAlign: 'right' }}>{v.toFixed(1).replace('.', ',')}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SaveBlock({ pack }) {
  const { uid, load } = useCoach();
  const act = useAction();
  const [name, setName] = useState(null);
  if (name == null) return <button className="btn sm" onClick={() => setName(pack.type)}>Guardar</button>;
  return (
    <form className="row" onSubmit={(e) => { e.preventDefault(); act(async () => { await q(supabase.from('saved_blocks').insert({ coach_id: uid, name: name.trim() || pack.type, data: cloneWithNewIds(pack) })); await load('blocks'); setName(null); }, 'Bloque guardado. Lo tienes en «Insertar bloque guardado».'); }}>
      <input aria-label="Nombre del bloque" autoFocus style={{ width: 170 }} value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn sm pri" type="submit">OK</button><button type="button" className="btn sm" onClick={() => setName(null)}>✕</button>
    </form>
  );
}

const short = (d) => { const x = new Date(d + 'T00:00'); return `${x.getDate()}/${x.getMonth() + 1}`; };
function DayTag({ date, club }) {
  if (!date) return null;
  const c = clubDay(date, club);
  return (
    <span className="row" style={{ gap: 4 }}>
      <span className="muted small num">{short(date)}</span>
      {c.match && <span className="ctag match" title={matchText(c.match)}>Partido</span>}
      {c.training && <span className="ctag club">Club{c.time ? ' ' + c.time : ''}</span>}
      {c.off && <span className="ctag off">Sin entreno club</span>}
      {c.md && <span className="ctag md" title="Días respecto al partido más cercano">{c.md}</span>}
    </span>
  );
}

// La semana del cliente con sus entrenos de club y partidos, para cuadrar las sesiones
function WeekStrip({ prog, n, week, club }) {
  const days = Array.from({ length: 7 }, (_, i) => ({ day: i + 1, date: sessionDate(prog, n, i + 1) }));
  return (
    <div className="panel weekstrip" aria-label="Semana del cliente">
      {days.map(({ day, date }) => {
        const c = clubDay(date, club);
        const ss = week.sessions.filter((x) => x.day === day);
        return (
          <div key={day} className={'wsd' + (c.match ? ' m' : c.training ? ' c' : '')}>
            <b>{DAYS[day - 1].slice(0, 3)} <span className="muted small">{short(date)}</span></b>
            {c.match && <span className="ctag match">{c.match.label ? `vs ${c.match.label}` : 'Partido'}</span>}
            {c.training && <span className="ctag club">Club{c.time ? ' ' + c.time : ''}</span>}
            {c.md && <span className="ctag md">{c.md}</span>}
            {ss.map((x) => <span key={x.id} className="small">● {x.name || 'Sesión'}</span>)}
          </div>
        );
      })}
    </div>
  );
}

function ClubPanel({ player, club }) {
  const days = (club.schedule?.weekdays || []).map((d) => DAYS[d - 1].slice(0, 3).toLowerCase()).join(', ');
  const nm = nextMatch(club);
  return (
    <details className="panel">
      <summary style={{ cursor: 'pointer' }}><b>Club de {player.name.split(' ')[0]}</b> <span className="muted small">· {days ? `entrena ${days}` : 'sin días de club'}{nm ? ` · próximo partido ${short(nm.date)}${nm.label ? ' vs ' + nm.label : ''}` : ''} · lo puede editar también el cliente</span></summary>
      <div style={{ marginTop: 12 }}>{club.ready ? <ClubEditor playerId={player.id} club={club} /> : <span className="muted">Cargando…</span>}</div>
    </details>
  );
}
