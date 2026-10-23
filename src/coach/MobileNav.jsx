import React from 'react';
import { useCoach } from './CoachApp.jsx';
import { ThemePicker, Group, Row, LegalRows, AppVersion } from '../ui/SettingsKit.jsx';

// Barra inferior del entrenador en el móvil: 4 secciones + «Inicio» en el centro y «Más» con el resto
const MAIN = [['agenda', 'Agenda'], ['clientes', 'Clientes'], ['inicio', 'Inicio'], ['programacion', 'Programa']];
const MORE = [['solicitudes', 'Solicitudes'], ['pagos', 'Pagos'], ['planes', 'Planes'], ['biblioteca', 'Biblioteca'], ['formacion', 'Formación'], ['ayuda', 'Ayuda'], ['admin', 'Administración'], ['ajustes', 'Ajustes']];

function Icon({ k }) {
  const p = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (k) {
    case 'inicio': return <svg {...p} width={26} height={26}><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></svg>;
    case 'agenda': return <svg {...p}><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>;
    case 'clientes': return <svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M16 4.8a3.3 3.3 0 0 1 0 6.4M18.5 14.8c1.6.8 2.6 2.6 3 5.2" /></svg>;
    case 'programacion': return <svg {...p}><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /></svg>;
    case 'solicitudes': return <svg {...p}><path d="M4 4h16v12H8l-4 4Z" /><path d="M8.5 9h7M8.5 12h4" /></svg>;
    case 'pagos': return <svg {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" /><path d="M2.5 10h19M6.5 15h3" /></svg>;
    case 'planes': return <svg {...p}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>;
    case 'biblioteca': return <svg {...p}><path d="M4 19.5V5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2Zm0 0A2 2 0 0 0 6 21.5h13" /><path d="M9 7.5h6" /></svg>;
    case 'ajustes': return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>;
    default: return <svg {...p}><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></svg>;
  }
}

export function MobileNav({ route, go, badge }) {
  const inMore = route.page === 'mas' || MORE.some(([k]) => k === route.page);
  const moreBadge = MORE.reduce((a, [k]) => a + (badge[k] || 0), 0);
  return (
    <nav className="cnav" aria-label="Secciones">
      {MAIN.map(([k, l]) => (
        <button key={k} type="button" className={k === 'inicio' ? 'mid' : ''} aria-current={route.page === k ? 'page' : undefined} onClick={() => go(k)}>
          <span className="ic"><Icon k={k} />{badge[k] ? <span className="nb">{badge[k]}</span> : null}</span><span className="lbl">{l}</span>
        </button>
      ))}
      <button type="button" aria-current={inMore ? 'page' : undefined} onClick={() => go('mas')}>
        <span className="ic"><Icon k="mas" />{moreBadge > 0 && route.page !== 'mas' ? <span className="nb">{moreBadge}</span> : null}</span><span className="lbl">Más</span>
      </button>
    </nav>
  );
}

// Pantalla «Más»: el resto de secciones y los ajustes, agrupados como en los ajustes del móvil
export function CoachMenu() {
  const { go, leads = [], session, onLogout, canSwitch, onSwitch, isAdmin, requests = [], publicExercises = [], docs = [] } = useCoach();
  const newLeads = leads.filter((l) => l.status === 'activa' && !l.stage).length;
  const replies = requests.filter((r) => r.author_id === session.user.id && !r.author_seen).length;
  const pending = publicExercises.filter((x) => x.status === 'pendiente').length + docs.filter((x) => x.status === 'pendiente').length + requests.filter((x) => x.status === 'abierta').length;
  return (
    <div className="setpage">
      <div className="pagehead"><div><h1>Más</h1></div></div>
      <ThemePicker />
      <Group title="Gestión">
        <Row icon="inbox" label="Solicitudes" badge={newLeads} onClick={() => go('solicitudes')} />
        <Row icon="card" label="Pagos" onClick={() => go('pagos')} />
        <Row icon="tag" label="Planes" onClick={() => go('planes')} />
        <Row icon="book" label="Biblioteca" onClick={() => go('biblioteca')} />
      </Group>
      <Group title="Aprende y pide">
        <Row icon="file" label="Formación" sub="Manual de uso y documentos compartidos" onClick={() => go('formacion')} />
        <Row icon="chat" label="Ayuda y peticiones" sub="Dudas, mejoras o algo que no funciona" badge={replies} onClick={() => go('ayuda')} />
      </Group>
      {isAdmin && (
        <Group title="Administración">
          <Row icon="shield" label="Administración" sub="Peticiones, aprobaciones y entrenadores" badge={pending} onClick={() => go('admin')} />
        </Group>
      )}
      <Group title="Lo tuyo">
        <Row icon="palette" label="Marca y mensajes" sub="Nombre, logo, color, formulario y WhatsApp" onClick={() => go('ajustes')} />
        <Row icon="lock" label="Seguridad" sub="Contraseña" onClick={() => go('ajustes', 'seguridad')} />
        {canSwitch && <Row icon="swap" label="Ver mi app de cliente" onClick={onSwitch} />}
      </Group>
      <Group title="Legal">
        <LegalRows extra={<Row icon="trash" label="Borrar mi cuenta" danger onClick={() => go('ajustes', 'borrar')} />} />
      </Group>
      <Group title="Sesión">
        <Row icon="logout" label="Cerrar sesión" danger onClick={onLogout} />
      </Group>
      <AppVersion email={session.user.email} />
    </div>
  );
}
