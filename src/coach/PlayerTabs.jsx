import React, { useState, useEffect } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { iso, fmtDate, fmtDateTime, addDays, mondayOf } from '../lib/util.js';
import { useAction, useToast, Empty } from '../ui/ui.jsx';
import { totalWeeks, cloneWithNewIds } from '../lib/program.js';

export function PlayerPrograms({ p }) {
  const { programs, uid, load, go } = useCoach();
  const act = useAction();
  const mine = programs.filter((x) => x.player_id === p.id);
  const tpls = programs.filter((x) => !x.player_id);
  const [tpl, setTpl] = useState(tpls[0]?.id || '');
  const [start, setStart] = useState(iso(mondayOf(addDays(new Date(), 7))));
  useEffect(() => { if (!tpl && tpls[0]) setTpl(tpls[0].id); }, [tpls.length]);
  const assign = () => act(async () => {
    const t = programs.find((x) => x.id === tpl);
    const row = await q(supabase.from('programs').insert({ coach_id: uid, player_id: p.id, template_id: t.id, name: t.name, start_date: start, data: cloneWithNewIds(t.data) }).select().single());
    await load('programs');
    go('programacion', row.id);
  }, 'Programa asignado. Es una copia: los cambios en la plantilla no le afectan.');
  return (
    <div className="stack">
      <div className="panel stack">
        <h3>Asignar desde plantilla</h3>
        {tpls.length ? (
          <div className="row">
            <select id="as-tpl" style={{ maxWidth: 280 }} value={tpl} onChange={(e) => setTpl(e.target.value)}>{tpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <label className="row small">Empieza el<input id="as-start" type="date" style={{ width: 'auto' }} value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <button className="btn pri" onClick={assign}>Asignar copia</button>
          </div>
        ) : <p className="muted">Crea primero una plantilla en Programación.</p>}
      </div>
      <div className="panel stack">
        <h3>Programas de {p.name.split(' ')[0]}</h3>
        {mine.length ? <ul className="list">{mine.map((x) => <li key={x.id}><span><b>{x.name}</b> · {x.start_date ? `desde ${fmtDate(x.start_date)}` : 'sin fecha'} · {totalWeeks(x.data)} semanas</span><button className="btn sm" onClick={() => go('programacion', x.id)}>Editar</button></li>)}</ul> : <Empty>Sin programas asignados.</Empty>}
      </div>
    </div>
  );
}

const HFIELDS = [
  ['antecedentes', 'Enfermedades o condiciones relevantes', 'area'],
  ['medicacion', 'Medicación actual', 'area'],
  ['alergias', 'Alergias', 'text'],
  ['familiares', 'Antecedentes familiares (cardiovasculares, muerte súbita…)', 'text'],
  ['habitos', 'Hábitos (sueño, trabajo, tabaco, alcohol)', 'text'],
  ['lesiones', 'Lesiones previas (fecha, tipo, gravedad, días de baja)', 'area'],
  ['cirugias', 'Cirugías', 'area'],
  ['conmociones', 'Conmociones cerebrales (número, última, vuelta gradual completada)', 'area'],
  ['pruebas', 'Pruebas e informes (resonancias, ecografías, analíticas…)', 'area'],
  ['profesionales', 'Profesionales de referencia (fisio, médico)', 'text'],
  ['evolucion', 'Evolución: qué ha pasado y qué cambias (con fecha)', 'area'],
];

export function Health({ p }) {
  const act = useAction();
  const [data, setData] = useState(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    supabase.from('health').select('data').eq('player_id', p.id).limit(1).then(({ data: r }) => setData(r?.[0]?.data || {}));
  }, [p.id]);
  if (!data) return <p className="muted">Cargando…</p>;
  const set = (k) => (e) => { setData({ ...data, [k]: e.target.value }); setDirty(true); };
  const save = () => act(async () => {
    await q(supabase.from('health').upsert({ player_id: p.id, data }));
    setDirty(false);
  }, 'Historia clínica guardada.');
  return (
    <div className="stack">
      <div className="panel stack">
        <div className="between"><h3>Historia clínica</h3><button className="btn pri" disabled={!dirty} onClick={save}>{dirty ? 'Guardar cambios' : 'Guardado'}</button></div>
        <div className="grid2">
          {HFIELDS.map(([k, l, t]) => (
            <label key={k} className="f" style={t === 'area' ? {} : {}}>{l}
              {t === 'area' ? <textarea id={'h-' + k} value={data[k] || ''} onChange={set(k)} /> : <input id={'h-' + k} value={data[k] || ''} onChange={set(k)} />}
            </label>
          ))}
        </div>
      </div>
      <p className="muted small">Datos de salud: solo los ves tú; {p.name.split(' ')[0]} puede leerlos pero no editarlos. Consentimiento expreso {p.consent_at ? `firmado el ${fmtDate(p.consent_at)}` : 'pendiente: lo acepta al entrar por primera vez'}.</p>
    </div>
  );
}

export function Notes({ p }) {
  const { notes, uid, load } = useCoach();
  const act = useAction();
  const toast = useToast();
  const mine = notes.filter((n) => n.player_id === p.id);
  const [f, setF] = useState({ kind: 'nota', text: '', remind_at: '' });
  const add = (e) => {
    e.preventDefault();
    act(async () => {
      await q(supabase.from('notes').insert({ coach_id: uid, player_id: p.id, kind: f.kind, text: f.text.trim(), remind_at: f.remind_at ? new Date(f.remind_at).toISOString() : null }));
      setF({ kind: 'nota', text: '', remind_at: '' });
      await load('notes');
    }, 'Nota guardada.');
  };
  const toggle = (n) => act(async () => { await q(supabase.from('notes').update({ done: !n.done }).eq('id', n.id)); await load('notes'); });
  const del = (n) => act(async () => {
    await q(supabase.from('notes').delete().eq('id', n.id));
    await load('notes');
    toast('Nota eliminada.', { undo: () => act(async () => { const { id, ...rest } = n; await q(supabase.from('notes').insert(rest)); await load('notes'); }) });
  });
  return (
    <div className="stack">
      <form className="panel stack" onSubmit={add}>
        <div className="row">
          <select id="n-kind" style={{ width: 'auto' }} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="nota">Nota</option><option value="importante">⚠ Importante</option></select>
          <input id="n-text" required style={{ flex: '1 1 260px' }} placeholder="Ej. Revisar técnica de cargada" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
          <label className="row small">Avisarme<input id="n-when" type="datetime-local" style={{ width: 'auto' }} value={f.remind_at} onChange={(e) => setF({ ...f, remind_at: e.target.value })} /></label>
          <button className="btn pri" type="submit">Añadir</button>
        </div>
        <p className="muted small">Las notas con aviso aparecen en Inicio y en la Agenda el día que toca. Para un aviso fijo en su ficha, usa «Importante» en Datos.</p>
      </form>
      {mine.length ? (
        <ul className="list">
          {mine.map((n) => (
            <li key={n.id} style={n.done ? { opacity: 0.55 } : {}}>
              <span>{n.kind === 'importante' && <span className="pill warn">Importante</span>} {n.text}{n.remind_at && <span className="muted small"> · aviso {fmtDateTime(n.remind_at)}</span>}</span>
              <span className="row"><button className="btn sm" onClick={() => toggle(n)}>{n.done ? 'Reabrir' : 'Hecha'}</button><button className="ib" aria-label="Eliminar nota" onClick={() => del(n)}>✕</button></span>
            </li>
          ))}
        </ul>
      ) : <Empty>Sin notas.</Empty>}
    </div>
  );
}

