// Reglas del negocio compartidas: planes, compromiso, revisiones, tests, lesiones y avisos de la programación
import { iso, parseISO, addDays, daysBetween, norm } from './util.js';

// Ejemplo de escalera de precios (no se muestra: cada entrenador crea los suyos en la base de datos)
export const DEFAULT_PLANS = [
  { name: 'Programa pretemporada', fee: 39, type: 'unico', commitment: null, review: null, color: 't-a', tag: 'Sin seguimiento',
    pitch: 'Para entrenar por tu cuenta con un plan serio.',
    features: ['8 semanas de fuerza, velocidad y resistencia', 'Vídeo de cada ejercicio', 'Tests de inicio y final para comprobar el progreso'] },
  { name: 'Coaching rugby', fee: 89, type: 'mensual', commitment: 3, review: 14, color: 't-g', tag: 'El más elegido',
    pitch: 'Plan personalizado y seguimiento para rendir en el campo.',
    features: ['Valoración y tests iniciales', 'Plan adaptado a su posición y calendario del club', 'Ajuste de cargas cada dos semanas', 'WhatsApp para dudas', 'Re-test al final de cada bloque'] },
  { name: 'Readaptación', fee: 149, type: 'mensual', commitment: 3, review: 7, color: 't-r', tag: 'Plazas limitadas',
    pitch: 'Vuelta al juego tras lesión, por fases y con criterios.',
    features: ['Todo lo del coaching rugby', 'Revisión semanal', 'Criterios objetivos para volver al contacto', 'Coordinación con su fisio o médico si hace falta'] },
];
// Planes vigentes del entrenador (vacío hasta que crea los suyos)
export let PLANS = [];
export const fromRow = (r) => ({
  id: r.id, name: r.name, fee: Number(r.fee), type: r.fee_type, commitment: r.commitment_months || null, review: r.review_days || null,
  pitch: r.pitch || '', features: r.features || [], tag: r.tag || '', color: r.color || 't-g', offer: !!r.is_offer,
  oldFee: r.old_fee != null ? Number(r.old_fee) : null, until: r.valid_until || null, active: r.active !== false, sort: r.sort || 0,
});
export const isLive = (p) => p.active !== false && (!p.until || p.until >= iso());
export const setPlans = (rows) => { PLANS = rows?.length ? rows.map(fromRow).filter(isLive).sort((a, b) => a.sort - b.sort || a.fee - b.fee) : []; return PLANS; };
const NO_PLAN = { name: '', fee: null, type: 'mensual', commitment: null, review: null };
export const defaultPlan = () => PLANS.find((p) => !p.offer) || PLANS[0] || NO_PLAN;
export const PLAN_COLORS = [['t-g', 'Verde'], ['t-r', 'Rojo'], ['t-a', 'Amarillo'], ['t-o', 'Naranja'], ['t-p', 'Morado'], ['t-b', 'Azul'], ['t-t', 'Turquesa'], ['t-s', 'Gris']];
export const FEE_TYPES = [['mensual', 'Al mes'], ['trimestral', 'Al trimestre'], ['unico', 'Pago único']];
export const feeSuffix = (t) => (t === 'unico' ? ' pago único' : t === 'trimestral' ? '/trimestre' : '/mes');
export const feeLabel = (p) => `${money(p.fee)}${feeSuffix(p.type)}`;
// Lo que aporta al mes (el trimestral se reparte en 3; el pago único no es cuota)
export const monthlyValue = (fee, type) => (fee == null ? 0 : type === 'unico' ? 0 : type === 'trimestral' ? Number(fee) / 3 : Number(fee));
const MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const mIdx = (key) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - 1;
const mKey = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
// Qué cubre el pago de un mes: mensual ese mes; trimestral el trimestre desde el mes de alta; único, cualquier pago
export function payCover(p, payments = [], mk) {
  const mine = payments.filter((x) => x.player_id === p.id);
  if (p.fee_type === 'unico') { const r = mine[0] || null; return { row: r, paid: !!r, period: 'el pago único', months: [mk] }; }
  if (p.fee_type === 'trimestral' && p.start_date) {
    const s = mIdx(p.start_date.slice(0, 7)); const q = Math.floor((mIdx(mk) - s) / 3); const a = s + q * 3;
    const months = [a, a + 1, a + 2].map(mKey);
    const r = mine.find((x) => months.includes(x.month)) || null;
    const name = (i) => MS[i % 12];
    return { row: r, paid: !!r, period: `${name(a)}–${name(a + 2)}`, long: `${MONTH_NAMES[a % 12]} a ${MONTH_NAMES[(a + 2) % 12]}`, months, start: mKey(a) };
  }
  const r = mine.find((x) => x.month === mk) || null;
  return { row: r, paid: !!r, period: MONTH_NAMES[Number(mk.slice(5, 7)) - 1], months: [mk] };
}

// Datos que cambian al pasar a un cliente a un plan
export const planPatch = (plan, p = {}) => {
  const d = PLANS.find((x) => x.name === plan);
  if (!d) return { plan };
  const patch = { plan, fee: d.fee, fee_type: d.type, commitment_months: d.commitment, review_days: d.review || p.review_days || 14 };
  if (d.review && !p.next_review) patch.next_review = iso(addDays(new Date(), d.review));
  return patch;
};
export const LEGACY_PLANS = ['Online', 'Online + revisiones', 'Presencial'];
export const planOptions = (current) => [...new Set([...PLANS.map((p) => p.name), current].filter(Boolean))];
export const planDefaults = (name) => PLANS.find((p) => p.name === name) || null;

