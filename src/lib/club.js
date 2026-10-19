// Calendario del club: días fijos de entreno y partidos (editable por entrenador y cliente)
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { iso, addDays, parseISO, daysBetween, dow } from './util.js';

export function useClub(playerId) {
  const [club, setClub] = useState({ schedule: null, events: [], ready: false });
  const reload = useCallback(async () => {
    if (!playerId) return;
    const [s, e] = await Promise.all([
      supabase.from('club_schedule').select('*').eq('player_id', playerId).limit(1),
      supabase.from('club_events').select('*').eq('player_id', playerId).order('date'),
    ]);
    setClub({ schedule: s.data?.[0] || null, events: e.data || [], ready: true, missing: !!(s.error || e.error) });
  }, [playerId]);
  useEffect(() => { reload(); }, [reload]);
  return { ...club, reload };
}

// Qué hay ese día: entreno de club, partido o nada; y distancia al partido más cercano (MD-1, MD+1…)
export function clubDay(date, club) {
  const d = typeof date === 'string' ? date : iso(date);
  const evs = (club?.events || []).filter((e) => e.date === d);
  const match = evs.find((e) => e.kind === 'partido') || null;
  const off = evs.some((e) => e.kind === 'sin_entreno');
  const extra = evs.some((e) => e.kind === 'entreno');
  const training = !match && !off && (extra || (club?.schedule?.weekdays || []).includes(dow(parseISO(d))));
  let md = null;
  if (!match) {
    const near = (club?.events || []).filter((e) => e.kind === 'partido')
      .map((e) => ({ e, n: daysBetween(parseISO(e.date), parseISO(d)) }))
      .filter((x) => Math.abs(x.n) <= 3).sort((a, b) => Math.abs(a.n) - Math.abs(b.n))[0];
    if (near) md = near.n < 0 ? `MD${near.n}` : `MD+${near.n}`;
  }
  return { match, training, off, md, time: club?.schedule?.time || '' };
}

export const matchText = (m) => `Partido${m.label ? (m.home === false ? ' en ' : m.home ? ' vs ' : ' · ') + m.label : ''}${m.home === true ? ' (casa)' : m.home === false ? ' (fuera)' : ''}`;
export const nextMatch = (club, from = iso()) => (club?.events || []).find((e) => e.kind === 'partido' && e.date >= from) || null;
export { addDays };
