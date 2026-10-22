import React, { useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { iso, addDays, fmtDate } from '../lib/util.js';
import { useAction, useToast, Empty } from '../ui/ui.jsx';
import { PLANS, defaultPlan, planPatch, money, commitment, monthKey, fromRow, isLive, PLAN_COLORS, feeLabel, monthlyValue, payCover } from '../lib/domain.js';
import Flag from './Flag.jsx';
import PlanCard from '../ui/PlanCard.jsx';

// Pasa a un cliente a un plan: pone importe, tipo de pago, compromiso y frecuencia de revisión
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
  const { go } = useCoach();
  const [plan, setPlan] = useState(PLANS.find((x) => x.name === p.plan)?.name || defaultPlan().name);
  if (!PLANS.length) return <button type="button" className="btn sm" onClick={() => go('planes')}>Crear un plan</button>;
  return (
    <span className="row">
      <select aria-label={`Plan de ${p.name}`} style={{ width: 'auto' }} value={plan} onChange={(e) => setPlan(e.target.value)}>
        {PLANS.map((x) => <option key={x.name} value={x.name}>{x.name} · {feeLabel(x)}</option>)}
      </select>
      <button type="button" className="btn sm pri" onClick={() => assign(p, plan)}>{label}</button>
    </span>
  );
}

// Precio especial de un cliente (distinto al del plan)
function SpecialPrice({ p, plan }) {
  const { load } = useCoach();
  const act = useAction();
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(p.fee ?? plan.fee);
  const special = p.fee != null && Number(p.fee) !== plan.fee;
  const save = (fee, msg) => act(async () => { await q(supabase.from('players').update({ fee }).eq('id', p.id)); await load('players'); setEdit(false); }, msg);
  if (edit) return (
    <form className="row" style={{ gap: 4 }} onSubmit={(e) => { e.preventDefault(); save(Number(String(v).replace(',', '.')), `Precio especial para ${p.name.split(' ')[0]}: ${money(v)}.`); }}>
      <input aria-label={`Nuevo precio de ${p.name}`} inputMode="decimal" style={{ width: 80 }} value={v} onChange={(e) => setV(e.target.value)} autoFocus />
      <button className="btn sm" type="submit">OK</button>
      <button className="btn sm" type="button" onClick={() => setEdit(false)}>✕</button>
    </form>
  );
  return (
    <span className="row" style={{ gap: 4 }}>
      {special && <span className="pill s-warn">Especial {money(p.fee)}</span>}
      <button type="button" className="btn sm" onClick={() => { setV(p.fee ?? plan.fee); setEdit(true); }} aria-label={`Precio especial de ${p.name}`}>€</button>
      {special && <button type="button" className="btn sm" onClick={() => save(plan.fee, `${p.name.split(' ')[0]} vuelve al precio del plan.`)}>Quitar</button>}
    </span>
  );
}

const blank = (offer) => ({
  name: offer ? 'Oferta ' : '', fee: '', fee_type: 'mensual', commitment_months: offer ? '' : 3, review_days: 14,
  pitch: '', features: '', tag: '', color: offer ? 't-p' : 't-b', is_offer: !!offer, old_fee: '', valid_until: offer ? iso(addDays(new Date(), 30)) : '', active: true,
});
const toForm = (r) => ({ ...r, fee: String(r.fee), old_fee: r.old_fee ?? '', commitment_months: r.commitment_months ?? '', review_days: r.review_days ?? '', valid_until: r.valid_until || '', features: (r.features || []).join('\n'), pitch: r.pitch || '', tag: r.tag || '' });