export const money = (n) => (n == null || n === '' ? '—' : `${Number(n).toLocaleString('es-ES', { maximumFractionDigits: 2 })} €`);
export const feeText = (p) => (p.fee == null ? '—' : `${money(p.fee)}${p.fee_type === 'unico' ? ' único' : p.fee_type === 'trimestral' ? '/trimestre' : '/mes'}`);

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
  ['Salto horizontal', 'cm', 'mas', false], ['Illinois', 's', 'menos', false], ['30-15 IFT', 'km/h', 'mas', false],
];
// Cualidad, ejemplo de cómo apuntarlo y rango habitual (para avisar de errores al teclear, p. ej. mm en vez de cm)
export const TEST_INFO = {
  'CMJ': ['Salto', 'Ej. 38,5 → mejor de 3 intentos, en cm', [10, 80]],
  'Salto a una pierna': ['Salto', 'Ej. 22 → cm de cada pierna', [3, 50]],
  'Salto horizontal': ['Salto', 'Ej. 235 → cm desde la línea al talón', [100, 350]],
  'Sprint 10 m': ['Velocidad', 'Ej. 1,82 → segundos con 2 decimales', [1.4, 3]],
  'Sprint 30 m': ['Velocidad', 'Ej. 4,35 → segundos con 2 decimales', [3.5, 7]],
  '505 cambio de dirección': ['Agilidad', 'Ej. 2,35 → segundos de cada lado', [1.8, 4]],
  'Illinois': ['Agilidad', 'Ej. 16,2 → segundos', [13, 25]],
  'Yo-Yo IR1': ['Resistencia', 'Ej. 1520 → metros totales recorridos', [80, 3600]],
  'Bronco': ['Resistencia', 'Ej. 5:10 (min:seg) o 310 (segundos)', [200, 480]],
  '30-15 IFT': ['Resistencia', 'Ej. 19,5 → km/h de la última etapa completada', [12, 25]],
  '1RM sentadilla': ['Fuerza', 'Ej. 120 → kg, real o estimado', [20, 350]],
  '1RM press banca': ['Fuerza', 'Ej. 90 → kg, real o estimado', [15, 250]],
  '1RM peso muerto hexagonal': ['Fuerza', 'Ej. 150 → kg, real o estimado', [20, 400]],
  'Dominadas máximas': ['Fuerza', 'Ej. 12 → repeticiones completas', [0, 60]],
  'Nordic isquios': ['Fuerza', 'Ej. 320 → N de cada pierna', [50, 800]],
  'Aductores (squeeze)': ['Fuerza', 'Ej. 350 → N, rodillas a 45°', [50, 800]],
  'Rotación interna hombro': ['Movilidad', 'Ej. 55 → grados con goniómetro, cada lado', [0, 120]],
  'Rotación externa hombro': ['Movilidad', 'Ej. 95 → grados con goniómetro, cada lado', [20, 160]],
  'Peso corporal': ['Composición', 'Ej. 82,4 → kg, en ayunas', [30, 180]],
};
export const TEST_CATS = ['Resistencia', 'Salto', 'Fuerza', 'Agilidad', 'Velocidad', 'Movilidad', 'Composición'];
export const UNITS = [['cm', 'cm'], ['m', 'm'], ['s', 's (segundos)'], ['kg', 'kg'], ['reps', 'repeticiones'], ['N', 'N (newtons)'], ['°', '° (grados)'], ['km/h', 'km/h'], ['ml/kg/min', 'ml/kg/min'], ['%', '%'], ['W', 'W (vatios)'], ['m/s', 'm/s']];
const UNIT_HINT = { cm: 'Ej. 35,5', m: 'Ej. 1520', s: 'Ej. 1,85 o 5:10 (min:seg)', kg: 'Ej. 82,5', reps: 'Ej. 12', N: 'Ej. 320', '°': 'Ej. 55', 'km/h': 'Ej. 19,5', 'ml/kg/min': 'Ej. 52,3', '%': 'Ej. 12,5', W: 'Ej. 850', 'm/s': 'Ej. 0,85' };
export const testHint = (name, unit) => TEST_INFO[name]?.[1] || UNIT_HINT[unit] || 'Número con coma para los decimales';
// «1,85» → 1.85 · «5:10» → 310 (min:seg) · vacío → null
export const parseTestValue = (v) => {
  const t = String(v ?? '').trim();
  if (!t) return null;
  const m = t.match(/^(\d+):(\d{1,2}(?:[.,]\d+)?)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2].replace(',', '.'));
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};
// Aviso si el valor se sale de lo habitual para ese test
export const testWarn = (name, unit, value) => {
  const r = TEST_INFO[name]?.[2]; const pr = presetOf(name);
  if (!r || value == null || Number.isNaN(value) || (pr && unit && pr[1] !== unit)) return null;
  return value < r[0] || value > r[1] ? `Revisa el valor: en ${name} lo habitual es entre ${String(r[0]).replace('.', ',')} y ${String(r[1]).replace('.', ',')} ${pr?.[1] || ''}.` : null;
};
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
// Devuelve las restricciones del cliente que chocan con un ejercicio
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
