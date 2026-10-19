// Radar de tests: cada test se pasa a una puntuación 0-10 para poder compararlos en el mismo gráfico.
import { testValue } from './domain.js';

// Escala de referencia [valor = 0, valor = 10, cualidad] para adulto de deporte de equipo (amateur a semiprofesional).
// Valores orientativos a partir de datos publicados en rugby y fútbol; el entrenador ve siempre el valor real al lado.
export const NORMS = {
  'Bronco': [330, 255, 'Resistencia'],            // s · rugby: delanteros ~300 s, tres cuartos ~280 s
  'Yo-Yo IR1': [400, 2400, 'Resistencia'],        // m
  '30-15 IFT': [15, 21.5, 'Resistencia'],         // km/h (Buchheit)
  'CMJ': [20, 55, 'Salto'],                       // cm
  'Salto a una pierna': [8, 30, 'Salto'],         // cm
  'Salto horizontal': [170, 280, 'Salto'],        // cm
  'Sprint 10 m': [2.1, 1.6, 'Velocidad'],         // s
  'Sprint 30 m': [5.0, 3.9, 'Velocidad'],         // s
  '505 cambio de dirección': [2.8, 2.1, 'Agilidad'], // s
  'Illinois': [19, 14.5, 'Agilidad'],             // s
  'Dominadas máximas': [0, 20, 'Fuerza'],         // reps
  'Nordic isquios': [200, 450, 'Fuerza'],         // N por pierna (Opar 2015: <256 N más riesgo)
  'Aductores (squeeze)': [200, 500, 'Fuerza'],    // N
  'Rotación interna hombro': [30, 70, 'Movilidad'],
  'Rotación externa hombro': [70, 120, 'Movilidad'],
};
// Fuerza relativa: 1RM ÷ peso corporal (la referencia en deportes de contacto)
export const RELATIVE = [
  ['Sentadilla relativa', '1RM sentadilla', [0.8, 2.2]],
  ['Banca relativa', '1RM press banca', [0.6, 1.6]],
  ['Peso muerto hex. relativo', '1RM peso muerto hexagonal', [1.0, 2.6]],
];
const BW = 'Peso corporal';
const ORDER = ['Resistencia', 'Salto', 'Fuerza', 'Agilidad', 'Velocidad', 'Movilidad'];

const sorted = (rows) => [...rows].sort((a, b) => a.date.localeCompare(b.date) || (a.created_at || '').localeCompare(b.created_at || ''));

// Valor de un test en una fecha: último registro hasta esa fecha; si no hay, el primero que exista (valoraciones en varios días)
function valueAt(rows, name, date) {
  const list = sorted(rows.filter((t) => t.test === name && testValue(t) != null));
  if (!list.length) return null;
  const upto = list.filter((t) => t.date <= date);
  const t = upto.length ? upto[upto.length - 1] : list[0];
  return { v: testValue(t), date: t.date, unit: t.unit, better: t.better || 'mas' };
}

// Tests disponibles para el radar (con datos), incluida la fuerza relativa si hay 1RM y peso
export function radarAxes(rows) {
  const names = [...new Set(rows.filter((t) => testValue(t) != null).map((t) => t.test))].filter((n) => n !== BW);
  const out = names.map((n) => ({ key: n, label: n, cat: NORMS[n]?.[2] || 'Otros' }));
  if (rows.some((t) => t.test === BW)) {
    RELATIVE.forEach(([label, src]) => { if (names.includes(src)) out.push({ key: label, label, cat: 'Fuerza', rel: src }); });
  }
  return out;
}

// Los 5 por defecto: uno de cada cualidad (resistencia, salto, fuerza relativa, agilidad, velocidad) y se rellena con el resto
export function defaultAxes(axes) {
  const pick = [];
  ORDER.forEach((c) => {
    const inCat = axes.filter((a) => a.cat === c && !pick.includes(a.key));
    const best = inCat.find((a) => a.rel) || inCat.find((a) => NORMS[a.key]) || inCat[0];
    if (best && pick.length < 5) pick.push(best.key);
  });
  axes.forEach((a) => { if (pick.length < 5 && !pick.includes(a.key)) pick.push(a.key); });
  return pick;
}

export const radarDates = (rows) => [...new Set(rows.filter((t) => t.test !== BW).map((t) => t.date))].sort();

// Punto de un eje en una fecha: valor real, unidad y puntuación 0-10
export function axisPoint(rows, axis, date) {
  if (axis.rel) {
    const rm = valueAt(rows, axis.rel, date); const bw = valueAt(rows, BW, date);
    if (!rm || !bw || !bw.v) return null;
    const v = rm.v / bw.v; const [lo, hi] = RELATIVE.find((r) => r[0] === axis.key)[2];
    return { v, unit: '× peso', score: clamp(((v - lo) / (hi - lo)) * 10), scale: 'ref' };
  }
  const p = valueAt(rows, axis.key, date);
  if (!p) return null;
  const n = NORMS[axis.key];
  if (n) return { v: p.v, unit: p.unit, score: clamp(((p.v - n[0]) / (n[1] - n[0])) * 10), scale: 'ref' };
  // Sin referencia: su propia escala (peor marca = 0, mejor = 10)
  const vals = rows.filter((t) => t.test === axis.key).map(testValue).filter((x) => x != null);
  const lo = Math.min(...vals); const hi = Math.max(...vals);
  if (hi === lo) return { v: p.v, unit: p.unit, score: 5, scale: 'own' };
  const s = ((p.v - lo) / (hi - lo)) * 10;
  return { v: p.v, unit: p.unit, score: clamp(p.better === 'menos' ? 10 - s : s), scale: 'own' };
}
const clamp = (x) => Math.max(0, Math.min(10, x));
