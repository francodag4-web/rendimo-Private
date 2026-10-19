import React, { useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { waURL, iso } from '../lib/util.js';
import { useAction, useToast, Tabs, Empty, WAIcon } from '../ui/ui.jsx';
import { monthKey, monthName, feeText, commitment, money, payCover } from '../lib/domain.js';
import { waText } from './Home.jsx';
import Flag from './Flag.jsx';
import { AssignPlan } from './Plans.jsx';

const shift = (key, n) => { const [y, m] = key.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return monthKey(d); };

export default function Payments() {
  const { players, payments = [], uid, load, coach, go } = useCoach();
  const act = useAction();
  const toast = useToast();
  const [mk, setMk] = useState(monthKey());
  const [view, setView] = useState('todos');
  const [y, m] = mk.split('-').map(Number);
  const monthEnd = iso(new Date(y, m, 0));
  const monthStart = `${mk}-01`;
  // Trimestral: un pago en cualquier mes del trimestre lo cubre entero
  const paidRow = (p) => (p.fee_type === 'trimestral' ? payCover(p, payments, mk).row : payments.find((x) => x.player_id === p.id && x.month === mk));
  const period = (p) => (p.fee_type === 'trimestral' ? payCover(p, payments, mk).long : monthName(mk));
  // Activos ese mes con importe. Pago único: aparece hasta que se paga y en el mes en que se pagó.
  const rows = players.filter((p) => p.fee != null && p.start_date <= monthEnd && (!p.end_date || p.end_date >= monthStart))
    .filter((p) => p.fee_type !== 'unico' || paidRow(p) || !payments.some((x) => x.player_id === p.id));
  const paid = rows.filter(paidRow);
  const list = rows.filter((p) => view === 'todos' || (view === 'pagados' ? paidRow(p) : !paidRow(p)));
  const total = paid.reduce((a, p) => a + (paidRow(p).month === mk ? Number(paidRow(p).amount || 0) : 0), 0);
  const noFee = players.filter((p) => !p.end_date && p.fee == null);

  const mark = (p) => act(async () => {
    await q(supabase.from('payments').insert({ coach_id: uid, player_id: p.id, month: mk, amount: p.fee }));
    await load('payments');
  }, `${p.name.split(' ')[0]}: ${p.fee_type === 'trimestral' ? 'trimestre de ' : ''}${period(p)} pagado.`);
  const unmark = (p) => act(async () => {
    const r = paidRow(p);
    await q(supabase.from('payments').delete().eq('id', r.id));
    await load('payments');
    toast('Pago desmarcado.', { undo: () => act(async () => { await q(supabase.from('payments').insert(r)); await load('payments'); }) });
  });

  return (
    <>
      <div className="pagehead">
        <div><h1>Pagos</h1><p>Control manual: marca quién ha pagado cada mes. El trimestral cubre 3 meses.</p></div>
        <span className={'chip ' + (paid.length === rows.length ? 'ok' : 'warn')}>{paid.length}/{rows.length} pagados · {money(total)}</span>
      </div>
      <div className="between">
        <Tabs tabs={[['todos', 'Todos'], ['pendientes', 'Pendientes'], ['pagados', 'Pagados']]} value={view} onChange={setView} />
        <div className="row">
          <button className="btn sm" aria-label="Mes anterior" onClick={() => setMk(shift(mk, -1))}>←</button>
          <b style={{ minWidth: 130, textAlign: 'center', textTransform: 'capitalize' }}>{monthName(mk)} {y}</b>
          <button className="btn sm" aria-label="Mes siguiente" onClick={() => setMk(shift(mk, 1))}>→</button>
        </div>
      </div>
      {list.length ? (
        <div className="panel tablewrap">
          <table>
            <thead><tr><th>Jugador</th><th>Plan</th><th>Importe</th><th>Compromiso</th><th style={{ textTransform: 'capitalize' }}>{monthName(mk)}</th><th></th></tr></thead>
            <tbody>{list.map((p) => {
              const r = paidRow(p);
              return (
                <tr key={p.id}>
                  <td><button className="btn ghost sm" style={{ padding: 0 }} onClick={() => go('clientes', p.id)}><b>{p.name}</b></button><Flag p={p} sm /></td>
                  <td>{p.plan || '—'}</td>
                  <td className="num">{feeText(p)}</td>
                  <td>{commitment(p, new Date(y, m - 1, 15)).text}</td>
                  <td>{r ? <button className="btn pri sm" aria-pressed="true" onClick={() => unmark(p)} title="Pulsa para desmarcar">{p.fee_type === 'trimestral' ? `Pagado · ${payCover(p, payments, mk).period}` : 'Pagado'}</button> : <button className="btn sm" onClick={() => mark(p)}>Marcar pagado</button>}</td>
                  <td>{!r && p.phone && <a className="wa" target="_blank" rel="noopener" href={waURL(p.phone, waText(p, 'pago', coach, period(p)))}><WAIcon /> Recordar</a>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      ) : <Empty>{rows.length ? 'Nadie en este filtro.' : 'Nadie con plan este mes. Asígnalo abajo, en «Sin plan asignado».'}</Empty>}
      {noFee.length > 0 && (
        <section className="panel stack">
          <div><h3>Sin plan asignado</h3><p className="muted small">Elige su plan y se pone solo el importe, el compromiso y las revisiones. Después aparece arriba para marcar el pago.</p></div>
          <ul className="list">{noFee.map((p) => (
            <li key={p.id}><span><b>{p.name}</b><Flag p={p} sm /> <span className="muted small">· {p.plan || 'sin plan'}</span></span><AssignPlan p={p} label="Asignar plan" /></li>
          ))}</ul>
        </section>
      )}
    </>
  );
}
