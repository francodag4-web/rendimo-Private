import React, { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAction } from './ui.jsx';

// ---------- Tema: Automático / Claro / Oscuro (se guarda en este dispositivo) ----------
export const getTheme = () => { try { const t = localStorage.getItem('theme'); return t === 'light' || t === 'dark' ? t : 'auto'; } catch { return 'auto'; } };
export function setTheme(t) {
  try { t === 'auto' ? localStorage.removeItem('theme') : localStorage.setItem('theme', t); } catch {}
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
}

export function ThemePicker() {
  const [t, setT] = useState(getTheme);
  const pick = (v) => { setTheme(v); setT(v); };
  return (
    <div className="themepick" role="radiogroup" aria-label="Tema">
      {[['auto', 'Automático', 'monitor'], ['light', 'Claro', 'sun'], ['dark', 'Oscuro', 'moon']].map(([k, l, ic]) => (
        <button key={k} type="button" role="radio" aria-checked={t === k} onClick={() => pick(k)}><Ico k={ic} /> {l}</button>
      ))}
    </div>
  );
}

// ---------- Lista agrupada estilo ajustes del móvil ----------
export function Group({ title, children }) {
  return (
    <section className="setgroup">
      {title && <h4>{title}</h4>}
      <div className="setlist">{children}</div>
    </section>
  );
}

// Fila: con onClick/href navega; con children se despliega dentro
export function Row({ icon, label, sub, onClick, href, badge, danger, children, defaultOpen = false, id }) {
  const [open, setOpen] = useState(defaultOpen);
  const inner = (
    <>
      <span className="sic"><Ico k={icon} /></span>
      <span className="slbl">{label}{sub && <span className="muted small">{sub}</span>}</span>
      {badge ? <span className="sbadge">{badge}</span> : null}
      <span className={'schev' + (children && open ? ' open' : '')} aria-hidden="true"><Ico k="chev" /></span>
    </>
  );
  const cls = 'srow' + (danger ? ' danger' : '');
  return (
    <div className="sitem" id={id}>
      {href ? <a className={cls} href={href} target={/^https?:/.test(href) ? '_blank' : undefined} rel="noopener">{inner}</a>
        : <button type="button" className={cls} aria-expanded={children ? open : undefined} onClick={children ? () => setOpen(!open) : onClick}>{inner}</button>}
      {children && open && <div className="sbody">{children}</div>}
    </div>
  );
}

// ---------- Seguridad: crear o cambiar contraseña ----------
// Si el proyecto pide confirmar la identidad, manda un código al correo y lo pide antes de guardar.
export function PasswordForm({ session }) {
  const act = useAction();
  const [hasPw, setHasPw] = useState(!!session?.user?.user_metadata?.has_password);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [code, setCode] = useState(null); // null = no hace falta; '' = esperando código
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      if (pw !== pw2) throw new Error('Las dos contraseñas no coinciden.');
      const { error } = await supabase.auth.updateUser({ password: pw, data: { has_password: true }, ...(code ? { nonce: code.trim() } : {}) });
      if (error && /reauthentication|nonce/i.test(error.message) && code === null) {
        const r = await supabase.auth.reauthenticate();
        if (r.error) throw r.error;
        setCode('');
        throw new Error('Por seguridad te hemos enviado un código al correo. Escríbelo y vuelve a pulsar Guardar.');
      }
      if (error) throw new Error(/different from the old/i.test(error.message) ? 'La nueva contraseña tiene que ser distinta de la anterior.' : /weak|short|least/i.test(error.message) ? 'La contraseña es demasiado débil: usa al menos 8 caracteres.' : error.message);
      setPw(''); setPw2(''); setCode(null); setHasPw(true);
    }, 'Contraseña guardada. Ya puedes entrar con ella.');
  };
  return (
    <form className="stack" style={{ gap: 8 }} onSubmit={save}>
      <p className="muted small">{hasPw ? 'Tienes contraseña. Puedes entrar con ella o con el enlace por correo.' : 'Ahora entras con un enlace por correo. Crea una contraseña para entrar más rápido.'}</p>
      <input id="pw-new" type="password" minLength={8} required autoComplete="new-password" placeholder="Nueva contraseña (mínimo 8 caracteres)" value={pw} onChange={(e) => setPw(e.target.value)} />
      <input id="pw-rep" type="password" minLength={8} required autoComplete="new-password" placeholder="Repite la contraseña" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      {code !== null && <input id="pw-code" inputMode="numeric" required placeholder="Código que te ha llegado al correo" value={code} onChange={(e) => setCode(e.target.value)} />}
      <div className="row"><button className="btn pri" type="submit">{hasPw ? 'Cambiar contraseña' : 'Crear contraseña'}</button></div>
    </form>
  );
}

