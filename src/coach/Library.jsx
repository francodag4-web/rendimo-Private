import React, { useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { matches } from '../lib/util.js';
import { useAction, useToast, Empty } from '../ui/ui.jsx';
import { PACK_TYPES } from '../lib/program.js';
import { BASIC } from './basicLibrary.js';

export const MUSCLES = ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Aductores', 'Gemelos', 'Pectoral', 'Dorsal', 'Espalda alta', 'Deltoides', 'Bíceps', 'Tríceps', 'Core', 'Cuello'];


export default function Library() {
  const { exercises, uid, load } = useCoach();
  const act = useAction();
  const toast = useToast();
  const [qy, setQy] = useState('');
  const [type, setType] = useState('');
  const [edit, setEdit] = useState(null); // null | 'new' | exercise
  const types = [...new Set(exercises.map((e) => e.type))].sort();
  const list = exercises.filter((e) => (!type || e.type === type) && matches(`${e.name} ${e.type} ${e.primary_muscle || ''} ${(e.secondary || []).join(' ')}`, qy));

  const have = new Set(exercises.map((e) => e.name.toLowerCase()));
  const missing = BASIC.filter(([n]) => !have.has(n.toLowerCase()));
  const seed = () => act(async () => {
    const rows = missing.map(([name, type, primary_muscle, secondary]) => ({ coach_id: uid, name, type, primary_muscle, secondary }));
    if (rows.length) await q(supabase.from('exercises').insert(rows));
    await load('exercises');
  }, `Añadidos ${missing.length} ejercicios a tu biblioteca.`);

  const del = (e) => act(async () => {
    await q(supabase.from('exercises').delete().eq('id', e.id));
    await load('exercises');
    toast(`${e.name} eliminado. Los programas que ya lo usan no cambian.`, { undo: () => act(async () => { const { id, created_at, ...rest } = e; await q(supabase.from('exercises').insert(rest)); await load('exercises'); }) });
  });

  return (
    <>
      <div className="pagehead">
        <div><h1>Biblioteca</h1><p>{exercises.length} ejercicios. Los mismos que te aparecen al escribir en Programación.</p></div>
        <div className="row">
          {missing.length > 0 && <button className="btn" onClick={seed}>{exercises.length ? `Añadir ${missing.length} ejercicios básicos` : `Cargar biblioteca básica (${missing.length})`}</button>}
          <button className="btn pri" onClick={() => setEdit('new')}>+ Ejercicio</button>
        </div>
      </div>
      {edit && <ExForm ex={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      <div className="row">
        <input id="libq" style={{ maxWidth: 320 }} placeholder="Buscar ejercicio o músculo" value={qy} onChange={(e) => setQy(e.target.value)} />
        <select style={{ width: 'auto' }} value={type} onChange={(e) => setType(e.target.value)}><option value="">Todos los tipos</option>{types.map((t) => <option key={t}>{t}</option>)}</select>
        <span className="muted small">{list.length} de {exercises.length}</span>
      </div>
      {list.length ? (
        <div className="panel tablewrap">
          <table>
            <thead><tr><th>Ejercicio</th><th>Tipo</th><th>Músculos</th><th>Vídeo</th><th></th></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td><b>{e.name}</b>{e.notes && <div className="muted small">{e.notes}</div>}</td>
                  <td>{e.type}</td>
                  <td className="small"><b>{e.primary_muscle || '—'}</b>{e.secondary?.length ? ' · ' + e.secondary.join(', ') : ''}</td>
                  <td>{e.video_url ? <a href={e.video_url} target="_blank" rel="noopener">Ver</a> : <span className="muted">—</span>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><button className="btn sm" onClick={() => setEdit(e)}>Editar</button><button className="ib" aria-label={'Eliminar ' + e.name} onClick={() => del(e)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty>{exercises.length ? 'Ningún ejercicio coincide.' : 'Tu biblioteca está vacía. Carga la básica o añade tus ejercicios.'}</Empty>}
    </>
  );
}

function ExForm({ ex, onClose }) {
  const { uid, load } = useCoach();
  const act = useAction();
  const [f, setF] = useState(ex ? { ...ex } : { name: '', type: 'Fuerza', primary_muscle: 'Cuádriceps', secondary: [], video_url: '', notes: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleSec = (m) => setF({ ...f, secondary: f.secondary.includes(m) ? f.secondary.filter((x) => x !== m) : [...f.secondary, m] });
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      const row = { name: f.name.trim(), type: f.type, primary_muscle: f.primary_muscle, secondary: f.secondary.filter((m) => m !== f.primary_muscle), video_url: f.video_url || null, notes: f.notes || null };
      if (ex) await q(supabase.from('exercises').update(row).eq('id', ex.id));
      else await q(supabase.from('exercises').insert({ ...row, coach_id: uid }));
      await load('exercises');
      onClose();
    }, ex ? 'Ejercicio actualizado.' : 'Ejercicio añadido. Ya aparece en Programación.');
  };
  return (
    <form className="panel stack" onSubmit={save}>
      <h3>{ex ? 'Editar ejercicio' : 'Nuevo ejercicio'}</h3>
      <div className="grid2">
        <label className="f">Nombre<input id="ex-name" required value={f.name} onChange={set('name')} /></label>
        <label className="f">Tipo<select id="ex-type" value={f.type} onChange={set('type')}>{[...new Set([...PACK_TYPES, f.type])].map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="f">Músculo principal<select id="ex-prim" value={f.primary_muscle || ''} onChange={set('primary_muscle')}>{MUSCLES.map((m) => <option key={m}>{m}</option>)}</select></label>
        <label className="f">Vídeo (enlace de YouTube, Drive, Instagram…)<input id="ex-video" type="url" value={f.video_url || ''} onChange={set('video_url')} placeholder="https://" /></label>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <span className="small muted"><b>Músculos secundarios</b> (cuentan 0,5 series)</span>
        <div className="row">{MUSCLES.filter((m) => m !== f.primary_muscle).map((m) => (
          <button type="button" key={m} className={'btn sm' + (f.secondary.includes(m) ? ' pri' : '')} aria-pressed={f.secondary.includes(m)} onClick={() => toggleSec(m)}>{m}</button>
        ))}</div>
      </div>
      <label className="f">Explicación o puntos clave<textarea value={f.notes || ''} onChange={set('notes')} /></label>
      <div className="row"><button className="btn pri" type="submit">Guardar</button><button type="button" className="btn" onClick={onClose}>Cancelar</button></div>
    </form>
  );
}