function PlanForm({ row, offer, onDone }) {
  const { uid, load, players } = useCoach();
  const act = useAction();
  const [f, setF] = useState(row ? toForm(row) : blank(offer));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      const data = {
        coach_id: uid, name: f.name.trim(), fee: num(f.fee), fee_type: f.fee_type, commitment_months: num(f.commitment_months), review_days: num(f.review_days),
        pitch: f.pitch.trim() || null, features: f.features.split('\n').map((x) => x.trim()).filter(Boolean), tag: f.tag.trim() || null, color: f.color,
        is_offer: f.is_offer, old_fee: f.is_offer ? num(f.old_fee) : null, valid_until: f.is_offer ? f.valid_until || null : null, active: f.active,
      };
      if (data.fee == null || isNaN(data.fee)) throw new Error('Pon el precio.');
      if (row) {
        await q(supabase.from('plans').update(data).eq('id', row.id));
        // Si cambia el nombre, los clientes de ese plan lo siguen teniendo
        if (row.name !== data.name) await q(supabase.from('players').update({ plan: data.name }).eq('coach_id', uid).eq('plan', row.name));
      } else {
        await q(supabase.from('plans').insert({ ...data, sort: 10 }));
      }
      await load(['plans', 'players']);
      onDone();
    }, row ? 'Plan guardado. Los clientes que ya lo tienen mantienen su precio.' : f.is_offer ? 'Oferta creada. Ya sale en tu formulario y en la app de tus clientes.' : 'Plan creado.');
  };
  const inPlan = row ? players.filter((p) => p.plan === row.name && !p.end_date).length : 0;
  return (
    <form className="panel stack" onSubmit={save}>
      <h3>{row ? `Editar «${row.name}»` : f.is_offer ? 'Nueva oferta' : 'Nuevo plan'}</h3>
      <div className="grid3">
        <label className="f">Nombre<input id="pf-name" required maxLength={60} value={f.name} onChange={set('name')} placeholder={f.is_offer ? 'Ej. Oferta verano 3 meses' : 'Ej. Online sin revisiones'} /></label>
        <label className="f">Precio (€)<input id="pf-fee" required inputMode="decimal" value={f.fee} onChange={set('fee')} /></label>
        <label className="f">Pago<select value={f.fee_type} onChange={set('fee_type')}><option value="mensual">Al mes</option><option value="trimestral">Al trimestre</option><option value="unico">Pago único</option></select></label>
        {f.is_offer && <label className="f">Precio normal (sale tachado)<input id="pf-old" inputMode="decimal" value={f.old_fee} onChange={set('old_fee')} placeholder="Ej. 89" /></label>}
        {f.is_offer && <label className="f">Válida hasta<input id="pf-until" type="date" value={f.valid_until} onChange={set('valid_until')} /></label>}
        <label className="f">Compromiso (meses)<input inputMode="numeric" value={f.commitment_months} onChange={set('commitment_months')} placeholder="vacío = sin compromiso" /></label>
        <label className="f">Revisión cada (días)<input inputMode="numeric" value={f.review_days} onChange={set('review_days')} placeholder="vacío = sin revisiones" /></label>
        <label className="f">Etiqueta<input maxLength={40} value={f.tag} onChange={set('tag')} placeholder="Ej. El más elegido" /></label>
        <label className="f">Color<select value={f.color} onChange={set('color')}>{PLAN_COLORS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      </div>
      <label className="f">Frase corta<input maxLength={300} value={f.pitch} onChange={set('pitch')} placeholder="Para quién es, en una línea" /></label>
      <label className="f">Qué incluye (una cosa por línea)<textarea id="pf-feat" rows={4} value={f.features} onChange={set('features')} /></label>
      <label className="row small"><input type="checkbox" style={{ width: 'auto' }} checked={f.active} onChange={set('active')} /> Visible en el formulario y en la app de los clientes</label>
      <div className="row">
        <button className="btn pri" type="submit">{row ? 'Guardar' : f.is_offer ? 'Crear oferta' : 'Crear plan'}</button>
        <button className="btn" type="button" onClick={onDone}>Cancelar</button>
        {row && inPlan > 0 && <span className="muted small">{inPlan} cliente{inPlan === 1 ? '' : 's'} en este plan: si cambias el precio, mantienen el suyo (cámbialo con «€» si quieres).</span>}
      </div>
    </form>
  );
}

