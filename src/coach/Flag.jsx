import React, { useEffect, useRef, useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { flagLabel } from '../lib/domain.js';

// Lo importante de un cliente: aviso fijo, restricciones, restricciones marcadas y notas importantes abiertas
export const importantOf = (p, notes = []) => [
  p.important,
  p.restrictions ? `Restricciones: ${p.restrictions}` : null,
  ...(p.flags || []).map(flagLabel),
  ...notes.filter((n) => n.player_id === p.id && n.kind === 'importante' && !n.done).map((n) => n.text),
].filter(Boolean);

// Botón «!» que despliega lo importante del cliente
export default function Flag({ p, sm }) {
  const { notes } = useCoach();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const items = importantOf(p, notes);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  if (!items.length) return null;
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" className={'flag' + (sm ? ' sm' : '')} aria-expanded={open} aria-label={`Importante de ${p.name}`} title="Importante"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>!</button>
      {open && (
        <div className="flagpop" role="dialog" onClick={(e) => e.stopPropagation()}>
          <b>Importante · {p.name}</b>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
    </span>
  );
}
