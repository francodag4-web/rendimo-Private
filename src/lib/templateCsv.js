// Plantillas de programa en CSV (Excel): una fila por ejercicio
import { uid, norm, DAYS } from './util.js';

export const COLS = ['plantilla', 'fase', 'objetivos_fase', 'semana', 'nombre_semana', 'dia', 'sesion', 'bloque', 'tipo_bloque', 'vueltas', 'notas_bloque', 'ejercicio', 'series', 'reps', 'carga', 'descanso', 'notas'];

const esc = (v) => { const s = v == null ? '' : String(v); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
// Separador «;» para que Excel en español lo abra en columnas
export const toCSV = (rows) => '﻿' + [COLS.join(';'), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(';'))].join('\r\n');

export function programToRows(name, data) {
  const rows = [];
  (data?.phases || []).forEach((ph) => (ph.weeks || []).forEach((w, wi) => (w.sessions || []).forEach((s) => (s.packs || []).forEach((p, k) => {
    const items = p.items?.length ? p.items : [{}];
    items.forEach((it, j) => rows.push({
      plantilla: name, fase: ph.name, objetivos_fase: wi === 0 && !rows.some((r) => r.fase === ph.name) ? ph.notes || '' : '',
      semana: wi + 1, nombre_semana: w.name || '', dia: s.day, sesion: s.name || '', bloque: String.fromCharCode(65 + k), tipo_bloque: p.type,
      vueltas: j === 0 ? p.rounds || '' : '', notas_bloque: j === 0 ? p.notes || '' : '', ejercicio: it.exercise || '', series: it.sets || '', reps: it.reps || '',
      carga: it.load || '', descanso: it.rest || '', notas: it.notes || '',
    }));
  }))));
  return rows;
}

const dayOf = (v) => {
  const n = Number(v); if (n >= 1 && n <= 7) return n;
  const t = norm(v || '');
  const i = DAYS.findIndex((d) => norm(d) === t || norm(d).slice(0, 3) === t.slice(0, 3) || norm(d)[0] === t);
  return i >= 0 ? i + 1 : 1;
};
// Admite cabeceras con o sin tildes y en mayúsculas
const pick = (r, k) => { for (const [h, v] of Object.entries(r)) if (norm(h).replace(/\s+/g, '_') === k) return v; return ''; };

export function rowsToPrograms(rows, fallbackName = 'Plantilla importada') {
  const progs = new Map();
  for (const raw of rows) {
    const r = Object.fromEntries(COLS.map((c) => [c, (pick(raw, c) || '').trim()]));
    if (!r.ejercicio && !r.sesion && !r.fase) continue;
    const name = r.plantilla || fallbackName;
    if (!progs.has(name)) progs.set(name, { name, phases: new Map() });
    const P = progs.get(name);
    const fk = r.fase || 'Fase 1';
    if (!P.phases.has(fk)) P.phases.set(fk, { id: uid(), name: fk, notes: '', weeks: new Map() });
    const ph = P.phases.get(fk);
    if (r.objetivos_fase && !ph.notes) ph.notes = r.objetivos_fase;
    const wk = Number(r.semana) || 1;
    if (!ph.weeks.has(wk)) ph.weeks.set(wk, { id: uid(), name: '', sessions: new Map() });
    const w = ph.weeks.get(wk);
    if (r.nombre_semana && !w.name) w.name = r.nombre_semana;
    const sk = `${dayOf(r.dia)}|${r.sesion}`;
    if (!w.sessions.has(sk)) w.sessions.set(sk, { id: uid(), day: dayOf(r.dia), name: r.sesion, packs: new Map() });
    const s = w.sessions.get(sk);
    const bk = r.bloque || r.tipo_bloque || 'A';
    if (!s.packs.has(bk)) s.packs.set(bk, { id: uid(), type: r.tipo_bloque || 'Fuerza', rounds: r.vueltas, notes: r.notas_bloque, items: [] });
    const p = s.packs.get(bk);
    if (r.vueltas && !p.rounds) p.rounds = r.vueltas;
    if (r.notas_bloque && !p.notes) p.notes = r.notas_bloque;
    if (r.ejercicio) p.items.push({ id: uid(), exercise: r.ejercicio, sets: r.series, reps: r.reps, load: r.carga, rest: r.descanso, notes: r.notas });
  }
  return [...progs.values()].map((P) => ({
    name: P.name,
    data: { phases: [...P.phases.values()].map((ph) => ({ ...ph, weeks: [...ph.weeks.entries()].sort((a, b) => a[0] - b[0]).map(([, w]) => ({ ...w, sessions: [...w.sessions.values()].map((s) => ({ ...s, packs: [...s.packs.values()] })) })) })) },
  }));
}

export const EXAMPLE_ROWS = [
  { plantilla: 'Mi plantilla', fase: 'Fase 1 · Base', objetivos_fase: 'Objetivos y criterios para pasar de fase', semana: 1, nombre_semana: '', dia: 'Lunes', sesion: 'Fuerza A', bloque: 'A', tipo_bloque: 'Fuerza', vueltas: '', notas_bloque: 'RIR 2', ejercicio: 'Goblet squat', series: 4, reps: 8, carga: 'RIR 2', descanso: '90 s', notas: '' },
  { plantilla: 'Mi plantilla', fase: 'Fase 1 · Base', objetivos_fase: '', semana: 1, nombre_semana: '', dia: 'Lunes', sesion: 'Fuerza A', bloque: 'A', tipo_bloque: 'Fuerza', vueltas: '', notas_bloque: '', ejercicio: 'Peso muerto rumano', series: 3, reps: 8, carga: '', descanso: '2 min', notas: '' },
  { plantilla: 'Mi plantilla', fase: 'Fase 1 · Base', objetivos_fase: '', semana: 1, nombre_semana: '', dia: 'Jueves', sesion: 'Fuerza B', bloque: 'A', tipo_bloque: 'Core', vueltas: 3, notas_bloque: 'Circuito', ejercicio: 'Plancha', series: 1, reps: '30 s', carga: '', descanso: '30 s', notas: '' },
];

export const downloadText = (filename, text, type = 'text/csv;charset=utf-8') => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};