export default function Plans() {
  const { players, payments = [], plans: rows = [], go, load } = useCoach();
  const act = useAction();
  const toast = useToast();
  const [form, setForm] = useState(null); // null | 'plan' | 'offer' | fila
  const active = players.filter((p) => !p.end_date);
  const mk = monthKey();
  const live = PLANS;
  const hidden = rows.filter((r) => !isLive(fromRow(r)));
  const other = active.filter((p) => !rows.some((x) => x.name === p.plan) && !live.some((x) => x.name === p.plan));
  const monthly = active.reduce((a, p) => a + monthlyValue(p.fee, p.fee_type), 0);
  const done = () => setForm(null);
  const del = (r) => act(async () => {
    await q(supabase.from('plans').delete().eq('id', r.id));
    await load('plans');
    toast(`«${r.name}» eliminado.`, { undo: () => act(async () => { await q(supabase.from('plans').insert(r)); await load('plans'); }) });
  });
  const toggle = (r, on) => act(async () => { await q(supabase.from('plans').update({ active: on }).eq('id', r.id)); await load('plans'); }, on ? `«${r.name}» visible otra vez.` : `«${r.name}» oculto: ya no sale en el formulario ni en la app.`);
  return (
    <>
      <div className="pagehead">
        <div><h1>Planes</h1><p>Tus planes y ofertas, quién está en cada uno y lo que suman. Lo que ves aquí es lo que ven tus clientes y tu formulario.</p></div>
        <div className="row">
          <span className="chip ok">{money(monthly)} al mes en cuotas activas</span>
          <button className="btn" onClick={() => setForm('plan')}>+ Nuevo plan</button>
          <button className="btn pri" onClick={() => setForm('offer')}>+ Nueva oferta</button>
        </div>
      </div>
      {!live.length && !form && (
        <section className="panel stack" aria-label="Sin planes">
          <h3>Aún no tienes planes</h3>
          <p className="muted">Crea los planes que ofreces (precio, si es al mes, al trimestre o pago único, compromiso y revisiones). Tus clientes los verán en su app y en tu formulario de solicitudes.</p>
          <p className="muted small">Por ejemplo: un programa sin seguimiento con pago único, un plan mensual con revisiones cada dos semanas y otro más completo con revisión semanal.</p>
          <div className="row"><button className="btn pri" onClick={() => setForm('plan')}>Crear mi primer plan</button></div>
        </section>
      )}
      {(form === 'plan' || form === 'offer') && <PlanForm offer={form === 'offer'} onDone={done} />}
      {form && typeof form === 'object' && <PlanForm key={form.id} row={form} onDone={done} />}
      <div className="board">
        {live.map((pl) => {
          const row = rows.find((r) => r.id === pl.id);
          const list = active.filter((p) => p.plan === pl.name);
          const paidNow = list.filter((p) => payCover(p, payments, mk).paid).length;
          const sum = list.reduce((a, p) => a + monthlyValue(p.fee ?? pl.fee, p.fee_type || pl.type), 0);
          return (
            <PlanCard key={pl.name} plan={pl} you={false}>
              <div className="sub">{pl.review ? `Revisión cada ${pl.review === 7 ? 'semana' : `${pl.review} días`}` : 'Sin revisiones'}</div>
              <div className="sub"><b>{list.length}</b> activo{list.length === 1 ? '' : 's'}{pl.type !== 'unico' && list.length ? ` · ${money(Math.round(sum))}/mes · ${paidNow}/${list.length} al día` : ''}</div>
              {list.length > 0 && (
                <ul>{list.map((p) => (
                  <li key={p.id}>
                    <span><button type="button" className="lnk" onClick={() => go('clientes', p.id)}>{p.name}</button><Flag p={p} sm /> <span className="small">{pl.commitment ? commitment(p).text : ''}</span></span>
                    <SpecialPrice p={p} plan={pl} />
                  </li>
                ))}</ul>
              )}
              {row && (
                <div className="row">
                  <button className="btn sm" onClick={() => { setForm(row); window.scrollTo(0, 0); }}>Editar</button>
                  <button className="btn sm" onClick={() => toggle(row, false)}>Ocultar</button>
                  {!list.length && <button className="btn sm" onClick={() => del(row)}>Eliminar</button>}
                </div>
              )}
            </PlanCard>
          );
        })}
      </div>
      {hidden.length > 0 && (
        <section className="panel stack">
          <h3>Ocultos o caducados</h3>
          <ul className="list">{hidden.map((r) => (
            <li key={r.id}><span><b>{r.name}</b> <span className="muted small">· {money(r.fee)}{r.valid_until && r.valid_until < iso() ? ` · caducó el ${fmtDate(r.valid_until)}` : ' · oculto'}</span></span>
              <span className="row">
                {r.valid_until && r.valid_until < iso()
                  ? <button className="btn sm" onClick={() => { setForm(r); window.scrollTo(0, 0); }}>Cambiar fecha</button>
                  : <button className="btn sm" onClick={() => toggle(r, true)}>Mostrar</button>}
                {!active.some((p) => p.plan === r.name) && <button className="btn sm" onClick={() => del(r)}>Eliminar</button>}
              </span></li>
          ))}</ul>
        </section>
      )}
      <section className="panel stack">
        <h3>Clientes sin uno de estos planes</h3>
        {other.length ? (
          <ul className="list">{other.map((p) => (
            <li key={p.id}><span><b>{p.name}</b><Flag p={p} sm /> <span className="muted small">· {p.plan || 'sin plan'}</span></span><AssignPlan p={p} /></li>
          ))}</ul>
        ) : <Empty>Todos tus clientes activos están en uno de tus planes.</Empty>}
        <p className="muted small">Precio especial: pulsa «€» junto al cliente para cobrarle un precio distinto al del plan. Para cambiarle de plan, usa la pestaña Datos de su ficha.</p>
      </section>
    </>
  );
}
