import React, { useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase } from '../lib/supabase.js';
import { useAction } from '../ui/ui.jsx';
import { waURL } from '../lib/util.js';
import { WAIcon } from '../ui/ui.jsx';
import { deleteDue, fmtDue, DELETE_HOURS } from '../ui/SettingsKit.jsx';

const left = (at) => { const ms = deleteDue(at) - Date.now(); if (ms <= 0) return 'en breve'; const h = Math.floor(ms / 3600e3); return h >= 1 ? `en ${h} h` : `en ${Math.max(1, Math.round(ms / 60e3))} min`; };
export const pendingDeletions = (players) => players.filter((p) => p.delete_requested_at);

// Doble check: primero «Confirmar borrado», después «Sí, borrar ya»
function ConfirmButton({ p, after }) {
  const { load } = useCoach();
  const act = useAction();
  const [sure, setSure] = useState(false);
  const confirm = () => act(async () => {
    const { error } = await supabase.rpc('confirm_client_deletion', { pid: p.id });
    if (error) throw new Error(error.message);
    await load();
    after?.();
  }, `${p.name} y todos sus datos borrados.`);
  return sure
    ? <span className="row"><span className="small">¿Borrar ya a {p.name.split(' ')[0]} y todo su historial?</span><button className="btn sm danger" onClick={confirm}>Sí, borrar ya</button><button className="btn sm" onClick={() => setSure(false)}>No</button></span>
    : <button className="btn sm danger" onClick={() => setSure(true)}>Confirmar borrado</button>;
}

const Msg = ({ p, coach }) => p.phone && (
  <a className="wa" target="_blank" rel="noopener" href={waURL(p.phone, `Hola ${p.name.split(' ')[0]}, he visto que has pedido borrar tu cuenta de ${coach?.brand_short || coach?.brand_name || 'la app'}. Si es lo que quieres lo confirmo, pero si ha sido sin querer o quieres que lo hablemos me dices`)} aria-label={`WhatsApp a ${p.name}`}><WAIcon /> Escribir</a>
);

// En Inicio: todas las solicitudes
export function DeletionPanel() {
  const { players, coach, go } = useCoach();
  const list = pendingDeletions(players);
  if (!list.length) return null;
  return (
    <section className="panel stack delpanel" aria-label="Solicitudes de borrado">
      <div><h3>Solicitudes de borrado de cuenta</h3><p className="muted small">Confírmalas tú. Si no lo haces, se borran solas a las {DELETE_HOURS} horas de pedirlas (RGPD: derecho de supresión).</p></div>
      <ul className="list">{list.map((p) => (
        <li key={p.id}>
          <span><button className="btn ghost sm" style={{ padding: 0 }} onClick={() => go('clientes', p.id)}><b>{p.name}</b></button> <span className="muted small">· se borra solo {left(p.delete_requested_at)} ({fmtDue(deleteDue(p.delete_requested_at))})</span></span>
          <span className="row"><Msg p={p} coach={coach} /><ConfirmButton p={p} /></span>
        </li>
      ))}</ul>
    </section>
  );
}

// En la ficha del cliente
export function DeletionBanner({ p }) {
  const { coach, go } = useCoach();
  if (!p.delete_requested_at) return null;
  return (
    <div className="delbanner" role="status">
      <span><b>{p.name.split(' ')[0]} ha pedido borrar su cuenta.</b> Si no lo confirmas, se borra sola el {fmtDue(deleteDue(p.delete_requested_at))}.</span>
      <span className="row"><Msg p={p} coach={coach} /><ConfirmButton p={p} after={() => go('clientes')} /></span>
    </div>
  );
}
