// Cálculos del informe de progreso: composición corporal, objetivos, bloques de 4 semanas, carga y adherencia
import { testValue } from './domain.js';
import { wellness, parseISO, iso, addDays } from './util.js';
import { sessionDate, totalWeeks } from './program.js';

// ---------- Composición corporal ----------
// Jackson & Pollock (1978, 1980) de 7 o 3 pliegues → densidad → % grasa con Siri (1961)
export const SKINFOLDS = [
  ['sf_chest', 'Pectoral'], ['sf_abdomen', 'Abdominal'], ['sf_thigh', 'Muslo'], ['sf_triceps', 'Tríceps'],
  ['sf_suprailiac', 'Suprailíaco'], ['sf_subscapular', 'Subescapular'], ['sf_midaxillary', 'Axilar medio'],
];
export const PERIMETERS = [['arm', 'Brazo (contraído)'], ['chest', 'Pecho'], ['waist', 'Cintura'], ['hip', 'Cadera'], ['thigh', 'Muslo'], ['calf', 'Gemelo']];
export const ageAt = (birth, date) => {
  if (!birth) return null;
  const b = parseISO(birth); const d = parseISO(date);
  let a = d.getFullYear() - b.getFullYear();
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a -= 1;
  return a;
};
const n = (v) => (v == null || v === '' ? null : Number(v));
export function bodyFat(m, sex, age) {
  if (!sex || age == null) return null;
  const all7 = SKINFOLDS.map(([k]) => n(m[k]));
  const three = sex === 'h' ? ['sf_chest', 'sf_abdomen', 'sf_thigh'] : ['sf_triceps', 'sf_suprailiac', 'sf_thigh'];
  let bd; let method; let sum;
  if (all7.every((x) => x != null)) {
    sum = all7.reduce((a, b) => a + b, 0); method = 'Jackson-Pollock 7 pliegues';
    bd = sex === 'h' ? 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age
      : 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * age;
  } else if (three.every((k) => n(m[k]) != null)) {
    sum = three.reduce((a, k) => a + n(m[k]), 0); method = 'Jackson-Pollock 3 pliegues';
    bd = sex === 'h' ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age
      : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * age;
  } else return null;
  return { pct: 495 / bd - 450, sum, method };
}
export const skinSum = (m) => { const v = SKINFOLDS.map(([k]) => n(m[k])).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) : null; };

