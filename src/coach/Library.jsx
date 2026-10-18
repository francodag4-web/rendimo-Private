import React, { useEffect, useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { matches, norm } from '../lib/util.js';
import { parseCSV } from '../lib/csv.js';
import { useAction, useToast, Empty } from '../ui/ui.jsx';
import { PACK_TYPES } from '../lib/program.js';
import { BASIC } from './basicLibrary.js';

export const MUSCLES = ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Aductores', 'Gemelos', 'Pectoral', 'Dorsal', 'Espalda alta', 'Deltoides', 'Bíceps', 'Tríceps', 'Core', 'Cuello'];


export default function Library() {
  const { exercises, uid, load, route } = useCoach();
  const act = useAction();
  const toast = useToast();
  const fromSearch = route.id?.startsWith('q=') ? decodeURIComponent(route.id.slice(2)) : '';
  const [qy, setQy] = useState(fromSearch);
  useEffect(() => { if (fromSearch) setQy(fromSearch); }, [fromSearch]);
  const [type, setType] = useState('');
  const [edit, setEdit] = useState(null); // null | 'new' | exercise
  const [importing, setImporting] = useState(false);
  const [limit, setLimit] = useState(150);
  const types = [...new Set(exercises.map((e) => e.type))].sort();
  const list = exercises.filter((e) => (!type || (type === '__nomus' ? !e.primary_muscle : type === '__novid' ? !e.video_url : e.type === type))
    && matches(`${e.name} ${e.type} ${e.primary_muscle || ''} ${(e.secondary || []).join(' ')} ${e.category || ''} ${e.notes || ''}`, qy));
  const noMus = exercises.filter((e) => !e.primary_muscle).length;

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
          <button className="btn" onClick={() => setImporting(!importing)}>Importar CSV</button>
          <button className="btn pri" onClick={() => setEdit('new')}>+ Ejercicio</button>
        </div>
      </div>
      {importing && <Importer onClose={() => setImporting(false)} />}
      {edit && <ExForm ex={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      <div className="row">
        <input id="libq" style={{ maxWidth: 320 }} placeholder="Buscar ejercicio o músculo" value={qy} onChange={(e) => setQy(e.target.value)} />
        <select id="libtype" style={{ width: 'auto' }} value={type} onChange={(e) => { setType(e.target.value); setLimit(150); }}><option value="">Todos los tipos</option>{types.map((t) => <option key={t}>{t}</option>)}<option value="__nomus">Sin músculos ({noMus})</option><option value="__novid">Sin vídeo</option></select>
        <span className="muted small">{list.length} de {exercises.length}</span>
      </div>
      {list.length ? (
        <div className="panel tablewrap">
          <table>
            <thead><tr><th>Ejercicio</th><th>Tipo</th><th>Músculos</th><th>Vídeo</th><th></th></tr></thead>
            <tbody>
              {list.slice(0, limit).map((e) => (
                <tr key={e.id}>
                  <td><b>{e.name}</b>{e.category && <div className="small" style={{ color: 'var(--brand)' }}>{e.category}</div>}{e.notes && <div className="muted small clamp">{e.notes}</div>}</td>
                  <td>{e.type}</td>
                  <td className="small"><b>{e.primary_muscle || '—'}</b>{e.secondary?.length ? ' · ' + e.secondary.join(', ') : ''}</td>
                  <td>{e.video_url ? <a href={e.video_url} target="_blank" rel="noopener">Ver</a> : <span className="muted">—</span>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><button className="btn sm" onClick={() => setEdit(e)}>Editar</button><button className="ib" aria-label={'Eliminar ' + e.name} onClick={() => del(e)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length > limit && <div className="row" style={{ justifyContent: 'center', padding: 10 }}><button className="btn" onClick={() => setLimit(limit + 300)}>Ver más ({list.length - limit} restantes)</button></div>}
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
      const row = { name: f.name.trim(), type: f.type, primary_muscle: f.primary_muscle || null, secondary: f.secondary.filter((m) => m !== f.primary_muscle), video_url: f.video_url || null, notes: f.notes || null, category: f.category || null };
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
        <label className="f">Músculo principal<select id="ex-prim" value={f.primary_muscle || ''} onChange={set('primary_muscle')}><option value="">Sin asignar</option>{MUSCLES.map((m) => <option key={m}>{m}</option>)}</select></label>
        <label className="f">Vídeo (enlace de YouTube, Drive, Instagram…)<input id="ex-video" type="url" value={f.video_url || ''} onChange={set('video_url')} placeholder="https://" /></label>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <span className="small muted"><b>Músculos secundarios</b> (cuentan 0,5 series)</span>
        <div className="row">{MUSCLES.filter((m) => m !== f.primary_muscle).map((m) => (
          <button type="button" key={m} className={'btn sm' + (f.secondary.includes(m) ? ' pri' : '')} aria-pressed={f.secondary.includes(m)} onClick={() => toggleSec(m)}>{m}</button>
        ))}</div>
      </div>
      <label className="f">Categoría (para buscar y ordenar)<input value={f.category || ''} onChange={set('category')} placeholder="Ej. Fuerza › Dominante de rodilla" /></label>
      <label className="f">Explicación o puntos clave<textarea value={f.notes || ''} onChange={set('notes')} /></label>
      <div className="row"><button className="btn pri" type="submit">Guardar</button><button type="button" className="btn" onClick={onClose}>Cancelar</button></div>
    </form>
  );
}

// Importar ejercicios desde CSV: nombre, tipo, musculo_principal, musculos_secundarios (|), video, explicacion, categoria
function Importer({ onClose }) {
  const { exercises, uid, load } = useCoach();
  const act = useAction();
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState('');
  const onFile = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    act(async () => {
      const rows = parseCSV(await file.text());
      if (!rows.length || !('nombre' in rows[0])) throw new Error('El archivo necesita una columna «nombre».');
      const byName = new Map(exercises.map((e) => [norm(e.name), e]));
      const seen = new Set();
      const add = [], upd = [];
      let same = 0;
      for (const r of rows) {
        const name = r.nombre?.trim();
        if (!name || seen.has(norm(name))) continue;
        seen.add(norm(name));
        const prim = MUSCLES.includes(r.musculo_principal) ? r.musculo_principal : null;
        const sec = (r.musculos_secundarios || '').split('|').map((x) => x.trim()).filter((x) => MUSCLES.includes(x) && x !== prim);
        const row = { name, type: r.tipo || 'Fuerza', primary_muscle: prim, secondary: sec, video_url: r.video || null, notes: r.explicacion || null, category: r.categoria || null };
        const ex = byName.get(norm(name));
        if (!ex) { add.push({ ...row, coach_id: uid }); continue; }
        // Solo rellena lo que falta; no pisa lo que ya editaste
        const patch = {};
        if (!ex.video_url && row.video_url) patch.video_url = row.video_url;
        if (!ex.notes && row.notes) patch.notes = row.notes;
        if (!ex.category && row.category) patch.category = row.category;
        if (!ex.primary_muscle && row.primary_muscle) { patch.primary_muscle = row.primary_muscle; patch.secondary = row.secondary; }
        if (Object.keys(patch).length) upd.push({ id: ex.id, patch }); else same++;
      }
      setPlan({ add, upd, same, file: file.name });
    });
  };
  const run = () => act(async () => {
    for (let i = 0; i < plan.add.length; i += 200) {
      setBusy(`Añadiendo ${Math.min(i + 200, plan.add.length)} de ${plan.add.length}…`);
      await q(supabase.from('exercises').insert(plan.add.slice(i, i + 200)));
    }
    for (let i = 0; i < plan.upd.length; i += 20) {
      setBusy(`Completando ${Math.min(i + 20, plan.upd.length)} de ${plan.upd.length}…`);
      await Promise.all(plan.upd.slice(i, i + 20).map((u) => q(supabase.from('exercises').update(u.patch).eq('id', u.id))));
    }
    setBusy('');
    await load('exercises');
    onClose();
  }, `Importación hecha: ${plan?.add.length || 0} nuevos y ${plan?.upd.length || 0} completados.`);
  return (
    <div className="panel stack">
      <div className="between"><h3>Importar ejercicios</h3><button className="btn sm" onClick={onClose}>Cerrar</button></div>
      <p className="small muted">Archivo CSV con columnas: nombre, tipo, musculo_principal, musculos_secundarios (separados por |), video, explicacion, categoria. No se duplica nada: si un ejercicio ya existe, solo se rellenan los datos que le falten.</p>
      <input id="imp-file" type="file" accept=".csv,text/csv" onChange={onFile} />
      {plan && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="row"><span className="pill ok">{plan.add.length} nuevos</span><span className="pill brand">{plan.upd.length} se completan</span><span className="pill">{plan.same} ya estaban</span></div>
          <div className="row"><button className="btn pri" disabled={!!busy || (!plan.add.length && !plan.upd.length)} onClick={run}>{busy || 'Importar'}</button></div>
        </div>
      )}
    </div>
  );
}
