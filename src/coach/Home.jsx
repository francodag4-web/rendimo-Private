import React from 'react';
import { useCoach } from './CoachApp.jsx';
import { waURL, iso, addDays, fmtDateTime, fmtDate } from '../lib/util.js';
import { WAIcon, Empty, Tabs, useAction } from '../ui/ui.jsx';
import { supabase, q } from '../lib/supabase.js';
import { useState } from 'react';
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
  const dueAlerts = alerts.filter((a) => a.status === 'pendiente' && a.action?.due_date && a.action.due_date <= iso());
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
        <div className="panel"><div className="muted small">Pendientes para hoy</div><h2 className="num">{dueTasks.length + dueNotes.length + dueAlerts.length}</h2></div>
      </div>

      <Alerts />

      <div className="grid2">
        <section className="panel stack">
          <div className="between"><h3>Para hoy</h3><button className="btn sm" onClick={() => go('agenda')}>Ver agenda</button></div>
          {dueTasks.length + dueNotes.length + dueAlerts.length ? (
            <ul className="list">
              {dueTasks.map((t) => <li key={t.id}><span>{t.title}{t.player_id ? ` · ${pname(t.player_id)}` : ''}</span><span className="muted small">{fmtDateTime(t.due_at)}</span></li>)}
              {dueAlerts.map((x) => <li key={x.key + x.p.id}><span>{x.urgent ? '🔴 ' : '🔔 '}Alerta de {x.p.name}: {x.txt}{x.action.note ? ` · ${x.action.note}` : ''}</span><span className="muted small">{fmtDate(x.action.due_date)}</span></li>)}
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

const KIND = { dolor: 'Dolor', bienestar: 'Bienestar', checkin: 'Sin check-in' };

function Alerts() {
  const { alerts } = useCoach();
  const [view, setView] = useState('abiertas');
  const open = alerts.filter((a) => a.status !== 'gestionada');
  const done = alerts.filter((a) => a.status === 'gestionada');
  const list = view === 'abiertas' ? open : done;
  return (
    <section className="panel stack">
      <div className="between">
        <h3>Alertas</h3>
        <Tabs tabs={[['abiertas', `Por gestionar (${open.length})`], ['hechas', `Gestionadas (${done.length})`]]} value={view} onChange={setView} />
      </div>
      {list.length ? <ul className="list alerts">{list.map((a) => <AlertRow key={a.p.id + a.key} a={a} />)}</ul>
        : <Empty>{view === 'abiertas' ? 'Nada por gestionar. Todo cubierto.' : 'Aún no has marcado ninguna alerta como gestionada.'}</Empty>}
    </section>
  );
}

function AlertRow({ a }) {
  const { uid, load, go, coach } = useCoach();
  const act = useAction();
  const [form, setForm] = useState(null); // 'pendiente' | 'gestionada'
  const tomorrow = iso(addDays(new Date(), 1));
  const [date, setDate] = useState(a.action?.due_date || tomorrow);
  const [note, setNote] = useState(a.action?.note || '');
  const save = (patch, msg) => act(async () => {
    await q(supabase.from('alert_actions').upsert({ coach_id: uid, player_id: a.p.id, alert_key: a.key, status: a.status === 'nueva' ? 'pendiente' : a.status, urgent: a.urgent, due_date: a.action?.due_date || null, note: a.action?.note || null, ...patch }, { onConflict: 'coach_id,player_id,alert_key' }));
    await load('alertActions');
    setForm(null);
  }, msg);
  const reopen = () => act(async () => {
    await q(supabase.from('alert_actions').delete().eq('id', a.action.id));
    await load('alertActions');
  }, 'Alerta reabierta.');
  const overdue = a.status === 'pendiente' && a.action?.due_date && a.action.due_date <= iso();
  return (
    <li className={'alert' + (a.urgent ? ' urgent' : '')}>
      <div className="between" style={{ width: '100%' }}>
        <span>
          <button className="btn ghost sm" onClick={() => go('clientes', a.p.id)}><b>{a.p.name}</b></button> · {a.txt}
          {a.action?.note && <div className="small muted" style={{ paddingLeft: 9 }}>Nota: {a.action.note}</div>}
        </span>
        <span className="row">
          <span className={'pill ' + a.level}>{KIND[a.kind]}</span>
          <button className={'pill ' + (a.urgent ? 'bad' : '')} style={{ border: 'none', cursor: 'pointer' }} aria-pressed={a.urgent}
            title="Cambiar urgencia" onClick={() => save({ urgent: !a.urgent }, a.urgent ? 'Marcada como no urgente.' : 'Marcada como urgente.')}>
            {a.urgent ? '● Urgente' : '○ No urgente'}
          </button>
          {a.status === 'nueva' && <span className="pill warn">Sin gestionar</span>}
          {a.status === 'pendiente' && <span className={'pill ' + (overdue ? 'bad' : 'brand')}>Pendiente · {fmtDate(a.action.due_date)}</span>}
          {a.status === 'gestionada' && <span className="pill ok">Gestionada ✓</span>}
        </span>
      </div>
      {form ? (
        <form className="row" style={{ width: '100%' }} onSubmit={(e) => { e.preventDefault(); form === 'pendiente'
          ? save({ status: 'pendiente', due_date: date, note: note || null }, `Pendiente para el ${fmtDate(date)}. Aparece en tu agenda.`)
          : save({ status: 'gestionada', note: note || null }, 'Alerta gestionada.'); }}>
          {form === 'pendiente' && <label className="row small">Para el<input type="date" required style={{ width: 'auto' }} value={date} onChange={(e) => setDate(e.target.value)} /></label>}
          <input style={{ flex: '1 1 200px' }} placeholder={form === 'pendiente' ? 'Qué vas a hacer (opcional)' : 'Qué hiciste (opcional)'} value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn pri sm" type="submit">{form === 'pendiente' ? 'Guardar pendiente' : 'Marcar gestionada'}</button>
          <button type="button" className="btn sm" onClick={() => setForm(null)}>Cancelar</button>
        </form>
      ) : (
        <div className="row">
          {a.status !== 'gestionada' && <button className="btn sm" onClick={() => setForm('pendiente')}>{a.status === 'pendiente' ? 'Cambiar fecha' : 'Dejar pendiente'}</button>}
          {a.status !== 'gestionada' && <button className="btn sm pri" onClick={() => setForm('gestionada')}>Gestionada</button>}
          {a.status !== 'nueva' && <button className="btn sm ghost" onClick={reopen}>Reabrir</button>}
          {a.p.phone && <a className="btn sm" target="_blank" rel="noopener" href={waURL(a.p.phone, waText(a.p, a.kind === 'dolor' ? 'dolor' : 'checkin', coach))}><WAIcon /> Escribir</a>}
        </div>
      )}
    </li>
  );
}
