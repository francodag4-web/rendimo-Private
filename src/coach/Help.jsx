import React, { useEffect, useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase } from '../lib/supabase.js';
import { fmtDateTime } from '../lib/util.js';
import { useAction, Empty } from '../ui/ui.jsx';

// Peticiones, dudas y sugerencias al equipo de Rendimo (los administradores)
export const REQ_KINDS = [['duda', 'Duda'], ['mejora', 'Petición de mejora'], ['error', 'Algo no funciona'], ['otro', 'Otro']];
export const REQ_STATUS = { abierta: ['Enviada', 'warn'], respondida: ['Respondida', 'ok'], cerrada: ['Cerrada', ''] };
export const kindLabel = (k) => REQ_KINDS.find((x) => x[0] === k)?.[1] || k;

export default function Help() {
  const { requests = [], uid, load } = useCoach();
  const act = useAction();
  const mine = requests.filter((r) => r.author_id === uid);
  const unseen = mine.some((r) => !r.author_seen);
  // Al entrar, las respuestas nuevas quedan leídas (se resaltan esta vez)
  const [fresh] = useState(() => new Set(mine.filter((r) => !r.author_seen).map((r) => r.id)));
  useEffect(() => { if (unseen) supabase.rpc('mark_requests_seen').then(() => load('requests')); }, [unseen]);
  const [f, setF] = useState({ kind: 'duda', subject: '', message: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const send = (e) => {
    e.preventDefault();
    act(async () => {
      const r = await supabase.from('support_requests').insert({ kind: f.kind, subject: f.subject.trim(), message: f.message.trim() });
      if (r.error) throw new Error(r.error.message);
      setF({ kind: 'duda', subject: '', message: '' });
      await load('requests');
    }, 'Enviado. Te respondemos aquí mismo.');
  };
  return (
    <>
      <div className="pagehead"><div><h1>Ayuda y peticiones</h1><p>Escribe al equipo de Rendimo: dudas, mejoras que te gustaría ver o algo que no funciona. La respuesta te llega aquí.</p></div></div>
      <div className="grid2">
        <form className="panel stack" onSubmit={send} aria-label="Nueva petición">
          <h3>Nueva petición</h3>
          <label className="f">Tipo<select id="req-kind" value={f.kind} onChange={set('kind')}>{REQ_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="f">Asunto<input id="req-subject" required maxLength={140} value={f.subject} onChange={set('subject')} placeholder={f.kind === 'mejora' ? 'Ej. Poder duplicar un cliente' : f.kind === 'error' ? 'Ej. No me deja guardar un test' : 'Ej. ¿Cómo cambio el inicio de un programa?'} /></label>
          <label className="f">Mensaje<textarea id="req-msg" required maxLength={4000} rows={6} value={f.message} onChange={set('message')} placeholder={f.kind === 'error' ? 'Qué estabas haciendo, qué esperabas y qué pasó. Si puedes, desde qué móvil u ordenador.' : 'Cuéntanoslo con el detalle que quieras.'} /></label>
          <div className="row"><button className="btn pri" type="submit">Enviar</button></div>
        </form>
        <section className="panel stack">
          <h3>Antes de escribir</h3>
          <p className="muted">Muchas dudas están resueltas en el manual de uso, con capturas y preguntas frecuentes.</p>
          <div className="row"><a className="btn" href="/formacion/manual-rendimo.pdf" target="_blank" rel="noopener">Abrir el manual</a></div>
          <p className="muted small">Si algo no funciona, una captura de pantalla ayuda mucho: súbela a Drive o similar y pega el enlace en el mensaje.</p>
        </section>
      </div>
      <section className="panel stack">
        <h3>Tus peticiones</h3>
        {mine.length ? (
          <ul className="list reqlist">{mine.map((r) => (
            <li key={r.id} className={fresh.has(r.id) ? 'fresh' : ''}>
              <div className="stack" style={{ gap: 4, width: '100%' }}>
                <div className="between"><b>{r.subject}</b><span className={'pill ' + REQ_STATUS[r.status][1]}>{fresh.has(r.id) ? 'Respuesta nueva' : REQ_STATUS[r.status][0]}</span></div>
                <span className="muted small">{kindLabel(r.kind)} · {fmtDateTime(r.created_at)}</span>
                <p className="small" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{r.message}</p>
                {r.reply && <div className="reply"><span className="small"><b>Respuesta de Rendimo</b> · {fmtDateTime(r.replied_at)}</span><p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{r.reply}</p></div>}
              </div>
            </li>
          ))}</ul>
        ) : <Empty>Aún no has enviado ninguna.</Empty>}
      </section>
    </>
  );
}
