// Modelo de un programa:
// { phases: [ { id, name, weeks: [ { id, sessions: [ { id, day(1-7), name,
//     packs: [ { id, type, rounds, notes, items: [ { id, exercise, sets, reps, load, rest, notes } ] } ] } ] } ] } ] }
import { uid, addDays, parseISO, daysBetween, dow, iso } from './util.js';

export const PACK_TYPES = ['Movilidad', 'Activación', 'Fuerza', 'Potencia', 'Velocidad', 'Cambio de dirección', 'Pliometría', 'Core', 'Prevención', 'Readaptación', 'Neurocognitivo', 'Acondicionamiento', 'Valoración', 'Vuelta a la calma'];

export const emptyItem = () => ({ id: uid(), exercise: '', sets: '', reps: '', load: '', rest: '', notes: '' });
export const emptyPack = (type = 'Fuerza') => ({ id: uid(), type, rounds: '', notes: '', items: [emptyItem()] });
export const emptySession = (day = 1) => ({ id: uid(), day, name: '', packs: [emptyPack()] });
export const emptyWeek = () => ({ id: uid(), sessions: [] });
export const emptyPhase = (n = 1) => ({ id: uid(), name: `Fase ${n}`, weeks: [emptyWeek()] });
export const emptyProgram = () => ({ phases: [emptyPhase(1)] });

// Copia profunda con ids nuevos (para duplicar o asignar)
export const cloneWithNewIds = (obj) => {
  const c = JSON.parse(JSON.stringify(obj));
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') {
      if ('id' in o) o.id = uid();
      Object.values(o).forEach(walk);
    }
  };
  walk(c);
  return c;
};

// Etiqueta A1, A2, B1… (letra = bloque, número = ejercicio)
export const label = (packIdx, itemIdx) => `${String.fromCharCode(65 + packIdx)}${itemIdx + 1}`;

// Semanas en orden, con la fase a la que pertenecen
export const flatWeeks = (data) => {
  const out = [];
  (data?.phases || []).forEach((ph, pi) =>
    (ph.weeks || []).forEach((w, wi) => out.push({ week: w, phase: ph, phaseIdx: pi, weekIdx: wi, n: out.length + 1 }))
  );
  return out;
};

export const totalWeeks = (data) => flatWeeks(data).length;

// Semana del programa que toca en una fecha (0 = primera). null si no hay fecha de inicio.
export const weekIndexOn = (program, date = new Date()) => {
  if (!program?.start_date) return null;
  const d = daysBetween(parseISO(program.start_date), date);
  if (d < 0) return -1;
  return Math.floor(d / 7);
};

// Fecha real de una sesión: inicio + semanas + día
export const sessionDate = (program, n, day) => {
  if (!program?.start_date) return null;
  const start = parseISO(program.start_date);
  const monday = addDays(start, 1 - dow(start));
  return iso(addDays(monday, (n - 1) * 7 + (day - 1)));
};

// Sesiones de una semana concreta con fecha
export const sessionsOfWeek = (program, weekIdx) => {
  const fw = flatWeeks(program?.data)[weekIdx];
  if (!fw) return [];
  return [...(fw.week.sessions || [])]
    .sort((a, b) => a.day - b.day)
    .map((s) => ({ ...s, date: sessionDate(program, fw.n, s.day), phase: fw.phase.name, weekN: fw.n }));
};

// Semana según calendario: el programa empieza el lunes de la semana de start_date
export const calendarWeekIdx = (program, date = new Date()) => {
  if (!program?.start_date) return null;
  const start = parseISO(program.start_date);
  const monday = addDays(start, 1 - dow(start));
  const d = daysBetween(monday, date);
  return d < 0 ? -1 : Math.floor(d / 7);
};

// Series totales por músculo (principal 1, secundario 0,5; Pelland 2025)
export const setsPerMuscle = (week, exMap) => {
  const acc = {};
  (week?.sessions || []).forEach((s) =>
    (s.packs || []).forEach((p) =>
      (p.items || []).forEach((it) => {
        const ex = exMap[it.exercise];
        const sets = (Number(it.sets) || 0) * (Number(p.rounds) || 1);
        if (!ex || !sets) return;
        if (ex.primary_muscle) acc[ex.primary_muscle] = (acc[ex.primary_muscle] || 0) + sets;
        (ex.secondary || []).forEach((m) => (acc[m] = (acc[m] || 0) + sets * 0.5));
      })
    )
  );
  return acc;
};
