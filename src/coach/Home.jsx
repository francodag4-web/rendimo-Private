import React, { useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { waURL, iso, addDays, fmtDate, wellness, daysBetween, parseISO, MONTHS } from '../lib/util.js';
import { WAIcon, Empty, Tabs, useAction } from '../ui/ui.jsx';
import { supabase, q } from '../lib/supabase.js';
import { calendarWeekIdx, totalWeeks, sessionsOfWeek } from '../lib/program.js';
import { reviewInfo, isRecord, testValue, fmtNum, monthKey, monthName, feeText, commitment, PLANS } from '../lib/domain.js';
import Flag from './Flag.jsx';

export const waText = (p, kind, coach, extra = '') => {
  const f = p.name.split(' ')[0];
  return {
    checkin: `Hola ${f}, llevas unos días sin hacer el check-in o con el bienestar bajo. ¿Cómo estás? Son 20 segundos y me ayudan a ajustar tu entrenamiento.`,
    dolor: `Hola ${f}, he visto que marcaste dolor. ¿Cómo lo notas hoy? Antes de entrenar lo hablamos y ajustamos la sesión.`,
    carga: `Hola ${f}, la semana pasada subió bastante tu carga. ¿Cómo te encuentras? Si notas fatiga, lo ajustamos.`,
    revision: `Hola ${f}, toca revisión. ¿Me cuentas sensaciones, cargas y si has tenido alguna molestia? Con eso te ajusto el plan.`,
    marca: `¡Enhorabuena ${f}! Nueva marca${extra ? `: ${extra}` : ''}. El trabajo se está notando. Seguimos.`,
    pago: `Hola ${f}, te recuerdo el pago de ${extra || 'este mes'} (${feeText(p)}). Cuando lo hagas, avísame y lo marco. ¡Gracias!`,
    renov: `Hola ${f}, en unos días terminas el compromiso de ${p.commitment_months || 3} meses. ¿Hablamos de cómo seguir y de tus próximos objetivos?`,
    invitar: `Hola ${f}, ya tienes tu acceso a ${coach?.brand_name || 'la app'}. Entra en ${window.location.origin} con este correo: ${p.email}. Te llegará un enlace para acceder. Ahí verás tu entrenamiento de cada día y harás el check-in.`,
    libre: `Hola ${f}, `,
  }[kind];
};

const Lnk = ({ onClick, children }) => <button type="button" className="lnk" onClick={onClick}>{children}</button>;

export default function Home() {
  const { players, alerts, tasks, notes, programs, logs, tests = [], payments = [], leads = [], alertActions = [], coach, go } = useCoach();
  const today = iso();
  const active = players.filter((p) => !p.end_date);
  const pname = (id) => players.find((p) => p.id === id);

  // Clientes por plan
  const byPlan = {};
  active.forEach((p) => (byPlan[p.plan || 'Sin plan'] = (byPlan[p.plan || 'Sin plan'] || 0) + 1));
  const planRows = Object.entries(byPlan).sort((a, b) => b[1] - a[1]);
  const shades = ['#fff', 'rgba(255,255,255,.65)', 'rgba(255,255,255,.4)', 'rgba(255,255,255,.25)'];

  // Revisiones en los próximos 2 días o vencidas
  const reviews = active.map((p) => ({ p, r: reviewInfo(p) })).filter((x) => x.r && x.r.d <= 2).sort((a, b) => a.r.d - b.r.d);

  // Solicitudes
  const openLeads = leads.filter((l) => l.status === 'activa');
  const fresh = openLeads.filter((l) => !l.stage).length;

  // Nuevas marcas (últimos 14 días)
  const since = iso(addDays(new Date(), -14));
  const records = tests.filter((t) => t.date >= since && isRecord(t, tests)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  // Hoy
  const withAccess = active.filter((p) => p.user_id);
  const scheduled = withAccess.filter((p) => programs.filter((pr) => pr.player_id === p.id && pr.start_date).some((pr) => {
    const w = calendarWeekIdx(pr); return w != null && w >= 0 && sessionsOfWeek(pr, w).some((s) => s.date === today);
  }));
  const trainedToday = new Set(logs.filter((l) => l.date === today).map((l) => l.player_id));
  const base = scheduled.length ? scheduled : withAccess;
  const doneToday = base.filter((p) => trainedToday.has(p.id)).length;
  const gaps = withAccess.map((p) => {
    const ls = logs.filter((l) => l.player_id === p.id); const last = ls[ls.length - 1];
    return { p, days: last ? daysBetween(parseISO(last.date), new Date()) : null };
  }).filter((x) => x.days != null && x.days >= 4).sort((a, b) => b.days - a.days);

  // Pagos del mes
  const mk = monthKey();
  const payable = active.filter((p) => p.fee != null && (p.fee_type !== 'unico' || !payments.some((x) => x.player_id === p.id) || payments.some((x) => x.player_id === p.id && x.month === mk)));
  const paid = payable.filter((p) => payments.some((x) => x.player_id === p.id && x.month === mk));
  const unpaid = payable.filter((p) => !paid.includes(p));

  // Próximos recordatorios (7 días; incluye lo atrasado)
  const limit = addDays(new Date(), 7); limit.setHours(23, 59, 59);
  const rem = [
    ...tasks.filter((t) => !t.done && new Date(t.due_at) <= limit).map((t) => ({ id: 't' + t.id, when: new Date(t.due_at), text: t.title, p: pname(t.player_id) })),
    ...notes.filter((n) => !n.done && n.remind_at && new Date(n.remind_at) <= limit).map((n) => ({ id: 'n' + n.id, when: new Date(n.remind_at), text: n.text, p: pname(n.player_id) })),
    ...leads.filter((l) => l.status === 'activa' && l.call_at && (l.stage || 0) < 3 && new Date(l.call_at) <= limit).map((l) => ({ id: 'c' + l.id, when: new Date(l.call_at), text: `Videollamada con ${l.name}` })),
    ...alertActions.filter((a) => a.status === 'pendiente' && a.due_date && parseISO(a.due_date) <= limit).map((a) => ({ id: 'a' + a.id, when: parseISO(a.due_date), allDay: true, text: `Alerta${a.note ? ': ' + a.note : ''}`, p: pname(a.player_id) })),
  ].sort((a, b) => a.when - b.when).slice(0, 6);
  const whenTxt = (r) => {
    const d = r.when; const dd = daysBetween(new Date(), d);
    const day = dd < 0 ? 'Atrasado' : dd === 0 ? 'Hoy' : dd === 1 ? 'Mañana' : `${['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
    return r.allDay ? day : `${day} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Seguimiento
  const pending = active.filter((p) => !p.user_id);
  const ending = programs.filter((pr) => pr.player_id && pr.start_date).filter((pr) => {
    const w = calendarWeekIdx(pr); const t = totalWeeks(pr.data);
    return w != null && t && w >= t - 1 && w < t + 1;
  });

  return (
    <>
      <div className="pagehead">
        <div><h1>Hola, {coach.brand_short || coach.brand_name}</h1><p>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
        <button className="btn pri" onClick={() => go('clientes', 'nuevo')}>+ Nuevo jugador</button>
      </div>

      <div className="board">
        <section className="tile t-g" aria-label="Clientes activos">
          <h3>Clientes activos</h3>
          <div className="big num">{active.length}</div>
          {active.length > 0 && <div className="bars" aria-hidden="true">{planRows.map(([k, n], i) => <i key={k} style={{ width: `${(n / active.length) * 100}%`, background: shades[Math.min(i, 3)] }} />)}</div>}
          <div className="sub">{planRows.length ? planRows.map(([k, n]) => `${n} ${k}`).join(' · ') : 'Añade tu primer jugador.'}</div>
          <div className="row" style={{ gap: 14 }}><Lnk onClick={() => go('clientes')}>Ver jugadores</Lnk><Lnk onClick={() => go('planes')}>Ver planes</Lnk></div>
        </section>

        <section className="tile t-r" aria-label="Revisiones pendientes">
          <h3>Revisiones pendientes</h3>
          {reviews.length ? (
            <ul>{reviews.slice(0, 5).map(({ p, r }) => (
              <li key={p.id}>
                <span><Lnk onClick={() => go('clientes', p.id)}>{p.name}</Lnk><Flag p={p} sm /></span>
                <span className="row"><span className="pill">{r.text}</span>{p.phone && <a className="wa" target="_blank" rel="noopener" href={waURL(p.phone, waText(p, 'revision', coach))} aria-label={`WhatsApp a ${p.name}`}><WAIcon /></a>}</span>
              </li>
            ))}</ul>
          ) : <div className="sub">Ninguna en los próximos 2 días. Se programan desde la ficha de cada jugador.</div>}
        </section>

        <section className="tile t-p" aria-label="Solicitudes">
          <h3>Solicitudes</h3>
          <div className="big num">{openLeads.length}</div>
          <div className="sub">{fresh ? `${fresh} nueva${fresh === 1 ? '' : 's'} sin contactar.` : openLeads.length ? 'Todas contactadas.' : 'Ninguna en curso.'}</div>
          <div><Lnk onClick={() => go('solicitudes')}>Ver solicitudes</Lnk></div>
        </section>

        <section className="tile t-o span2" aria-label="Alertas"><Alerts /></section>

        <section className="tile t-a" aria-label="Nuevas marcas">
          <h3>Nuevas marcas</h3>
          {records.length ? (
            <ul>{records.map((t) => { const p = pname(t.player_id); return (
              <li key={t.id}><span><b>{p?.name.split(' ')[0]}</b> · {t.test}</span><b className="num">{fmtNum(testValue(t))} {t.unit}</b></li>
            ); })}</ul>
          ) : <div className="sub">Aparecen cuando un jugador supera su mejor registro en un test (últimos 14 días).</div>}
        </section>

        <section className="tile t-t" aria-label="Hoy">
          <h3>Hoy en {coach.brand_short || coach.brand_name}</h3>
          <div className="big num">{doneToday}<small>/{base.length}</small></div>
          <div className="sub">{scheduled.length ? 'con sesión hoy han registrado' : 'han registrado sesión hoy'}{gaps[0] ? <> · <Lnk onClick={() => go('clientes', gaps[0].p.id)}>{gaps[0].p.name.split(' ')[0]}</Lnk> lleva {gaps[0].days} días sin registrar</> : ''}</div>
        </section>

        <section className="tile t-b" aria-label="Pagos del mes">
          <h3>Pagos · {monthName(mk)}</h3>
          <div className="big num">{paid.length}<small>/{payable.length}</small></div>
          <div className="sub">{payable.length ? (unpaid.length ? <>{unpaid.length} pendiente{unpaid.length === 1 ? '' : 's'} · {unpaid.slice(0, 3).map((p, i) => <React.Fragment key={p.id}>{i ? ', ' : ''}<Lnk onClick={() => go('pagos')}>{p.name.split(' ')[0]}</Lnk></React.Fragment>)}</> : 'Todo cobrado este mes.') : 'Pon el importe en la ficha de cada jugador para controlar pagos.'}</div>
          <div><Lnk onClick={() => go('pagos')}>Ver pagos</Lnk></div>
        </section>

        <section className="tile t-s" aria-label="Próximos recordatorios">
          <h3>Próximos recordatorios <Lnk onClick={() => go('agenda')}>Ver agenda</Lnk></h3>
          {rem.length ? (
            <ul>{rem.map((r) => (
              <li key={r.id}>
                <span>{r.p && <><Lnk onClick={() => go('clientes', r.p.id)}>{r.p.name.split(' ')[0]}</Lnk><Flag p={r.p} sm /> · </>}{r.text}</span>
                <span className="pill">{whenTxt(r)}</span>
              </li>
            ))}</ul>
          ) : <div className="sub">Nada en los próximos 7 días.</div>}
        </section>
      </div>

      {(pending.length > 0 || ending.length > 0) && (
        <section className="panel stack">
          <h3>Seguimiento</h3>
          <ul className="list">
            {pending.map((p) => (
              <li key={p.id}><span><b>{p.name}</b> · aún no ha entrado</span>
                {p.phone ? <a className="btn sm" target="_blank" rel="noopener" href={waURL(p.phone, waText(p, 'invitar', coach))}><WAIcon /> Reenviar acceso</a> : <span className="muted small">sin teléfono</span>}
              </li>
            ))}
            {ending.map((pr) => (
              <li key={pr.id}><span><b>{pname(pr.player_id)?.name}</b> · termina «{pr.name}»</span><button className="btn sm" onClick={() => go('programacion', pr.id)}>Abrir</button></li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

const KIND = { dolor: 'Dolor', bienestar: 'Bienestar', checkin: 'Sin check-in', renov: 'Renovación', carga: 'Carga' };
const WA_KIND = { dolor: 'dolor', bienestar: 'checkin', checkin: 'checkin', renov: 'renov', carga: 'carga' };

function Alerts() {
  const { alerts } = useCoach();
  const [view, setView] = useState('abiertas');
  const open = alerts.filter((a) => a.status !== 'gestionada');
  const done = alerts.filter((a) => a.status === 'gestionada');
  const list = view === 'abiertas' ? open : done;
  return (
    <>
      <div className="between">
        <h3>Alertas</h3>
        <Tabs tabs={[['abiertas', `Por gestionar (${open.length})`], ['hechas', `Gestionadas (${done.length})`]]} value={view} onChange={setView} />
      </div>
      {list.length ? <ul className="alerts">{list.map((a) => <AlertRow key={a.p.id + a.key} a={a} />)}</ul>
        : <div className="sub">{view === 'abiertas' ? 'Nada por gestionar. Todo cubierto.' : 'Aún no has marcado ninguna alerta como gestionada.'}</div>}
    </>
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
          <button type="button" className="lnk" onClick={() => go('clientes', a.p.id)}>{a.p.name}</button><Flag p={a.p} sm /> · {a.txt}
          {a.action?.note && <div className="small" style={{ opacity: 0.85 }}>Nota: {a.action.note}</div>}
        </span>
        <span className="row">
          <span className="pill">{KIND[a.kind]}</span>
          <button type="button" className={'pill ' + (a.urgent ? 's-bad' : 's-soft')} style={{ border: 'none', cursor: 'pointer', fontWeight: 800 }} aria-pressed={a.urgent}
            title="Cambiar urgencia" onClick={() => save({ urgent: !a.urgent }, a.urgent ? 'Marcada como no urgente.' : 'Marcada como urgente.')}>
            {a.urgent ? '● Urgente' : '○ No urgente'}
          </button>
          {a.status === 'nueva' && <span className="pill s-warn">Sin gestionar</span>}
          {a.status === 'pendiente' && <span className={'pill ' + (overdue ? 's-bad' : 's-info')}>{overdue ? '⚠ ' : ''}Pendiente · {fmtDate(a.action.due_date)}</span>}
          {a.status === 'gestionada' && <span className="pill s-ok">Gestionada ✓</span>}
        </span>
      </div>
      {form ? (
        <form className="row" style={{ width: '100%' }} onSubmit={(e) => { e.preventDefault(); form === 'pendiente'
          ? save({ status: 'pendiente', due_date: date, note: note || null }, `Pendiente para el ${fmtDate(date)}. Aparece en tu agenda.`)
          : save({ status: 'gestionada', note: note || null }, 'Alerta gestionada.'); }}>
          {form === 'pendiente' && <label className="row small">Para el<input type="date" required style={{ width: 'auto' }} value={date} onChange={(e) => setDate(e.target.value)} /></label>}
          <input style={{ flex: '1 1 200px' }} placeholder={form === 'pendiente' ? 'Qué vas a hacer (opcional)' : 'Qué hiciste (opcional)'} value={note} onChange={(e) => setNote(e.target.value)} />
          <button className={'btn sm ' + (form === 'pendiente' ? 's-info' : 's-ok')} type="submit">{form === 'pendiente' ? 'Guardar pendiente' : 'Marcar gestionada'}</button>
          <button type="button" className="btn sm" onClick={() => setForm(null)}>Cancelar</button>
        </form>
      ) : (
        <div className="row">
          {a.status !== 'gestionada' && <button className="btn sm" onClick={() => setForm('pendiente')}>{a.status === 'pendiente' ? 'Cambiar fecha' : 'Dejar pendiente'}</button>}
          {a.status !== 'gestionada' && <button className="btn sm s-ok" onClick={() => setForm('gestionada')}>✓ Gestionada</button>}
          {a.status !== 'nueva' && <button className="btn sm" onClick={reopen}>Reabrir</button>}
          {a.p.phone && <a className="wa" target="_blank" rel="noopener" href={waURL(a.p.phone, waText(a.p, WA_KIND[a.kind] || 'libre', coach))}><WAIcon /> Escribir</a>}
        </div>
      )}
    </li>
  );
}
