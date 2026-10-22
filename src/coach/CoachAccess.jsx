import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAction, useToast } from '../ui/ui.jsx';
import { fmtDate } from '../lib/util.js';

// Solo administradores: autorizar correos como entrenador y pasarles el acceso por WhatsApp
const APP_URL = /(^|\.)rendimo\.app$/.test(window.location.hostname) ? window.location.origin : 'https://rendimo.app';
export const coachInviteMsg = (email) =>
  `Hola! Te he dado acceso a Rendimo como entrenador/a. Entra aquí con este correo (${email}): ${APP_URL}\n\nAl entrar tendrás tu panel vacío, para crear tus clientes y mandarles la invitación desde la app. En Ajustes puedes poner tu marca, tu color y tu logo. Cualquier cosa me dices`;

const rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message.replace(/^.*?: /, ''));
  return data;
};

export function useIsAdmin() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => { supabase.rpc('is_platform_admin').then(({ data }) => setAdmin(data === true)); }, []);
  return admin;
}

function Share({ email }) {
  const toast = useToast();
  const msg = coachInviteMsg(email);
  const copy = async () => {
    try { await navigator.clipboard.writeText(msg); toast('Mensaje copiado. Pégalo en WhatsApp.'); }
    catch { window.prompt('Copia el mensaje:', msg); }
  };
  return (
    <span className="row">
      <a className="btn sm pri" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener">Enviar por WhatsApp</a>
      <button type="button" className="btn sm" onClick={copy}>Copiar mensaje</button>
    </span>
  );
}

function Revoke({ email, after }) {
  const act = useAction();
  const [sure, setSure] = useState(false);
  return sure
    ? <span className="row small">¿Quitar el acceso a {email}?<button type="button" className="btn sm danger" onClick={() => act(async () => { await rpc('revoke_coach', { mail: email }); after(); }, 'Autorización quitada.')}>Sí, quitar</button><button type="button" className="btn sm" onClick={() => setSure(false)}>No</button></span>
    : <button type="button" className="btn sm ghost" onClick={() => setSure(true)}>Quitar</button>;
}

export default function CoachAccess() {
  const act = useAction();
  const [list, setList] = useState(null);
  const [mail, setMail] = useState('');
  const [last, setLast] = useState(null);
  const reload = () => rpc('list_coach_access').then(setList).catch(() => setList([]));
  useEffect(() => { reload(); }, []);
  const submit = (e) => {
    e.preventDefault();
    act(async () => {
      const r = await rpc('authorize_coach', { mail });
      setLast(r); setMail(''); await reload();
    });
  };
  return (
    <div className="stack">
      <p className="muted small">Autoriza el correo y mándale el mensaje. Cuando entre en la app con ese correo, tendrá su propio panel de entrenador, separado del tuyo.</p>
      <form className="row" onSubmit={submit}>
        <input id="ca-mail" type="email" required placeholder="correo@ejemplo.com" autoComplete="off" style={{ flex: '1 1 220px' }} value={mail} onChange={(e) => setMail(e.target.value)} />
        <button className="btn pri" type="submit">Autorizar</button>
      </form>
      {last && (
        <div className="panel stack" role="status" style={{ background: 'var(--soft)' }}>
          <b>{last.existed ? `${last.email} ya estaba autorizado.` : `${last.email} autorizado como entrenador.`}</b>
          {last.joined && <span className="small">Ya tenía cuenta: la próxima vez que entre verá su panel de entrenador.</span>}
          {last.is_client && <span className="small">Este correo también es cliente: podrá cambiar entre su app de cliente y su panel de entrenador.</span>}
          <Share email={last.email} />
        </div>
      )}
      {list == null ? <span className="muted small">Cargando…</span> : list.length === 0 ? <span className="muted small">Aún no hay entrenadores autorizados.</span> : (
        <ul className="list" aria-label="Entrenadores autorizados">
          {list.map((c) => (
            <li key={c.email}>
              <span className="stack" style={{ gap: 2 }}>
                <b>{c.email}</b>
                <span className="muted small">{c.joined ? `Ha entrado${c.brand_name && c.brand_name !== 'Mi marca' ? ' · ' + c.brand_name : ''}` : 'Pendiente de entrar'} · autorizado el {fmtDate(c.created_at.slice(0, 10))}{c.is_admin ? ' · administrador' : ''}</span>
              </span>
              <span className="row">
                <span className={'pill ' + (c.joined ? 'ok' : 'warn')}>{c.joined ? 'Activo' : 'Pendiente'}</span>
                {!c.joined && <Share email={c.email} />}
                {!c.joined && <Revoke email={c.email} after={reload} />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
