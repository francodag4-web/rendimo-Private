import React, { useEffect, useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { fmtDate, fmtDateTime } from '../lib/util.js';
import { useAction, Tabs, Empty } from '../ui/ui.jsx';
import CoachAccess from './CoachAccess.jsx';
import { DocCard, docUrl } from './Training.jsx';
import { kindLabel, REQ_STATUS } from './Help.jsx';

// Administración de la plataforma (solo administradores)
export const adminCounts = (d) => {
  const ex = (d.publicExercises || []).filter((x) => x.status === 'pendiente').length;
  const docs = (d.docs || []).filter((x) => x.status === 'pendiente').length;
  const req = (d.requests || []).filter((x) => x.status === 'abierta').length;
  return { ex, docs, req, total: ex + docs + req };
};
const TABS = [['peticiones', 'Peticiones'], ['ejercicios', 'Ejercicios'], ['formacion', 'Formación'], ['entrenadores', 'Entrenadores']];

export default function Admin() {
  const ctx = useCoach();
  const c = adminCounts(ctx);
  const [tab, setTab] = useState(TABS.some(([k]) => k === ctx.route.id) ? ctx.route.id : 'peticiones');
  useEffect(() => { if (TABS.some(([k]) => k === ctx.route.id)) setTab(ctx.route.id); }, [ctx.route.id]);
  const label = { peticiones: c.req, ejercicios: c.ex, formacion: c.docs };
  return (
    <>
      <div className="pagehead"><div><h1>Administración</h1><p>Solo la ves tú: peticiones de los entrenadores, ejercicios y documentos pendientes de aprobar, y acceso de entrenadores.</p></div></div>
      <Tabs tabs={TABS.map(([k, l]) => [k, label[k] ? `${l} (${label[k]})` : l])} value={tab} onChange={setTab} />
      {tab === 'peticiones' && <Requests />}
      {tab === 'ejercicios' && <Exercises />}
      {tab === 'formacion' && <Docs />}
      {tab === 'entrenadores' && <section className="panel stack"><h3>Autorizar entrenadores</h3><CoachAccess /></section>}
    </>
  );
}

const Author = ({ r }) => <span className="muted small">{r.author_name || 'Sin marca'}{r.author_email ? ` · ${r.author_email}` : ''} · {fmtDateTime(r.created_at)}</span>;

function Requests() {
  const { requests = [], load } = useCoach();
  const [show, setShow] = useState('abierta');
  const list = requests.filter((r) => show === 'todas' || r.status === show);
  return (
    <section className="panel stack">
      <Tabs tabs={[['abierta', `Sin responder (${requests.filter((r) => r.status === 'abierta').length})`], ['respondida', 'Respondidas'], ['todas', 'Todas']]} value={show} onChange={setShow} />
      {list.length ? <ul className="list reqlist">{list.map((r) => <RequestItem key={r.id} r={r} reload={() => load('requests')} />)}</ul> : <Empty>No hay peticiones aquí.</Empty>}
    </section>
  );
}
function RequestItem({ r, reload }) {
  const act = useAction();
  const [txt, setTxt] = useState('');
  const answer = (status, msg) => act(async () => {
    const { error } = await supabase.rpc('answer_request', { rid: r.id, answer: txt, new_status: status });
    if (error) throw new Error(error.message);
    setTxt(''); await reload();
  }, msg);
  return (
    <li aria-label={r.subject}>
      <div className="stack" style={{ gap: 4, width: '100%' }}>
        <div className="between"><b>{r.subject}</b><span className="row"><span className="pill">{kindLabel(r.kind)}</span><span className={'pill ' + REQ_STATUS[r.status][1]}>{REQ_STATUS[r.status][0]}</span></span></div>
        <Author r={r} />
        <p className="small" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{r.message}</p>
        {r.reply && <div className="reply"><span className="small"><b>Tu respuesta</b> · {fmtDateTime(r.replied_at)}</span><p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{r.reply}</p></div>}
        <textarea aria-label="Respuesta" rows={3} placeholder={r.reply ? 'Añadir otra respuesta (sustituye la anterior)' : 'Escribe tu respuesta'} value={txt} onChange={(e) => setTxt(e.target.value)} />
        <div className="row">
          <button className="btn sm pri" disabled={!txt.trim()} onClick={() => answer('respondida', 'Respuesta enviada. Le aparece en Ayuda y peticiones.')}>Responder</button>
          {r.status !== 'cerrada' ? <button className="btn sm" onClick={() => answer('cerrada', 'Petición cerrada.')}>Cerrar</button> : <button className="btn sm" onClick={() => answer('abierta', 'Petición reabierta.')}>Reabrir</button>}
          {r.status !== 'abierta' && <button className="btn sm ghost danger" onClick={() => act(async () => { await q(supabase.from('support_requests').delete().eq('id', r.id)); await reload(); }, 'Petición eliminada.')}>Eliminar</button>}
        </div>
      </div>
    </li>
  );
}

function Review({ onApprove, onReject, approveLabel = 'Aprobar' }) {
  const [rej, setRej] = useState(null);
  return rej == null
    ? <span className="row"><button className="btn sm pri" onClick={onApprove}>{approveLabel}</button><button className="btn sm" onClick={() => setRej('')}>Rechazar</button></span>
    : <span className="row"><input aria-label="Motivo" style={{ minWidth: 200 }} placeholder="Motivo (lo verá el autor)" value={rej} onChange={(e) => setRej(e.target.value)} /><button className="btn sm danger" onClick={() => onReject(rej)}>Rechazar</button><button className="btn sm" onClick={() => setRej(null)}>Cancelar</button></span>;
}

function Exercises() {
  const { publicExercises = [], load } = useCoach();
  const act = useAction();
  const pend = publicExercises.filter((x) => x.status === 'pendiente');
  const ok = publicExercises.filter((x) => x.status === 'aprobado');
  const [showOk, setShowOk] = useState(false);
  const setStatus = (x, status, review_note = null) => act(async () => {
    const { error } = await supabase.from('public_exercises').update({ status, review_note: review_note || null, reviewed_at: new Date().toISOString() }).eq('id', x.id);
    if (error) throw new Error(/public_exercises_name_ok|duplicate/.test(error.message) ? `Ya hay un ejercicio público llamado «${x.name}».` : error.message);
    await load('publicExercises');
  }, status === 'aprobado' ? `«${x.name}» ya está en la biblioteca pública.` : 'Rechazado. El autor lo ve en su biblioteca.');
  const remove = (x) => act(async () => { await q(supabase.from('public_exercises').delete().eq('id', x.id)); await load('publicExercises'); }, `«${x.name}» retirado de la biblioteca pública. Quien ya lo añadió lo conserva.`);
  const Row = ({ x, children }) => (
    <li aria-label={x.name}>
      <span className="stack" style={{ gap: 2 }}>
        <b>{x.name}</b>
        <span className="small">{x.type} · <b>{x.primary_muscle || 'sin músculo'}</b>{x.secondary?.length ? ' · ' + x.secondary.join(', ') : ''}{x.category ? ` · ${x.category}` : ''}</span>
        {x.notes && <span className="muted small clamp">{x.notes}</span>}
        <span className="row small">{x.video_url ? <a href={x.video_url} target="_blank" rel="noopener">▶ Ver vídeo</a> : <span className="muted">Sin vídeo</span>}<Author r={x} /></span>
      </span>
      {children}
    </li>
  );
  return (
    <section className="panel stack">
      <h3>Pendientes de revisar ({pend.length})</h3>
      {pend.length ? <ul className="list">{pend.map((x) => <Row key={x.id} x={x}><Review onApprove={() => setStatus(x, 'aprobado')} onReject={(n) => setStatus(x, 'rechazado', n)} approveLabel="Publicar" /></Row>)}</ul> : <Empty>No hay ejercicios pendientes.</Empty>}
      <button className="btn sm" style={{ alignSelf: 'flex-start' }} aria-expanded={showOk} onClick={() => setShowOk(!showOk)}>{showOk ? 'Ocultar' : 'Ver'} publicados ({ok.length})</button>
      {showOk && <ul className="list">{ok.map((x) => <Row key={x.id} x={x}><button className="btn sm" onClick={() => remove(x)}>Retirar</button></Row>)}</ul>}
    </section>
  );
}

function Docs() {
  const { docs = [], load } = useCoach();
  const act = useAction();
  const pend = docs.filter((x) => x.status === 'pendiente');
  const pub = docs.filter((x) => x.status === 'publicado');
  const setStatus = (d, status, review_note = null) => act(async () => {
    await q(supabase.from('training_docs').update({ status, review_note: review_note || null, reviewed_at: new Date().toISOString() }).eq('id', d.id));
    await load('docs');
  }, status === 'publicado' ? `«${d.title}» publicado en Formación.` : 'Rechazado. El autor lo ve en Mis aportaciones.');
  const remove = (d) => act(async () => {
    await q(supabase.from('training_docs').delete().eq('id', d.id));
    if (d.file_path) await supabase.storage.from('formacion').remove([d.file_path]);
    await load('docs');
  }, `«${d.title}» retirado de Formación.`);
  return (
    <section className="panel stack">
      <h3>Pendientes de revisar ({pend.length})</h3>
      {pend.length ? <div className="docgrid">{pend.map((d) => (
        <DocCard key={d.id} d={d}><a className="btn sm" href={docUrl(d)} target="_blank" rel="noopener">Abrir</a><Review onApprove={() => setStatus(d, 'publicado')} onReject={(n) => setStatus(d, 'rechazado', n)} approveLabel="Publicar" /></DocCard>
      ))}</div> : <Empty>No hay documentos pendientes.</Empty>}
      <h3>Publicados ({pub.length})</h3>
      {pub.length ? <ul className="list">{pub.map((d) => (
        <li key={d.id}><span className="stack" style={{ gap: 2 }}><b>{d.title}</b><span className="muted small">{d.category} · {d.author_name || 'Rendimo'} · {fmtDate(d.created_at)}</span></span>
          <span className="row"><a className="btn sm" href={docUrl(d)} target="_blank" rel="noopener">Abrir</a><button className="btn sm" onClick={() => remove(d)}>Retirar</button></span></li>
      ))}</ul> : <Empty>Aún no hay documentos publicados. Puedes publicar directamente desde Formación.</Empty>}
    </section>
  );
}
