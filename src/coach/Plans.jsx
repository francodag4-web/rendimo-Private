import React, { useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { useAction, Empty } from '../ui/ui.jsx';
import { PLANS, planPatch, money, commitment, monthKey } from '../lib/domain.js';
import Flag from './Flag.jsx';

// Pasa a un jugador a un plan: pone importe, tipo de pago, compromiso y frecuencia de revisión
export function useAssignPlan() {
  const { load } = useCoach();
  const act = useAction();
  return (p, plan) => act(async () => {
    await q(supabase.from('players').update(planPatch(plan, p)).eq('id', p.id));
    await load('players');
  }, `${p.name.split(' ')[0]} pasa a ${plan}.`);
}

// Selector compacto para asignar plan desde cualquier sitio
export function AssignPlan({ p, label = 'Asignar' }) {
  const assign = useAssignPlan();
  const [plan, setPlan] = useState(PLANS.find((x) => x.name === p.plan)?.name || PLANS[1].name);
  return (
    <span className="row">
      <select aria-label={`Plan de ${p.name}`} style={{ width: 'auto' }} value={plan} onChange={(e) => setPlan(e.target.value)}>
        {PLANS.map((x) => <option key={x.name} value={x.name}>{x.name} · {money(x.fee)}{x.type === 'unico' ? ' único' : '/mes'}</option>)}
      </select>
      <button type="button" className="btn sm pri" onClick={() => assign(p, plan)}>{label}</button>
    </span>
  );
}

export default function Plans() {
  const { players, payments = [], go } = useCoach();
  const active = players.filter((p) => !p.end_date);
  const mk = monthKey();
  const other = active.filter((p) => !PLANS.some((x) => x.name === p.plan));
  const monthly = active.filter((p) => p.fee != null && p.fee_type !== 'unico').reduce((a, p) => a + Number(p.fee), 0);
  return (
    <>
      <div className="pagehead">
        <div><h1>Planes</h1><p>Tus tres planes, quién está en cada uno y lo que suman. Al pasar a alguien a un plan se ponen solos su importe, compromiso y revisiones.</p></div>
        <span className="chip ok">{money(monthly)} al mes en cuotas activas</span>
      </div>
      <div className="board">
        {PLANS.map((pl) => {
          const list = active.filter((p) => p.plan === pl.name);
          const paidNow = list.filter((p) => payments.some((x) => x.player_id === p.id && x.month === mk)).length;
          return (
            <section key={pl.name} className={'tile ' + pl.color} aria-label={pl.name}>
              <h3>{pl.name} <span className="pill">{pl.tag}</span></h3>
              <div className="big num">{pl.fee}<small> €{pl.type === 'unico' ? ' único' : '/mes'}</small></div>
              <div className="sub">{pl.pitch}</div>
              <ul>{pl.features.map((f) => <li key={f}><span>✓ {f}</span></li>)}</ul>
              <div className="sub">
                {pl.commitment ? `Compromiso de ${pl.commitment} meses · revisión cada ${pl.review === 7 ? 'semana' : `${pl.review} días`}` : 'Sin compromiso ni revisiones'}
              </div>
              <div className="sub"><b>{list.length}</b> activo{list.length === 1 ? '' : 's'}{pl.type !== 'unico' && list.length ? ` · ${money(list.length * pl.fee)}/mes · ${paidNow}/${list.length} pagado este mes` : ''}</div>
              {list.length > 0 && (
                <ul>{list.map((p) => (
                  <li key={p.id}><span><button type="button" className="lnk" onClick={() => go('clientes', p.id)}>{p.name}</button><Flag p={p} sm /></span><span className="small">{pl.commitment ? commitment(p).text : ''}</span></li>
                ))}</ul>
              )}
            </section>
          );
        })}
      </div>
      <section className="panel stack">
        <h3>Jugadores sin uno de estos planes</h3>
        {other.length ? (
          <ul className="list">{other.map((p) => (
            <li key={p.id}><span><b>{p.name}</b><Flag p={p} sm /> <span className="muted small">· {p.plan || 'sin plan'}</span></span><AssignPlan p={p} /></li>
          ))}</ul>
        ) : <Empty>Todos tus jugadores activos están en uno de los tres planes.</Empty>}
        <p className="muted small">Para cambiar de plan a alguien que ya está en uno, hazlo desde la pestaña Datos de su ficha.</p>
      </section>
    </>
  );
}