// ---------- Borrar mi cuenta ----------
export function DeleteAccount({ coach, onDone }) {
  const act = useAction();
  const [txt, setTxt] = useState('');
  const ok = txt.trim().toUpperCase() === 'BORRAR';
  const del = () => act(async () => {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw new Error(/function|schema cache/i.test(error.message) ? 'El borrado aún no está activado en el servidor. Escribe a tu entrenador.' : error.message);
    try { localStorage.clear(); } catch {}
    await supabase.auth.signOut();
    onDone?.();
  });
  return (
    <div className="stack" style={{ gap: 8 }}>
      <p className="small">{coach
        ? 'Se borra tu cuenta de entrenador con tu marca, tus clientes, sus programas, registros y pagos. Tus clientes perderán el acceso. No se puede deshacer.'
        : 'Se borran tu cuenta y todos tus datos: check-ins, sesiones, tests, lesiones y notas. Tu entrenador dejará de verlos. No se puede deshacer.'}</p>
      <label className="f">Escribe BORRAR para confirmar<input id="del-confirm" autoComplete="off" value={txt} onChange={(e) => setTxt(e.target.value)} /></label>
      <div className="row"><button type="button" className="btn danger" disabled={!ok} onClick={del}>Borrar mi cuenta para siempre</button></div>
    </div>
  );
}

// ---------- Legal y versión ----------
export function LegalRows({ extra }) {
  return (
    <>
      <Row icon="shield" label="Política de privacidad" href="#/legal/privacidad" />
      <Row icon="file" label="Condiciones de uso" href="#/legal/condiciones" />
      <Row icon="info" label="Aviso legal" href="#/legal/aviso" />
      {extra}
    </>
  );
}

/* global __APP_VERSION__, __APP_BUILD__ */
export const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
export const BUILD = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : '';
export const AppVersion = ({ email }) => (
  <p className="muted small appver">{email ? <>{email} · </> : null}Rendimo {VERSION}{BUILD ? ` · ${BUILD}` : ''}</p>
);

// ---------- Iconos (trazo, 24 px) ----------
const P = {
  monitor: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  lock: <><rect x="4" y="10.5" width="16" height="10.5" rx="2.5" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>,
  shield: <path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6Z" />,
  file: <><path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8Z" /><path d="M14 3v5h5M8.5 13h7M8.5 16.5h5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.5" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  logout: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" /></>,
  swap: <><path d="M4 8h13l-3-3M20 16H7l3 3" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.5-1.5-1.8-1.5-3s1-2 2.5-2H18a3 3 0 0 0 3-3c0-4.4-4-8-9-8Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7" r="1" /></>,
  chat: <path d="M4 5h16v11H9l-5 4Z" />,
  data: <><ellipse cx="12" cy="5.5" rx="7.5" ry="2.5" /><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5" /></>,
  download: <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" /></>,
  inbox: <><path d="M4 4h16v12H8l-4 4Z" /><path d="M8.5 9h7M8.5 12h4" /></>,
  card: <><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" /><path d="M2.5 10h19M6.5 15h3" /></>,
  tag: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
  book: <><path d="M4 19.5V5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2Zm0 0A2 2 0 0 0 6 21.5h13" /><path d="M9 7.5h6" /></>,
  ig: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r=".8" fill="currentColor" /></>,
  chev: <path d="m9 6 6 6-6 6" />,
};
export function Ico({ k }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[k] || P.info}</svg>;
}
