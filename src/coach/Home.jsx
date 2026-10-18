import React from 'react';
import { useCoach } from './CoachApp.jsx';
import { waURL, iso, addDays, fmtDateTime } from '../lib/util.js';
import { WAIcon, Empty } from '../ui/ui.jsx';
import { calendarWeekIdx, totalWeeks } from '../lib/program.js';

export const waText = (p, kind, coach) => {
  const f = p.name.split(' ')[0];
  return {
    checkin: `Hola ${f}, llevas unos días sin hacer el check-in o con el bienestar bajo. ¿Cómo estás? Son 20 segundos y me ayudan a ajustar tu entrenamiento.`,
    dolor: `Hola ${f}, he visto que marcaste dolor. ¿Cómo lo notas hoy? Antes de entrenar lo hablamos y ajustamos la sesión.`,
    revision: `Hola ${f}, toca revisión. ¿Me cuentas sensaciones, cargas y si has tenido alguna molestia? Con eso te ajusto el plan.`,
    invitar: `Hola ${f}, ya tienes tu acceso a ${coach?.brand_name || 'la app'}. Entra en ${window.location.origin} con este correo: ${p.email}. Te llegará un enlace para acceder. Ahí verás tu entrenamiento de cada día y harás el check-in.`,
    libre: `Hola ${f}, `,
  }[kind];
};

export default function Home() {
  const { players, alerts, tasks, notes, programs, logs, coach, go } = useCoach();
  const active = players.filter((p) => !p.end_date);
  const weekAgo = iso(addDays(new Date(), -6));
  const end = new Date(); end.setHours(23, 59, 59);
  const dueTasks = tasks.filter((t) => !t.done && new Date(t.due_at) <= end);
  const dueNotes = notes.filter((n) => !n.done && n.remind_at && new Date(n.remind_at) <= end);
  const sessionsWeek = logs.filter((l) => l.date >= weekAgo).length;
  const pending = active.filter((p) => !p.user_id);
  const ending = programs.filter((pr) => pr.player_id && pr.start_date).filter((pr) => {
    const w = calendarWeekIdx(pr); const t = totalWeeks(pr.data);
    return w != null && t && w >= t - 1 && w < t + 1;
  });
  const pname = (id) => players.find((p) => p.id === id)?.name || '—';

  return (
    <>
      <div className="pagehead">
        <div><h1>Hola, {coach.brand_short || coach.brand_name}</h1><p>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
        <button className="btn pri" onClick={() => go('clientes', 'nuevo')}>+ Nuevo jugador</button>
      </div>

      <div className="grid3">
        <div className="panel"><div className="muted small">Jugadores activos</div><h2 className="num">{active.length}</h2></div>
        <div className="panel"><div className="muted small">Sesiones registradas (7 días)</div><h2 className="num">{sessionsWeek}</h2></div>
        <div className="panel"><div className="muted small">Pendientes para hoy</div><h2 className="num">{dueTasks.length + dueNotes.length}</h2></div>
      </div>

      <section className="panel stack">
        <h3>Alertas</h3>
        {alerts.length ? (
          <ul className="list">
            {alerts.map((a, i) => (
              <li key={i}>
                <span><button className="btn ghost sm" onClick={() => go('clientes', a.p.id)}><b>{a.p.name}</b></button> · {a.txt}</span>
                <span className="row">
                  <span className={'pill ' + a.level}>{a.kind === 'dolor' ? 'Dolor' : 'Bienestar'}</span>
                  {a.p.phone && <a className="btn sm" target="_blank" rel="noopener" href={waURL(a.p.phone, waText(a.p, a.kind, coach))}><WAIcon /> Escribir</a>}
                </span>
              </li>
            ))}
          </ul>
        ) : <Empty>Sin alertas. Todo el mundo ha hecho el check-in y está bien.</Empty>}
      </section>

      <div className="grid2">
        <section className="panel stack">
          <div className="between"><h3>Para hoy</h3><button className="btn sm" onClick={() => go('agenda')}>Ver agenda</button></div>
          {dueTasks.length + dueNotes.length ? (
            <ul className="list">
              {dueTasks.map((t) => <li key={t.id}><span>{t.title}{t.player_id ? ` · ${pname(t.player_id)}` : ''}</span><span className="muted small">{fmtDateTime(t.due_at)}</span></li>)}
              {dueNotes.map((n) => <li key={n.id}><span>{n.kind === 'importante' ? '⚠ ' : ''}{n.text} · {pname(n.player_id)}</span><span className="muted small">{fmtDateTime(n.remind_at)}</span></li>)}
            </ul>
          ) : <Empty>Nada pendiente hoy.</Empty>}
        </section>
        <section className="panel stack">
          <h3>Seguimiento</h3>
          <ul className="list">
            {pending.map((p) => (
              <li key={p.id}><span><b>{p.name}</b> · aún no ha entrado</span>
                {p.phone ? <a className="btn sm" target="_blank" rel="noopener" href={waURL(p.phone, waText(p, 'invitar', coach))}><WAIcon /> Reenviar acceso</a> : <span className="muted small">sin teléfono</span>}
              </li>
            ))}
            {ending.map((pr) => (
              <li key={pr.id}><span><b>{pname(pr.player_id)}</b> · termina «{pr.name}»</span><button className="btn sm" onClick={() => go('programacion', pr.id)}>Abrir</button></li>
            ))}
            {!pending.length && !ending.length && <li><span className="muted">Nada que revisar.</span></li>}
          </ul>
        </section>
      </div>
    </>
  );
}
