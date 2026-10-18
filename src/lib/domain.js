// Reglas del negocio compartidas: planes, compromiso, revisiones, tests, lesiones y avisos de la programación
import { iso, parseISO, addDays, daysBetween, norm } from './util.js';

// Escalera de precios acordada (se puede cambiar el importe de cada jugador)
export const PLANS = [
  { name: 'Coaching rugby', fee: 89, type: 'mensual' },
  { name: 'Readaptación', fee: 149, type: 'mensual' },
  { name: 'Programa pretemporada', fee: 39, type: 'unico' },
];
export const LEGACY_PLANS = ['Online', 'Online + revisiones', 'Presencial'];
export const planOptions = (current) => [...new Set([...PLANS.map((p) => p.name), ...LEGACY_PLANS, current].filter(Boolean))];
export const planDefaults = (name) => PLANS.find((p) => p.name === name) || null;

export const money = (n) => (n == null || n === '' ? '—' : `${Number(n).toLocaleString('es-ES', { maximumFractionDigits: 2 })} €`);
export const feeText = (p) => (p.fee == null ? '—' : `${money(p.fee)}${p.fee_type === 'unico' ? ' único' : '/mes'}`);

export const monthKey = (d = new Date()) => iso(d).slice(0, 7);
export const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const monthName = (key) => MONTH_NAMES[Number(key.slice(5, 7)) - 1];

// Mes del compromiso en el que está (1 = primer mes)
export const commitment = (p, at = new Date()) => {
  const start = parseISO(p.start_date);
  const end = p.end_date ? parseISO(p.end_date) : at;
  const m = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) - (end.getDate() < start.getDate() ? 1 : 0);
  const month = Math.max(1, m + 1);
  const total = Number(p.commitment_months) || 0;
  const ends = total ? iso(addMonths(start, total)) : null;
  return { month, total, ends, text: total ? (month <= total ? `Mes ${month} de ${total}` : `Mes ${month} · compromiso cumplido`) : `Mes ${month}` };
};
export const addMonths = (d, n) => { const x = new Date(d); const day = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + n); x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); return x; };

// Revisión: «Vencida · 2 días», «Hoy», «Mañana», «En 5 días»
export const reviewInfo = (p) => {
  if (!p.next_review) return null;
  const d = daysBetween(new Date(), parseISO(p.next_review));
  if (d < 0) return { d, text: `Vencida · ${-d} día${d === -1 ? '' : 's'}`, level: 'bad' };
  if (d === 0) return { d, text: 'Hoy', level: 'warn' };
  if (d === 1) return { d, text: 'Mañana', level: 'warn' };
  return { d, text: `En ${d} días`, level: 'ok' };
};
export const REVIEW_OPTIONS = [[7, 'Revisión semanal'], [14, 'Revisión quincenal'], [28, 'Revisión mensual']];

export const SCREENING = [['pendiente', 'Cribado: pendiente', 'warn'], ['apto', 'Cribado: apto', 'ok'], ['restricciones', 'Cribado: apto con restricciones', 'warn'], ['derivar', 'Cribado: derivar a médico', 'bad']];

// Bienestar: semáforo sobre 25 (umbral orientativo, no es un estándar validado)
export const wellLevel = (w) => (w == null ? '' : w <= 10 ? 'bad' : w <= 13 ? 'warn' : 'ok');

// ---------- Tests ----------
// Tests habituales en rugby; «menos» = mejor cuanto más bajo (tiempos)
export const TEST_PRESETS = [
  ['CMJ', 'cm', 'mas', false], ['Sprint 10 m', 's', 'menos', false], ['Sprint 30 m', 's', 'menos', false], ['505 cambio de dirección', 's', 'menos', true],
  ['Yo-Yo IR1', 'm', 'mas', false], ['Bronco', 's', 'menos', false], ['1RM sentadilla', 'kg', 'mas', false], ['1RM press banca', 'kg', 'mas', false],
  ['1RM peso muerto hexagonal', 'kg', 'mas', false], ['Dominadas máximas', 'reps', 'mas', false], ['Rotación interna hombro', '°', 'mas', true],
  ['Rotación externa hombro', '°', 'mas', true], ['Nordic isquios', 'N', 'mas', true], ['Aductores (squeeze)', 'N', 'mas', false],
  ['Salto a una pierna', 'cm', 'mas', true], ['Peso corporal', 'kg', 'mas', false],
];
export const presetOf = (name) => TEST_PRESETS.find((t) => norm(t[0]) === norm(name || ''));
export const fmtNum = (v, d = 2) => (v == null || v === '' ? '—' : Number(v).toLocaleString('es-ES', { maximumFractionDigits: d }));
// Valor de un registro: media de ambos lados si es bilateral
export const testValue = (t) => (t.value_r != null && t.value != null ? (Number(t.value) + Number(t.value_r)) / 2 : t.value != null ? Number(t.value) : t.value_r != null ? Number(t.value_r) : null);
// Asimetría entre lados en %: |izq − der| / mayor × 100 (Bishop et al., 2018)
export const asym = (t) => (t.value != null && t.value_r != null && Math.max(t.value, t.value_r) > 0 ? (Math.abs(t.value - t.value_r) / Math.max(t.value, t.value_r)) * 100 : null);
// Agrupa por test con T0, último y cambio
export const testSummary = (rows) => {
  const by = {};
  [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at)).forEach((t) => (by[t.test] = by[t.test] || []).push(t));
  return Object.entries(by).map(([name, list]) => {
    const first = list[0]; const last = list[list.length - 1];
    const v0 = testValue(first); const v1 = testValue(last);
    const better = last.better || 'mas';
    const change = list.length > 1 && v0 ? ((v1 - v0) / Math.abs(v0)) * 100 : null;
    const improved = change == null ? null : better === 'mas' ? v1 > v0 : v1 < v0;
    return { name, unit: last.unit, better, list, first, last, v0, v1, change, improved };
  });
};
// Nuevas marcas: último registro que supera a todos los anteriores del mismo test
export const isRecord = (t, all) => {
  const prev = all.filter((x) => x.player_id === t.player_id && x.test === t.test && x.id !== t.id && (x.date < t.date || (x.date === t.date && x.created_at < t.created_at)));
  if (!prev.length) return false;
  const v = testValue(t); const vals = prev.map(testValue).filter((x) => x != null);
  if (v == null || !vals.length) return false;
  return (t.better || 'mas') === 'mas' ? v > Math.max(...vals) : v < Math.min(...vals);
};

