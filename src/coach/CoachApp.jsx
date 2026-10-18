import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, q, PLATFORM } from '../lib/supabase.js';
import { applyBrand } from '../App.jsx';
import { iso, addDays, wellness } from '../lib/util.js';
import { Loading } from '../ui/ui.jsx';
import Home from './Home.jsx';
import Clients from './Clients.jsx';
import Programs from './Programs.jsx';
import Library from './Library.jsx';
import Agenda from './Agenda.jsx';
import Settings from './Settings.jsx';

const Ctx = createContext(null);
export const useCoach = () => useContext(Ctx);

const PAGES = [
  ['inicio', 'Inicio'],
  ['clientes', 'Jugadores'],
  ['programacion', 'Programación'],
  ['biblioteca', 'Biblioteca'],
  ['agenda', 'Agenda'],
  ['ajustes', 'Marca y cuenta'],
];

// Navegación con #hash para que funcione el botón atrás del móvil
function useHashRoute() {
  const read = () => {
    const [page = 'inicio', id = null] = window.location.hash.replace(/^#\/?/, '').split('/');
    return { page: PAGES.some(([k]) => k === page) ? page : 'inicio', id };
  };
  const [r, setR] = useState(read);
  useEffect(() => {
    const on = () => setR(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((page, id) => { window.location.hash = `/${page}${id ? '/' + id : ''}`; window.scrollTo(0, 0); }, []);
  return [r, go];
}

export default function CoachApp({ session, onLogout, canSwitch, onSwitch }) {
  const uid = session.user.id;
  const [route, go] = useHashRoute();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async (only) => {
    const since = iso(addDays(new Date(), -120));
    const jobs = {
      coach: () => supabase.from('coaches').select('*').eq('id', uid).single(),
      players: () => supabase.from('players').select('*').order('name'),
      exercises: () => supabase.from('exercises').select('*').order('name'),
      programs: () => supabase.from('programs').select('*').order('updated_at', { ascending: false }),
      tasks: () => supabase.from('tasks').select('*').order('due_at'),
      notes: () => supabase.from('notes').select('*').order('created_at', { ascending: false }),
      checkins: () => supabase.from('checkins').select('*').gte('date', since).order('date'),
      logs: () => supabase.from('session_logs').select('*').gte('date', since).order('date'),
    };
    const keys = only ? [].concat(only) : Object.keys(jobs);
    try {
      const res = await Promise.all(keys.map((k) => q(jobs[k]())));
      setD((prev) => {
        const next = { ...(prev || {}) };
        keys.forEach((k, i) => (next[k] = res[i]));
        return next;
      });
      setErr('');
    } catch (e) {
      setErr(e.message);
    }
  }, [uid]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (d?.coach) applyBrand(d.coach.color); }, [d?.coach?.color]);
  useEffect(() => {
    if (d?.coach) document.title = d.coach.brand_short || d.coach.brand_name || PLATFORM;
  }, [d?.coach?.brand_name, d?.coach?.brand_short]);

  // Alertas: bienestar bajo, dolor, sin check-in 3 días
  const alerts = useMemo(() => {
    if (!d?.players) return [];
    const out = [];
    const recent = iso(addDays(new Date(), -2));
    d.players.filter((p) => !p.end_date && p.user_id).forEach((p) => {
      const cs = d.checkins.filter((c) => c.player_id === p.id);
      const last = cs[cs.length - 1];
      if (!last || last.date < recent) out.push({ p, kind: 'checkin', txt: last ? `sin check-in desde el ${last.date.slice(8)}/${last.date.slice(5, 7)}` : 'aún no ha hecho ningún check-in', level: 'warn' });
      else {
        if (last.pain >= 4) out.push({ p, kind: 'dolor', txt: `dolor ${last.pain}/10${last.note ? ' · ' + last.note : ''}`, level: 'bad' });
        const w = wellness(last);
        if (w != null && w <= 13) out.push({ p, kind: 'checkin', txt: `bienestar bajo (${w}/25)`, level: 'warn' });
      }
    });
    return out;
  }, [d]);

  const due = useMemo(() => {
    if (!d?.tasks) return 0;
    const end = new Date(); end.setHours(23, 59, 59);
    return d.tasks.filter((t) => !t.done && new Date(t.due_at) <= end).length +
      d.notes.filter((n) => !n.done && n.remind_at && new Date(n.remind_at) <= end).length;
  }, [d]);

  if (err && !d) return <div className="center"><div className="card"><h2>Error al cargar</h2><p>{err}</p><button className="btn" onClick={() => load()}>Reintentar</button></div></div>;
  if (!d?.coach) return <Loading />;

  const ctx = { ...d, load, go, route, alerts, uid };
  const coach = d.coach;
  const Page = { inicio: Home, clientes: Clients, programacion: Programs, biblioteca: Library, agenda: Agenda, ajustes: Settings }[route.page];
  const badge = { inicio: alerts.length, agenda: due };

  const Brand = (
    <div className="brand">
      {coach.logo ? <img src={coach.logo} alt="" /> : <span className="logo">{(coach.brand_short || coach.brand_name || 'R').slice(0, 2)}</span>}
      <div><b>{coach.brand_name}</b><div className="small muted">Entrenador</div></div>
    </div>
  );

  return (
    <Ctx.Provider value={ctx}>
      <div className="app">
        <aside className="side">
          {Brand}
          <nav className="nav" aria-label="Secciones">
            {PAGES.map(([k, l]) => (
              <button key={k} type="button" aria-current={route.page === k ? 'page' : undefined} onClick={() => go(k)}>
                {l}{badge[k] ? <span className="badge">{badge[k]}</span> : null}
              </button>
            ))}
          </nav>
          <div className="foot">
            {canSwitch && <button className="btn sm" onClick={onSwitch}>Ver mi parte de jugador</button>}
            <span className="muted">{session.user.email}</span>
            <button className="btn sm" onClick={onLogout}>Cerrar sesión</button>
            <span className="muted small">Con {PLATFORM}</span>
          </div>
        </aside>
        <header className="topbar">{Brand}<button className="btn sm" onClick={onLogout}>Salir</button></header>
        <main className="main"><Page /></main>
        <nav className="bottomnav" aria-label="Secciones">
          {PAGES.map(([k, l]) => (
            <button key={k} type="button" aria-current={route.page === k ? 'page' : undefined} onClick={() => go(k)}>
              {l.split(' ')[0]}{badge[k] ? ` (${badge[k]})` : ''}
            </button>
          ))}
        </nav>
      </div>
    </Ctx.Provider>
  );
}
