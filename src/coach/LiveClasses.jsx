import React, { useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { iso, uid as newId, fmtDate } from '../lib/util.js';
import { useAction, useToast } from '../ui/ui.jsx';
import { DURATIONS, weeklyDates, validUrl, cleanUrl, isMeet } from '../lib/classes.js';

const REPEAT = [[1, 'No se repite'], ...[2, 3, 4, 6, 8, 10, 12, 16].map((n) => [n, `Cada semana, ${n} semanas`])];
const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const at = (date, time) => new Date(`${date}T${time || '19:00'}`).toISOString();

// Nueva clase o edición de una existente. `c` = clase a editar (o null), `date` = día propuesto.
export default function ClassForm({ c, date, onClose }) {
  const { players, uid, load, liveClasses = [] } = useCoach();
  const act = useAction();
  const toast = useToast();
  const d0 = c ? new Date(c.starts_at) : null;
  const last = [...liveClasses].sort((a, b) => b.created_at?.localeCompare(a.created_at || '') || 0)[0];
  const [f, setF] = useState(() => ({
    player: c?.player_id || '', date: c ? iso(d0) : date || iso(), time: c ? hm(d0) : '19:00',
    dur: c?.duration_min || 60, url: c?.meet_url || '', note: c?.note || '', weeks: 1, scope: 'one', sure: false,
  }));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const series = c?.series_id ? liveClasses.filter((x) => x.series_id === c.series_id) : [];
  const following = series.filter((x) => x.starts_at >= c.starts_at);
  // Al elegir cliente, propone el enlace de su última clase (muchos usan siempre la misma sala)
  const pick = (e) => {
    const pid = e.target.value;
    const prev = !c && !f.url && [...liveClasses].filter((x) => x.player_id === pid).sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
    setF({ ...f, player: pid, url: prev ? prev.meet_url : f.url });
  };
  const url = cleanUrl(f.url);
  const urlOk = validUrl(url);

  const save = (e) => {
    e.preventDefault();
    if (!urlOk) return toast('Pega el enlace completo de la videollamada (empieza por https://).', { error: true });
    act(async () => {
      const base = { player_id: f.player, duration_min: Number(f.dur), meet_url: url, note: f.note.trim() || null };
      if (!c) {
        const weeks = Number(f.weeks);
        const series_id = weeks > 1 ? newId() : null;
        const rows = weeklyDates(f.date, weeks).map((dt) => ({ coach_id: uid, ...base, starts_at: at(dt, f.time), series_id }));
        await q(supabase.from('live_classes').insert(rows));
        await load('liveClasses');
        onClose();
        return toast(weeks > 1 ? `${weeks} clases creadas, una cada semana hasta el ${fmtDate(weeklyDates(f.date, weeks).pop())}.` : 'Clase creada. Tu cliente ya la ve en su app.');
      }
      if (f.scope === 'all' && following.length > 1) {
        // Cambia cliente, hora, duración, enlace y nota en esta y las siguientes; la fecha se desplaza igual en todas
        const shift = new Date(at(f.date, f.time)) - new Date(c.starts_at);
        for (const x of following) {
          await q(supabase.from('live_classes').update({ ...base, starts_at: new Date(new Date(x.starts_at).getTime() + shift).toISOString() }).eq('id', x.id));
        }
      } else {
        await q(supabase.from('live_classes').update({ ...base, starts_at: at(f.date, f.time) }).eq('id', c.id));
      }
      await load('liveClasses');
      onClose();
      toast(f.scope === 'all' && following.length > 1 ? `${following.length} clases actualizadas.` : 'Clase actualizada.');
    });
  };
  const del = () => act(async () => {
    const gone = f.scope === 'all' && following.length > 1 ? following : [c];
    await q(supabase.from('live_classes').delete().in('id', gone.map((x) => x.id)));
    await load('liveClasses');
    onClose();
    toast(gone.length > 1 ? `${gone.length} clases eliminadas.` : 'Clase eliminada.', {
      undo: () => act(async () => { await q(supabase.from('live_classes').insert(gone.map(({ created_at, ...x }) => x))); await load('liveClasses'); }),
    });
  });

  return (
    <form className="panel stack" onSubmit={save} aria-label={c ? 'Editar clase' : 'Nueva clase'}>
      <h3>{c ? 'Editar clase en directo' : 'Nueva clase en directo'}</h3>
      <div className="grid2">
        <label className="f">Cliente
          <select id="lc-player" required value={f.player} onChange={pick}>
            <option value="">Elige cliente</option>
            {players.filter((p) => !p.end_date || p.id === f.player).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="f">Enlace de la videollamada
          <input id="lc-url" inputMode="url" required placeholder="https://meet.google.com/abc-defg-hij" value={f.url} onChange={set('url')} />
          {f.url && !urlOk && <span className="small" style={{ color: 'var(--bad)' }}>Pega el enlace completo, empieza por https://</span>}
          {urlOk && !isMeet(url) && <span className="muted small">No es de Google Meet, pero sirve cualquier enlace de videollamada.</span>}
        </label>
      </div>
      <div className="row">
        <label className="f" style={{ width: 'auto' }}>Día<input id="lc-date" type="date" required value={f.date} onChange={set('date')} /></label>
        <label className="f" style={{ width: 'auto' }}>Hora<input id="lc-time" type="time" required value={f.time} onChange={set('time')} /></label>
        <label className="f" style={{ width: 'auto' }}>Duración<select id="lc-dur" value={f.dur} onChange={set('dur')}>{[...new Set([...DURATIONS, Number(f.dur)])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m} min</option>)}</select></label>
        {!c && <label className="f" style={{ width: 'auto' }}>Repetir<select id="lc-repeat" value={f.weeks} onChange={set('weeks')}>{REPEAT.map(([n, l]) => <option key={n} value={n}>{l}</option>)}</select></label>}
      </div>
      <label className="f">Nota para el cliente (opcional)<input id="lc-note" maxLength={500} placeholder="Ej. Ten a mano la esterilla y una banda" value={f.note} onChange={set('note')} /></label>
      {c && following.length > 1 && (
        <fieldset className="row small" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>Se repite cada semana:</span>
          <label className="row"><input type="radio" name="lc-scope" checked={f.scope === 'one'} onChange={() => setF({ ...f, scope: 'one' })} style={{ width: 'auto' }} /> Solo esta clase</label>
          <label className="row"><input type="radio" name="lc-scope" checked={f.scope === 'all'} onChange={() => setF({ ...f, scope: 'all' })} style={{ width: 'auto' }} /> Esta y las {following.length - 1} siguientes</label>
        </fieldset>
      )}
      <div className="row">
        <button className="btn pri" type="submit">{c ? 'Guardar cambios' : 'Crear clase'}</button>
        <button type="button" className="btn" onClick={onClose}>Cancelar</button>
        {c && (f.sure
          ? <span className="row small">{f.scope === 'all' && following.length > 1 ? `¿Eliminar esta y las ${following.length - 1} siguientes?` : '¿Eliminar esta clase?'}<button type="button" className="btn sm danger" onClick={del}>Sí, eliminar</button><button type="button" className="btn sm" onClick={() => setF({ ...f, sure: false })}>No</button></span>
          : <button type="button" className="btn ghost danger" onClick={() => setF({ ...f, sure: true })}>Eliminar</button>)}
      </div>
      {!c && <p className="muted small">Consejo: crea en Google Calendar un evento con Meet que se repita y usa siempre ese enlace; así es la misma sala todas las semanas.</p>}
    </form>
  );
}