// ---------- Métricas para objetivos ----------
// Fuentes: cualquier test, y las medidas de composición
export const BODY_METRICS = [['Peso corporal', 'kg', 'menos'], ['% grasa', '%', 'menos'], ['Suma de pliegues', 'mm', 'menos'], ...PERIMETERS.map(([k, l]) => [l, 'cm', k === 'waist' ? 'menos' : 'mas'])];
export function metricSeries(metric, { tests = [], body = [], player = {} }) {
  const out = [];
  tests.filter((t) => t.test === metric && testValue(t) != null).forEach((t) => out.push({ date: t.date, v: testValue(t) }));
  const per = PERIMETERS.find(([, l]) => l === metric);
  body.forEach((m) => {
    let v = null;
    if (metric === 'Peso corporal') v = n(m.weight);
    else if (metric === '% grasa') v = bodyFat(m, player.sex, ageAt(player.birth_date, m.date))?.pct ?? null;
    else if (metric === 'Suma de pliegues') v = skinSum(m);
    else if (per) v = n(m[per[0]]);
    if (v != null) out.push({ date: m.date, v });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
const meets = (v, g) => (g.better === 'menos' ? v <= Number(g.target) : v >= Number(g.target));
export function goalStatus(g, series, today = iso()) {
  const after = series.filter((x) => x.date >= g.start_date);
  const cur = series.length ? series[series.length - 1].v : null;
  const start = g.start_value != null ? Number(g.start_value) : (series.filter((x) => x.date <= g.start_date).pop() || series[0])?.v ?? null;
  const hit = g.achieved_at || after.find((x) => meets(x.v, g))?.date || null;
  const status = hit ? 'conseguido' : g.deadline && g.deadline < today ? 'vencido' : 'en_curso';
  const prog = start != null && cur != null && Number(g.target) !== start ? Math.max(0, Math.min(1, (cur - start) / (Number(g.target) - start))) : null;
  const days = hit ? Math.round((parseISO(hit) - parseISO(g.start_date)) / 864e5) : null;
  const left = !hit && g.deadline ? Math.round((parseISO(g.deadline) - parseISO(today)) / 864e5) : null;
  return { start, cur, hit, status, prog: hit ? 1 : prog, days, left, onTime: hit && g.deadline ? hit <= g.deadline : null };
}
export const GOAL_STATUS = { conseguido: ['Conseguido', 'ok'], en_curso: ['En curso', 'warn'], vencido: ['Fuera de plazo', 'bad'] };

// ---------- Bloques de 4 semanas ----------
export function blocks(from, to, days = 28) {
  const out = []; let a = parseISO(from); const end = parseISO(to);
  while (a <= end) { const b = addDays(a, days - 1); out.push({ from: iso(a), to: iso(b > end ? end : b), full: b <= end }); a = addDays(b, 1); }
  return out;
}
const avg = (xs) => { const v = xs.filter((x) => x != null && !Number.isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const firstNum = (s) => { const m = String(s ?? '').replace(',', '.').match(/\d+(\.\d+)?/); return m ? Number(m[0]) : null; };

// Prescripción de cada ejercicio de los programas, por id
export function itemIndex(programs = []) {
  const map = {};
  programs.forEach((p) => p.data?.phases?.forEach((ph) => ph.weeks.forEach((w) => w.sessions.forEach((s) => s.packs.forEach((k) => k.items.forEach((it) => { map[it.id] = it; }))))));
  return map;
}
// Volumen estimado de una sesión: series × reps prescritas × kg apuntados (solo ejercicios marcados como hechos)
export function sessionVolume(log, idx) {
  let vol = 0; let any = false;
  (log.sets || []).forEach((x) => {
    const it = idx[x.id]; const kg = firstNum(x.load); const sets = firstNum(it?.sets); const reps = firstNum(it?.reps);
    if (x.done !== false && it && kg && sets && reps && !/s|seg|min|m\b/i.test(String(it.reps).replace(/\d/g, ''))) { vol += sets * reps * kg; any = true; }
  });
  return any ? vol : null;
}
// Sesiones programadas en un rango (para la adherencia)
export function scheduled(programs = [], from, to) {
  const out = [];
  programs.filter((p) => p.player_id && p.start_date).forEach((p) => {
    const weeks = totalWeeks(p.data); let wi = 0;
    p.data.phases.forEach((ph) => ph.weeks.forEach((w) => { w.sessions.forEach((s) => { const d = sessionDate(p, wi + 1, s.day); if (d && d >= from && d <= to) out.push({ key: s.id, date: d, name: s.name }); }); wi += 1; }));
    void weeks;
  });
  return out;
}

// Resumen de un bloque
export function blockStats(b, { logs = [], checkins = [], programs = [] }, idx) {
  const L = logs.filter((l) => l.date >= b.from && l.date <= b.to);
  const C = checkins.filter((c) => c.date >= b.from && c.date <= b.to);
  const weeks = Math.max(1, Math.round(((parseISO(b.to) - parseISO(b.from)) / 864e5 + 1) / 7));
  const prog = L.filter((l) => l.program_id);
  const sch = scheduled(programs, b.from, b.to);
  const doneKeys = new Set(prog.map((l) => l.session_key));
  const vols = prog.map((l) => sessionVolume(l, idx)).filter((v) => v != null);
  return {
    ...b,
    sessions: L.length, programSessions: prog.length, clubSessions: L.length - prog.length,
    load: L.reduce((a, l) => a + Number(l.srpe || 0), 0), weeklyLoad: L.reduce((a, l) => a + Number(l.srpe || 0), 0) / weeks,
    rpe: avg(L.map((l) => (l.rpe == null ? null : Number(l.rpe)))), minutes: L.reduce((a, l) => a + Number(l.duration_min || 0), 0),
    volume: vols.length ? vols.reduce((a, v) => a + v, 0) : null,
    hrAvg: avg(L.map((l) => l.hr_avg)), hrMax: avg(L.map((l) => l.hr_max)), rest: avg(L.map((l) => l.rest_avg_s)),
    adherence: sch.length ? Math.min(1, sch.filter((s) => doneKeys.has(s.key)).length / sch.length) : null, scheduled: sch.length,
    checkinDays: C.length, checkinRate: C.length / ((parseISO(b.to) - parseISO(b.from)) / 864e5 + 1),
    wellness: avg(C.map(wellness)), sleep: avg(C.map((c) => c.sleep)), fatigue: avg(C.map((c) => c.fatigue)),
    soreness: avg(C.map((c) => c.soreness)), stress: avg(C.map((c) => c.stress)), mood: avg(C.map((c) => c.mood)), pain: avg(C.map((c) => c.pain)),
  };
}

// Carga por semana (lunes a domingo) en el periodo
export function weeklyLoads(logs, from, to) {
  const out = []; let a = parseISO(from); a = addDays(a, -((a.getDay() + 6) % 7)); const end = parseISO(to);
  while (a <= end) { const b = addDays(a, 6); const A = iso(a), B = iso(b); out.push({ from: A, label: `${a.getDate()}/${a.getMonth() + 1}`, value: logs.filter((l) => l.date >= A && l.date <= B).reduce((s, l) => s + Number(l.srpe || 0), 0) }); a = addDays(b, 1); }
  return out;
}

// Carga de cada ejercicio: primera y última vez en el periodo (progresión de cargas)
export function loadProgression(logs, idx) {
  const by = {};
  [...logs].sort((a, b) => a.date.localeCompare(b.date)).forEach((l) => (l.sets || []).forEach((x) => {
    const it = idx[x.id]; const kg = firstNum(x.load);
    if (!it?.exercise || !kg || !/kg|^\s*\d/.test(String(x.load))) return;
    const e = (by[it.exercise] = by[it.exercise] || { name: it.exercise, first: null, last: null, n: 0 });
    if (!e.first) e.first = { kg, date: l.date }; e.last = { kg, date: l.date }; e.n += 1;
  }));
  return Object.values(by).filter((e) => e.n > 1).sort((a, b) => (b.last.kg / b.first.kg) - (a.last.kg / a.first.kg));
}
