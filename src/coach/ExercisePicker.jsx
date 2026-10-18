import React, { useMemo, useRef, useState } from 'react';
import { norm } from '../lib/util.js';

// Buscador de ejercicios con desplegable propio (funciona igual en Safari, Chrome y móvil).
// Busca sin tildes, por nombre, músculo o tipo; teclado: ↑ ↓ Enter Esc.
export default function ExercisePicker({ value, onChange, exercises, onCreate, className, ariaLabel = 'Ejercicio' }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [qy, setQy] = useState(null); // texto mientras se escribe
  const ref = useRef(null);
  const text = qy ?? value ?? '';

  const results = useMemo(() => {
    const words = norm(text).trim().split(/\s+/).filter(Boolean);
    const scored = exercises
      .map((e) => {
        const hay = norm(`${e.name} ${e.primary_muscle || ''} ${(e.secondary || []).join(' ')} ${e.type}`);
        if (!words.every((w) => hay.includes(w))) return null;
        const n = norm(e.name);
        const score = n.startsWith(words[0] || '') ? 0 : n.includes(words[0] || '') ? 1 : 2;
        return { e, score };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score || a.e.name.localeCompare(b.e.name, 'es'));
    return scored.slice(0, 40).map((x) => x.e);
  }, [text, exercises]);

  const exact = exercises.some((e) => norm(e.name) === norm(text.trim()));
  const canCreate = onCreate && text.trim().length > 2 && !exact;
  const total = results.length + (canCreate ? 1 : 0);

  const pick = (name) => { onChange(name); setQy(null); setOpen(false); };
  const choose = (i) => {
    if (i < results.length) pick(results[i].name);
    else if (canCreate) { onCreate(text.trim()); pick(text.trim()); }
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(total - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { if (open && total) { e.preventDefault(); choose(active); } }
    else if (e.key === 'Escape') { setOpen(false); setQy(null); }
  };

  const hl = (name) => {
    const w = norm(text).trim().split(/\s+/)[0];
    const i = w ? norm(name).indexOf(w) : -1;
    if (i < 0) return name;
    return <>{name.slice(0, i)}<mark>{name.slice(i, i + w.length)}</mark>{name.slice(i + w.length)}</>;
  };

  return (
    <div className={'picker ' + (className || '')} ref={ref}>
      <input
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder="Escribe para buscar…"
        value={text}
        onFocus={() => { setOpen(true); setActive(0); }}
        onChange={(e) => { setQy(e.target.value); setOpen(true); setActive(0); }}
        onBlur={() => setTimeout(() => {
          setOpen(false);
          if (qy != null && qy !== value) onChange(qy); // texto libre también vale
          setQy(null);
        }, 150)}
        onKeyDown={onKey}
        style={value && !exercises.some((e) => e.name === value) ? { borderColor: 'var(--warn)' } : undefined}
        title={value && !exercises.some((e) => e.name === value) ? 'No está en tu biblioteca' : ''}
      />
      {open && total > 0 && (
        <ul className="picklist" role="listbox">
          {results.map((e, i) => (
            <li key={e.id} role="option" aria-selected={i === active} className={i === active ? 'on' : ''}
              onMouseDown={(ev) => { ev.preventDefault(); choose(i); }} onMouseEnter={() => setActive(i)}>
              <span>{hl(e.name)}</span><small>{e.primary_muscle || ''} · {e.type}</small>
            </li>
          ))}
          {canCreate && (
            <li role="option" aria-selected={active === results.length} className={'create' + (active === results.length ? ' on' : '')}
              onMouseDown={(ev) => { ev.preventDefault(); choose(results.length); }} onMouseEnter={() => setActive(results.length)}>
              + Añadir «{text.trim()}» a la biblioteca
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
