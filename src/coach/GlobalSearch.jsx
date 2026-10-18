import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { matches } from '../lib/util.js';

// Buscador global: jugadores, programas, ejercicios y solicitudes. Ctrl+K (o ⌘K) para abrirlo.
export default function GlobalSearch() {
  const { players, programs, exercises, leads = [], go } = useCoach();
  const [qy, setQy] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const on = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus(); ref.current?.select(); setOpen(true); } };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const results = useMemo(() => {
    if (qy.trim().length < 2) return [];
    const pname = (id) => players.find((p) => p.id === id)?.name || '';
    const out = [];
    players.filter((p) => matches(`${p.name} ${p.position || ''} ${p.plan || ''} ${p.email}`, qy)).slice(0, 6)
      .forEach((p) => out.push({ grp: 'Jugadores', key: 'p' + p.id, label: p.name, sub: [p.position, p.plan, p.end_date ? 'de baja' : ''].filter(Boolean).join(' · '), go: () => go('clientes', p.id) }));
    programs.filter((p) => matches(`${p.name} ${pname(p.player_id)}`, qy)).slice(0, 6)
      .forEach((p) => out.push({ grp: p.player_id ? 'Programas de jugadores' : 'Plantillas', key: 'g' + p.id, label: p.player_id ? `${pname(p.player_id)} · ${p.name}` : p.name, sub: '', go: () => go('programacion', p.id) }));
    leads.filter((l) => matches(`${l.name} ${l.phone || ''} ${l.email || ''}`, qy)).slice(0, 4)
      .forEach((l) => out.push({ grp: 'Solicitudes', key: 'l' + l.id, label: l.name, sub: l.status, go: () => go('solicitudes', l.id) }));
    exercises.filter((e) => matches(`${e.name} ${e.primary_muscle || ''} ${e.type || ''}`, qy)).slice(0, 8)
      .forEach((e) => out.push({ grp: 'Ejercicios', key: 'e' + e.id, label: e.name, sub: [e.type, e.primary_muscle].filter(Boolean).join(' · '), go: () => go('biblioteca', 'q=' + encodeURIComponent(e.name)) }));
    return out;
  }, [qy, players, programs, exercises, leads, go]);

  const pick = (r) => { r.go(); setQy(''); setOpen(false); ref.current?.blur(); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(results.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter' && results[hi]) { e.preventDefault(); pick(results[hi]); }
    else if (e.key === 'Escape') { setOpen(false); ref.current?.blur(); }
  };
  let last = '';
  return (
    <div className="gsearch">
      <input ref={ref} id="gsearch" type="search" role="combobox" aria-expanded={open && results.length > 0} aria-controls="gs-list" aria-label="Buscar jugador, programa o ejercicio"
        placeholder="Buscar jugador, ejercicio, plantilla… (Ctrl+K)" value={qy}
        onChange={(e) => { setQy(e.target.value); setOpen(true); setHi(0); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={onKey} />
      {open && qy.trim().length >= 2 && (
        <ul className="gslist" id="gs-list" role="listbox">
          {results.length ? results.map((r, i) => {
            const head = r.grp !== last; last = r.grp;
            return (
              <React.Fragment key={r.key}>
                {head && <li className="grp" role="presentation">{r.grp}</li>}
                <li className="opt" role="option" aria-selected={i === hi} onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); pick(r); }}>
                  <span>{r.label}</span><small>{r.sub}</small>
                </li>
              </React.Fragment>
            );
          }) : <li className="grp" role="presentation">Sin resultados</li>}
        </ul>
      )}
    </div>
  );
}