// ---------- Lesiones ----------
// Gravedad por días de baja (Fuller et al., 2007, consenso de rugby)
export const severity = (days) => {
  if (days == null || days === '') return null;
  const d = Number(days);
  if (d <= 1) return ['Muy leve (0-1 días)', 'ok'];
  if (d <= 3) return ['Mínima (2-3 días)', 'ok'];
  if (d <= 7) return ['Leve (4-7 días)', 'warn'];
  if (d <= 28) return ['Moderada (8-28 días)', 'warn'];
  return ['Grave (más de 28 días)', 'bad'];
};
export const INJ_STATUS = [['activa', 'Activa', 'bad'], ['readaptacion', 'En readaptación', 'warn'], ['recuperada', 'Recuperada', 'ok']];
export const SIDES = [['izq', 'Izquierda'], ['der', 'Derecha'], ['central', 'Central']];
// Zonas del mapa corporal: [clave, nombre, x, y, vista]
export const ZONES = [
  ['cabeza', 'Cabeza / conmoción', 60, 18, 'f'], ['cuello', 'Cuello', 60, 40, 'p'], ['hombro', 'Hombro', 34, 56, 'f'],
  ['brazo', 'Brazo / codo', 26, 92, 'f'], ['muneca', 'Muñeca / mano', 20, 130, 'f'], ['pecho', 'Pecho / costillas', 60, 72, 'f'],
  ['lumbar', 'Lumbar', 60, 112, 'p'], ['cadera', 'Cadera / ingle', 48, 134, 'f'], ['aductor', 'Aductor', 54, 156, 'f'],
  ['isquio', 'Isquiotibial', 46, 172, 'p'], ['cuadriceps', 'Cuádriceps', 46, 170, 'f'], ['rodilla', 'Rodilla', 46, 198, 'f'],
  ['gemelo', 'Gemelo / Aquiles', 46, 228, 'p'], ['tobillo', 'Tobillo / pie', 46, 258, 'f'],
];
export const zoneName = (k) => ZONES.find((z) => z[0] === k)?.[1] || k;

// ---------- Restricciones que chocan con ejercicios ----------
export const FLAGS = [
  ['overhead', 'Sin press por encima de la cabeza', /press militar|press de hombro|press hombro|overhead|por encima de la cabeza|push press|jerk|arrancada|snatch|press arnold|z press|handstand|pino/i],
  ['sprint', 'Sin sprint máximo', /sprint|aceleraci|velocidad m[aá]xima|vuelo|flying/i],
  ['saltos', 'Sin saltos ni pliometría', /salto|jump|bound|drop|pliom|rebote|skipping|hop/i],
  ['axial', 'Sin carga axial (columna)', /sentadilla trasera|back squat|sentadilla con barra|good morning|peso muerto convencional|front squat|sentadilla frontal/i],
  ['contacto', 'Sin contacto', /placaje|contacto|ruck|maul|mel[eé]|scrum|tackle/i],
];
export const flagLabel = (k) => FLAGS.find((f) => f[0] === k)?.[1] || k;
// Devuelve las restricciones del jugador que chocan con un ejercicio
export const clashes = (flags = [], exerciseName = '', ex = null) => {
  const txt = `${exerciseName} ${ex?.type || ''} ${ex?.category || ''}`;
  return FLAGS.filter(([k, , re]) => flags.includes(k) && (re.test(txt) || (k === 'saltos' && /pliometr/i.test(ex?.type || '')) || (k === 'sprint' && /^velocidad$/i.test(ex?.type || ''))));
};

// ---------- Evolución ----------
export const EVO_CATS = [['ajuste', 'Ajuste de plan'], ['valor', 'Valoración'], ['molestia', 'Molestia'], ['test', 'Test'], ['comunicacion', 'Comunicación']];
export const evoLabel = (k) => EVO_CATS.find((c) => c[0] === k)?.[1] || k;

// ---------- Solicitudes ----------
export const LEAD_STAGES = ['Nueva', 'Contactado', 'Videollamada agendada', 'Videollamada hecha'];
export const DISCARD_REASONS = ['Precio', 'No responde', 'No es su momento', 'No encaja con el servicio', 'Prefiere presencial', 'Otro'];
export const ago = (ts) => {
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 60) return `Hace ${Math.max(1, m)} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'Ayer' : `Hace ${d} días`;
};

// Series semanales objetivo por músculo (≈10-20 series: Schoenfeld et al., 2017; Baz-Valle et al., 2022)
export const SET_RANGE = [10, 20];
