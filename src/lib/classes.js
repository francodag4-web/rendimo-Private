// Clases en directo (Google Meet u otra videollamada): estado, textos y repetición semanal
import { iso, addDays, DAYS, MONTHS, daysBetween } from './util.js';

export const DURATIONS = [30, 45, 60, 75, 90];
export const EARLY_MIN = 15; // se puede entrar desde 15 min antes

const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export const classEnd = (c) => new Date(new Date(c.starts_at).getTime() + (c.duration_min || 60) * 60000);

// 'live' (en curso), 'soon' (empieza en ≤15 min), 'later', 'past'
export function classStatus(c, now = new Date()) {
  const s = new Date(c.starts_at); const e = classEnd(c);
  if (now >= e) return 'past';
  if (now >= s) return 'live';
  return s - now <= EARLY_MIN * 60000 ? 'soon' : 'later';
}
export const minsTo = (c, now = new Date()) => Math.max(0, Math.ceil((new Date(c.starts_at) - now) / 60000));

export function classDay(c, now = new Date()) {
  const d = new Date(c.starts_at); const dd = daysBetween(now, d);
  if (dd === 0) return 'hoy';
  if (dd === 1) return 'mañana';
  return `${DAYS[(d.getDay() + 6) % 7].toLowerCase()} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}
export const classTime = (c) => `${hm(new Date(c.starts_at))} a ${hm(classEnd(c))}`;
export const classStart = (c) => hm(new Date(c.starts_at));

export const isMeet = (u) => /^https:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(u || '');
export const validUrl = (u) => /^https:\/\/[^\s]+\.[^\s]+/i.test((u || '').trim());
export const cleanUrl = (u) => {
  let x = (u || '').trim();
  if (/^meet\.google\.com\//i.test(x)) x = 'https://' + x;
  return x;
};

// Fechas de una clase que se repite cada semana (incluida la primera)
export function weeklyDates(dateISO, weeks) {
  const [y, m, d] = dateISO.split('-').map(Number);
  return Array.from({ length: Math.max(1, weeks) }, (_, i) => iso(addDays(new Date(y, m - 1, d), i * 7)));
}

// Recordatorio por WhatsApp para el cliente (sin signos de apertura, sin emojis)
export const classReminder = (c, name) =>
  `Hola ${(name || '').split(' ')[0]}! Te recuerdo la clase de ${classDay(c)} a las ${classStart(c)}. Puedes entrar desde la app o directamente aquí: ${c.meet_url}`;
