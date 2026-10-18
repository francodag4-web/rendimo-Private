import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, q, PLATFORM, fetchAll } from '../lib/supabase.js';
import { applyBrand } from '../App.jsx';
import { iso, addDays, wellness, parseISO, daysBetween } from '../lib/util.js';
import { Loading } from '../ui/ui.jsx';
import Home from './Home.jsx';
import Clients from './Clients.jsx';
import Programs from './Programs.jsx';
import Library from './Library.jsx';
import Agenda from './Agenda.jsx';
import Settings from './Settings.jsx';
import Leads from './Leads.jsx';
import Payments from './Payments.jsx';
import Plans from './Plans.jsx';
import GlobalSearch from './GlobalSearch.jsx';
import { commitment } from '../lib/domain.js';

const Ctx = createContext(null);
export const useCoach = () => useContext(Ctx);

const PAGES = [
  ['inicio', 'Inicio'],
  ['agenda', 'Agenda'],
  ['clientes', 'Jugadores'],
  ['programacion', 'Programación'],
  ['biblioteca', 'Biblioteca'],
  ['solicitudes', 'Solicitudes'],
  ['pagos', 'Pagos'],
  ['planes', 'Planes'],
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

// Si una tabla aún no existe, la app sigue funcionando sin ella
const soft = (b) => ({ then: (ok) => b.then(({ data, error }) => ({ data: error ? [] : data, error: null })).then(ok) });

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
      exercises: () => ({ then: (ok, ko) => fetchAll(() => supabase.from('exercises').select('*').order('name').order('id')).then((data) => ({ data, error: null })).then(ok, ko) }),
      programs: () => supabase.from('programs').select('*').order('updated_at', { ascending: false }),
      tasks: () => supabase.from('tasks').select('*').order('due_at'),
      notes: () => supabase.from('notes').select('*').order('created_at', { ascending: false }),
      checkins: () => supabase.from('checkins').select('*').gte('date', since).order('date'),
      logs: () => supabase.from('session_logs').select('*').gte('date', since).order('date'),
      // Si la tabla de alertas aún no existe, la app sigue funcionando sin ella
      alertActions: () => soft(supabase.from('alert_actions').select('*')),
      evolution: () => soft(supabase.from('evolution').select('*').order('date', { ascending: false }).order('created_at', { ascending: false })),
      tests: () => soft(supabase.from('tests').select('*').order('date').order('created_at')),
      injuries: () => soft(supabase.from('injuries').select('*').order('date', { ascending: false })),
      payments: () => soft(supabase.from('payments').select('*')),
      leads: () => soft(supabase.from('leads').select('*').order('created_at', { ascending: false })),
      blocks: () => soft(supabase.from('saved_blocks').select('*').order('name')),
      weekNotes: () => soft(supabase.from('week_notes').select('*').gte('week', iso(addDays(new Date(), -35)))),
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

  // Alertas: dolor, bienestar bajo y sin check-in; con su estado de gestión
  const alerts = useMemo(() => {
    if (!d?.players) return [];
    const out = [];
    const recent = iso(addDays(new Date(), -2));
    const acts = d.alertActions || [];
    const push = (p, kind, key, txt, level, autoUrgent) => {
      const a = acts.find((x) => x.player_id === p.id && x.alert_key === key);
      // Una fila «pendiente» sin fecha solo guarda la urgencia: sigue sin gestionar
      const status = !a ? 'nueva' : a.status === 'pendiente' && !a.due_date ? 'nueva' : a.status;
      out.push({ p, kind, key, txt, level, action: a || null, status, urgent: a ? a.urgent : autoUrgent });
    };
    d.players.filter((p) => !p.end_date && p.user_id).forEach((p) => {
      const cs = d.checkins.filter((c) => c.player_id === p.id);
      const last = cs[cs.length - 1];
      if (!last || last.date < recent) push(p, 'checkin', `sin-checkin:${last?.date || 'nunca'}`, last ? `sin check-in desde el ${Number(last.date.slice(8))}/${Number(last.date.slice(5, 7))}` : 'aún no ha hecho ningún check-in', 'warn', false);
      else {
        if (last.pain >= 4) push(p, 'dolor', `dolor:${last.date}`, `dolor ${last.pain}/10${last.note ? ' · ' + last.note : ''}`, 'bad', last.pain >= 6);
        const w = wellness(last);
        if (w != null && w <= 13) push(p, 'bienestar', `bienestar:${last.date}`, `bienestar bajo (${w}/25)`, 'warn', w <= 10);
      }
    });
    // Fin del compromiso en 7 días o menos
    d.players.filter((p) => !p.end_date && p.commitment_months).forEach((p) => {
      const c = commitment(p);
      if (!c.ends) return;
      const left = daysBetween(new Date(), parseISO(c.ends));
      if (left >= 0 && left <= 7) push(p, 'renov', `renov:${c.ends}`, `termina el compromiso de ${c.total} meses ${left === 0 ? 'hoy' : `en ${left} día${left === 1 ? '' : 's'}`}`, 'warn', false);
    });
    // Subida brusca de carga semanal (sRPE) respecto a la semana anterior. Orientativo.
    const mon = (x) => { const t = new Date(x); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return iso(t); };
    const thisMon = mon(new Date()); const prevMon = iso(addDays(parseISO(thisMon), -7)); const lastMon = iso(addDays(parseISO(thisMon), -14));
    d.players.filter((p) => !p.end_date && p.user_id).forEach((p) => {
      const ls = d.logs.filter((l) => l.player_id === p.id);
      const sum = (a, b) => ls.filter((l) => l.date >= a && l.date < b).reduce((s, l) => s + Number(l.srpe || 0), 0);
      const prev = sum(lastMon, prevMon); const cur = sum(prevMon, thisMon);
      if (prev > 0 && cur > prev * 1.3) push(p, 'carga', `carga:${prevMon}`, `carga de la semana pasada +${Math.round((cur / prev - 1) * 100)} % respecto a la anterior`, 'warn', false);
    });
    const rank = { nueva: 0, pendiente: 1, gestionada: 2 };
    return out.sort((a, b) => rank[a.status] - rank[b.status] || (b.urgent - a.urgent));
  }, [d]);
  const openAlerts = alerts.filter((a) => a.status === 'nueva' || (a.status === 'pendiente' && a.action?.due_date && a.action.due_date <= iso())).length;

  const due = useMemo(() => {
    if (!d?.tasks) return 0;
    const end = new Date(); end.setHours(23, 59, 59);
    return d.tasks.filter((t) => !t.done && new Date(t.due_at) <= end).length +
      d.notes.filter((n) => !n.done && n.remind_at && new Date(n.remind_at) <= end).length +
      (d.alertActions || []).filter((x) => x.status === 'pendiente' && x.due_date && x.due_date <= iso()).length;
  }, [d]);

  if (err && !d) return <div className="center"><div className="card"><h2>Error al cargar</h2><p>{err}</p><button className="btn" onClick={() => load()}>Reintentar</button></div></div>;
  if (!d?.coach) return <Loading />;

  const ctx = { ...d, load, go, route, alerts, uid };
  const newLeads = (d.leads || []).filter((l) => l.status === 'activa' && !l.stage).length;
  const coach = d.coach;
  const Page = { inicio: Home, clientes: Clients, programacion: Programs, biblioteca: Library, agenda: Agenda, ajustes: Settings, solicitudes: Leads, pagos: Payments, planes: Plans }[route.page];
  const badge = { inicio: openAlerts, agenda: due, solicitudes: newLeads };

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
        <main className="main">
          <div className="coachtop"><GlobalSearch /></div>
          <Page />
        </main>
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
