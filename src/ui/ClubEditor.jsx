import React, { useState } from 'react';
import { supabase, q } from '../lib/supabase.js';
import { iso, fmtDate, DAYS } from '../lib/util.js';
import { useAction, useToast } from './ui.jsx';
import { matchText } from '../lib/club.js';

// Editor del calendario del club. Lo usan el entrenador (en Programación) y el jugador (en Semana).
export default function ClubEditor({ playerId, club, who = 'coach' }) {
  const act = useAction();
  const toast = useToast();
  const days = club.schedule?.weekdays || [];
  const [time, setTime] = useState(club.schedule?.time || '');
  const [f, setF] = useState({ date: iso(), kind: 'partido', label: '', home: '' });
  if (club.missing) return <p className="muted small">El calendario del club se activa en cuanto se actualice la base de datos.</p>;
  const saveSchedule = (weekdays, t = time) => act(async () => {
    await q(supabase.from('club_schedule').upsert({ player_id: playerId, weekdays: [...weekdays].sort(), time: t || null, updated_at: new Date().toISOString() }));
    await club.reload();
  }, 'Días de club guardados.');
  const toggle = (d) => saveSchedule(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);
  const add = (e) => {
    e.preventDefault();
    act(async () => {
      await q(supabase.from('club_events').insert({ player_id: playerId, date: f.date, kind: f.kind, label: f.label.trim() || null, home: f.kind === 'partido' && f.home !== '' ? f.home === 'casa' : null }));
      setF({ ...f, label: '' });
      await club.reload();
    }, f.kind === 'partido' ? 'Partido añadido.' : 'Cambio añadido.');
  };
  const del = (ev) => act(async () => {
    await q(supabase.from('club_events').delete().eq('id', ev.id));
    await club.reload();
    toast('Eliminado.', { undo: () => act(async () => { const { id, created_at, ...rest } = ev; await q(supabase.from('club_events').insert(rest)); await club.reload(); }) });
  });
  const upcoming = club.events.filter((e) => e.date >= iso());
  const past = club.events.filter((e) => e.date < iso());
  return (
    <div className="stack clubed">
      <div className="stack" style={{ gap: 6 }}>
        <b>{who === 'player' ? 'Días que entrenas con tu club' : 'Días de entreno con el club'}</b>
        <div className="daypick" role="group" aria-label="Días de entreno con el club">
          {DAYS.map((d, i) => <button key={d} type="button" aria-pressed={days.includes(i + 1)} onClick={() => toggle(i + 1)}>{d.slice(0, 3)}</button>)}
        </div>
        <label className="row small">Hora<input aria-label="Hora del entreno del club" style={{ width: 110 }} placeholder="20:30" value={time} onChange={(e) => setTime(e.target.value)} onBlur={() => time !== (club.schedule?.time || '') && saveSchedule(days, time)} /></label>
      </div>
      <form className="stack" style={{ gap: 6 }} onSubmit={add}>
        <b>Partidos de la temporada y cambios</b>
        <div className="row">
          <input aria-label="Fecha" type="date" required style={{ width: 'auto' }} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <select aria-label="Tipo" style={{ width: 'auto' }} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            <option value="partido">Partido</option><option value="sin_entreno">No hay entreno ese día</option><option value="entreno">Entreno extra del club</option>
          </select>
          {f.kind === 'partido' && <>
            <input aria-label="Rival" style={{ flex: '1 1 140px' }} placeholder="Rival (opcional)" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
            <select aria-label="Casa o fuera" style={{ width: 'auto' }} value={f.home} onChange={(e) => setF({ ...f, home: e.target.value })}><option value="">Casa / fuera</option><option value="casa">En casa</option><option value="fuera">Fuera</option></select>
          </>}
          <button className="btn pri sm" type="submit">Añadir</button>
        </div>
      </form>
      {upcoming.length > 0 && (
        <ul className="list">{upcoming.map((e) => (
          <li key={e.id}><span><b>{fmtDate(e.date)}</b> · {e.kind === 'partido' ? matchText(e) : e.kind === 'sin_entreno' ? 'No hay entreno' : 'Entreno extra'}</span>
            <button type="button" className="ib" aria-label={`Eliminar ${fmtDate(e.date)}`} onClick={() => del(e)}>✕</button></li>
        ))}</ul>
      )}
      {past.length > 0 && <p className="muted small">{past.filter((e) => e.kind === 'partido').length} partidos ya jugados.</p>}
    </div>
  );
}
