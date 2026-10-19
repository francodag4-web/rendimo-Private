import React, { useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { uid as newId, norm } from '../lib/util.js';
import { parseCSV } from '../lib/csv.js';
import { useAction } from '../ui/ui.jsx';
import { rowsToPrograms, programToRows, toCSV, EXAMPLE_ROWS, downloadText } from '../lib/templateCsv.js';
import { PROTOCOLS, protocolToProgram } from '../lib/protocols.js';
import { totalWeeks } from '../lib/program.js';

const count = (data) => {
  let s = 0, e = 0;
  data.phases.forEach((ph) => ph.weeks.forEach((w) => w.sessions.forEach((x) => { s++; x.packs.forEach((p) => (e += p.items.length)); })));
  return { phases: data.phases.length, weeks: totalWeeks(data), sessions: s, exercises: e };
};
const allExercises = (data) => data.phases.flatMap((ph) => ph.weeks.flatMap((w) => w.sessions.flatMap((s) => s.packs.flatMap((p) => p.items.map((i) => i.exercise)))));

// Importar plantillas desde un CSV (una fila por ejercicio)
export function TemplateImporter({ onClose }) {
  const { exercises, uid, load } = useCoach();
  const act = useAction();
  const [progs, setProgs] = useState(null);
  const lib = new Set(exercises.map((e) => norm(e.name)));
  const onFile = (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    act(async () => {
      const rows = parseCSV(await file.text());
      const list = rowsToPrograms(rows, file.name.replace(/\.csv$/i, ''));
      if (!list.length) throw new Error('No encuentro ejercicios. Revisa que el archivo tenga las columnas de la plantilla de ejemplo.');
      setProgs(list);
    });
  };
  const create = () => act(async () => {
    for (const p of progs) await q(supabase.from('programs').insert({ coach_id: uid, name: p.name, data: p.data }));
    await load('programs');
    onClose();
  }, `${progs.length} plantilla${progs.length === 1 ? '' : 's'} creada${progs.length === 1 ? '' : 's'}.`);
  return (
    <section className="panel stack">
      <div className="between"><h3>Importar plantillas desde CSV</h3><button className="btn sm" onClick={onClose}>Cerrar</button></div>
      <p className="small muted">Una fila por ejercicio con estas columnas: plantilla, fase, objetivos_fase, semana, nombre_semana, dia, sesion, bloque, tipo_bloque, vueltas, notas_bloque, ejercicio, series, reps, carga, descanso, notas. Sirve el «;» o la «,» como separador (Excel en español usa «;»). Un archivo puede traer varias plantillas.</p>
      <div className="row">
        <input id="tpl-file" type="file" accept=".csv,text/csv" onChange={onFile} style={{ maxWidth: 340 }} />
        <button type="button" className="btn sm" onClick={() => downloadText('plantilla-ejemplo.csv', toCSV(EXAMPLE_ROWS))}>Descargar ejemplo</button>
      </div>
      {progs && (
        <>
          <ul className="list">{progs.map((p) => {
            const c = count(p.data); const miss = [...new Set(allExercises(p.data).filter((x) => x && !lib.has(norm(x))))];
            return (
              <li key={p.name} style={{ display: 'block' }}>
                <b>{p.name}</b> <span className="muted small">· {c.phases} fases · {c.weeks} semanas · {c.sessions} sesiones · {c.exercises} ejercicios</span>
                {miss.length > 0 && <div className="small" style={{ color: 'var(--warn)' }}>{miss.length} ejercicio{miss.length === 1 ? '' : 's'} no están en tu biblioteca (se guardan igual, sin vídeo): {miss.slice(0, 6).join(', ')}{miss.length > 6 ? '…' : ''}</div>}
              </li>
            );
          })}</ul>
          <div className="row"><button className="btn pri" onClick={create}>Crear {progs.length} plantilla{progs.length === 1 ? '' : 's'}</button></div>
        </>
      )}
    </section>
  );
}

// Protocolos de readaptación listos para usar
export function ProtocolGallery({ onClose }) {
  const { programs, uid, load, go } = useCoach();
  const act = useAction();
  const add = (p) => act(async () => {
    const row = await q(supabase.from('programs').insert({ coach_id: uid, name: p.name, data: protocolToProgram(p, newId) }).select().single());
    await load('programs');
    go('programacion', row.id);
  }, `«${p.name}» añadido a tus plantillas. Es tuyo: edítalo como quieras.`);
  const csv = (p) => downloadText(`${p.key}.csv`, toCSV(programToRows(p.name, protocolToProgram(p, newId))));
  return (
    <section className="panel stack">
      <div className="between">
        <div><h3>Protocolos de readaptación</h3><p className="small muted">Por fases y con criterios para avanzar, según las guías clínicas y el máster IPTC. Cada fase trae una semana modelo: duplícala hasta que cumpla los criterios. Todos los ejercicios son de tu biblioteca, con su vídeo.</p></div>
        <button className="btn sm" onClick={onClose}>Cerrar</button>
      </div>
      <div className="board protos">
        {PROTOCOLS.map((p, i) => {
          const have = programs.some((x) => !x.player_id && x.name === p.name);
          const c = count(protocolToProgram(p, () => 'x'));
          return (
            <article key={p.key} className={'tile ' + ['t-g', 't-r', 't-o', 't-b', 't-p', 't-t', 't-a', 't-s', 't-g'][i % 9]} aria-label={p.name}>
              <h3>{p.short}</h3>
              <div className="sub">{p.desc}</div>
              <div className="small">{c.phases} fases · {c.sessions} sesiones · {c.exercises} ejercicios</div>
              <details className="small"><summary>Fases</summary><ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>{p.phases.map((ph) => <li key={ph.name}>{ph.name}</li>)}</ol></details>
              <details className="small"><summary>Bibliografía</summary><ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{p.refs.map((r) => <li key={r}>{r}</li>)}</ul></details>
              <div className="row">
                <button className="btn" onClick={() => add(p)}>{have ? 'Añadir otra copia' : 'Añadir a mis plantillas'}</button>
                <button className="btn sm" onClick={() => csv(p)}>CSV</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export const exportProgramCSV = (prog) => downloadText(`${prog.name.replace(/[^\wáéíóúñ -]/gi, '').trim() || 'plantilla'}.csv`, toCSV(programToRows(prog.name, prog.data)));
