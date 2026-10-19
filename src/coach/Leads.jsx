import React, { useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { iso, addDays, parseISO, waURL } from '../lib/util.js';
import { useAction, useToast, Tabs, Empty, WAIcon } from '../ui/ui.jsx';
import { LEAD_STAGES, DISCARD_REASONS, ago, planOptions, planDefaults, planPatch, PLANS, defaultPlan } from '../lib/domain.js';
import { pick, fill } from '../lib/messages.js';

const toLocal = (ts) => { if (!ts) return ''; const d = new Date(ts); const z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };

export default function Leads() {
  const { leads = [], coach, go } = useCoach();
  const [view, setView] = useState('activa');
  const [adding, setAdding] = useState(false);
  const n = (s) => leads.filter((l) => l.status === s).length;
  const closed = n('convertida') + n('descartada');
  const rate = closed ? Math.round((n('convertida') / closed) * 100) : null;
  const list = leads.filter((l) => l.status === view);
  const link = coach.slug ? `${window.location.origin}/#/s/${coach.slug}` : null;
  const toast = useToast();
  return (
    <>
      <div className="pagehead">
        <div><h1>Solicitudes</h1><p>Entran solas desde tu formulario público. También puedes añadirlas a mano (Instagram, boca a boca…).</p></div>
        <button className="btn pri" onClick={() => setAdding(!adding)}>+ Añadir solicitud</button>
      </div>
      <div className="panel row">
        {link ? (
          <>
            <span className="small">Tu formulario: <b>{link}</b></span>
            <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(link); toast('Enlace copiado. Ponlo en tu bio de Instagram o en tu web.'); }}>Copiar enlace</button>
            <a className="btn sm" href={link} target="_blank" rel="noopener">Ver formulario</a>
          </>
        ) : <span className="small">Para recibir solicitudes solas, elige tu dirección pública en <button className="btn sm" onClick={() => go('ajustes')}>Marca y cuenta</button></span>}
      </div>
      <div className="board four">
        <div className="tile t-p" style={{ minHeight: 0 }}><h3>En curso</h3><div className="big num">{n('activa')}</div></div>
        <div className="tile t-g" style={{ minHeight: 0 }}><h3>Convertidas en cliente</h3><div className="big num">{n('convertida')}</div></div>
        <div className="tile t-s" style={{ minHeight: 0 }}><h3>Descartadas</h3><div className="big num">{n('descartada')}</div></div>
        <div className="tile t-b" style={{ minHeight: 0 }}><h3>Tasa de conversión</h3><div className="big num">{rate == null ? '—' : `${rate} %`}</div><div className="sub">de las solicitudes cerradas</div></div>
      </div>
      {adding && <NewLead onDone={() => { setAdding(false); setView('activa'); }} />}
      <Tabs tabs={[['activa', 'En curso'], ['convertida', 'Convertidas'], ['descartada', 'Descartadas']]} value={view} onChange={setView} />
      {list.length ? <div className="board">{list.map((l) => <LeadCard key={l.id} l={l} />)}</div>
        : <Empty>{view === 'activa' ? 'Ninguna solicitud en curso.' : 'Nada por aquí todavía.'}</Empty>}
    </>
  );
}

function NewLead({ onDone }) {
  const { uid, load } = useCoach();
  const act = useAction();
  const [f, setF] = useState({ name: '', phone: '', email: '', position: '', plan: defaultPlan().name, goal: '', injuries: '', message: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      await q(supabase.from('leads').insert({ coach_id: uid, ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null])), email: f.email.trim().toLowerCase() || null }));
      await load('leads');
      onDone();
    }, 'Solicitud añadida.');
  };
  return (
    <form className="panel stack" onSubmit={save}>
      <h3>Nueva solicitud</h3>
      <div className="grid3">
        <label className="f">Nombre<input id="ld-name" required value={f.name} onChange={set('name')} /></label>
        <label className="f">WhatsApp<input id="ld-phone" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="34600111222" /></label>
        <label className="f">Correo<input type="email" value={f.email} onChange={set('email')} /></label>
        <label className="f">Posición o deporte<input value={f.position} onChange={set('position')} /></label>
        <label className="f">Plan que le interesa<select value={f.plan} onChange={set('plan')}>{planOptions().map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="f">Objetivo<input value={f.goal} onChange={set('goal')} /></label>
      </div>
      <label className="f">Lesiones<input value={f.injuries} onChange={set('injuries')} /></label>
      <div className="row"><button className="btn pri" type="submit">Guardar</button><button type="button" className="btn" onClick={onDone}>Cancelar</button></div>
    </form>
  );
}

function LeadCard({ l }) {
  const { uid, load, go, coach, players } = useCoach();
  const act = useAction();
  const [discard, setDiscard] = useState(false);
  const [reason, setReason] = useState(DISCARD_REASONS[0]);
  const [email, setEmail] = useState(l.email || '');
  const upd = (patch, msg) => act(async () => { await q(supabase.from('leads').update(patch).eq('id', l.id)); await load('leads'); }, msg);
  const stage = l.stage || 0;
  const first = l.name.split(' ')[0];
  const intro = fill(pick(stage >= 1 && !l.call_at ? 'solicitud_seguimiento' : 'solicitud', l.id), { nombre: first, coach: coach.brand_short || coach.brand_name, plan: l.plan && l.plan !== 'Aún no lo sé' ? ` para ${l.plan}` : '' });
  const convert = () => act(async () => {
    const mail = email.trim().toLowerCase();
    const d = planDefaults(l.plan);
    const today = iso();
    const row = await q(supabase.from('players').insert({
      coach_id: uid, name: l.name, email: mail || null, phone: l.phone, position: l.position, objective: l.goal, start_date: today,
      ...planPatch(l.plan || defaultPlan().name), next_review: d?.review === null ? null : iso(addDays(parseISO(today), d?.review || 14)),
    }).select().single());
    const txt = [l.goal && `Objetivo: ${l.goal}`, l.injuries && `Lesiones: ${l.injuries}`, l.message && `Mensaje: ${l.message}`].filter(Boolean).join(' · ');
    await q(supabase.from('evolution').insert({ coach_id: uid, player_id: row.id, category: 'valor', text: `Alta desde solicitud.${txt ? ' ' + txt : ''}` }));
    await q(supabase.from('leads').update({ status: 'convertida', stage: 4, player_id: row.id, email: mail || null }).eq('id', l.id));
    await load(['players', 'leads', 'evolution']);
    go('clientes', row.id);
  }, 'Cliente creado. Envíale el acceso por WhatsApp desde su ficha.');
  const player = players.find((p) => p.id === l.player_id);
  return (
    <article className="leadcard">
      <div className="small" style={{ fontFamily: 'var(--display)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{ago(l.created_at)}</div>
      <h3>{l.name}</h3>
      {l.status === 'activa' && (
        <div className="steps" role="group" aria-label="Paso">
          {['1. Contactar', '2. Videollamada', '3. Alta'].map((s, i) => {
            const cur = stage <= 0 ? 0 : stage <= 2 ? 1 : 2;
            return <button key={s} type="button" aria-pressed={i === cur} title={['Nueva: escríbele', 'Contactado o videollamada agendada', 'Videollamada hecha: crea el cliente'][i]} onClick={() => upd({ stage: [0, 1, 3][i] })}>{s}</button>;
          })}
        </div>
      )}
      <dl>
        {l.phone && <><dt>Teléfono</dt><dd>{l.phone}</dd></>}
        {l.email && <><dt>Correo</dt><dd style={{ wordBreak: 'break-all' }}>{l.email}</dd></>}
        <dt>Posición o deporte</dt><dd>{l.position || '—'}</dd>
        <dt>Plan</dt><dd>{l.plan || '—'}</dd>
        <dt>Objetivo</dt><dd>{l.goal || '—'}</dd>
        <dt>Lesiones</dt><dd>{l.injuries || '—'}</dd>
        {l.message && <><dt>Mensaje</dt><dd>{l.message}</dd></>}
      </dl>
      {l.status === 'activa' && (
        <>
          {l.phone && <a className="btn" target="_blank" rel="noopener" href={waURL(l.phone, intro)} onClick={() => !stage && upd({ stage: 1 })}><WAIcon /> Escribir por WhatsApp</a>}
          <label className="f" style={{ color: '#fff' }}>Videollamada<input aria-label="Fecha de la videollamada" type="datetime-local" value={toLocal(l.call_at)} onChange={(e) => upd({ call_at: e.target.value ? new Date(e.target.value).toISOString() : null, stage: e.target.value ? Math.max(stage, 2) : stage }, e.target.value ? 'Videollamada agendada.' : null)} /></label>
          <label className="f" style={{ color: '#fff' }}>Estado<select aria-label="Estado" value={Math.min(stage, 3)} onChange={(e) => upd({ stage: Number(e.target.value) })}>{LEAD_STAGES.map((s, i) => <option key={s} value={i}>{s}</option>)}</select></label>
          {stage >= 3 && !l.email && <label className="f" style={{ color: '#fff' }}>Correo para su acceso (opcional)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>}
          <button className="btn pri" disabled={stage < 3} onClick={convert} title={stage < 3 ? 'Primero marca la videollamada como hecha' : ''}>Crear cliente e invitar</button>
          {discard ? (
            <div className="row">
              <select aria-label="Motivo" style={{ width: 'auto' }} value={reason} onChange={(e) => setReason(e.target.value)}>{DISCARD_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
              <button className="btn" onClick={() => upd({ status: 'descartada', message: `${l.message ? l.message + '\n' : ''}Descartada: ${reason}` }, 'Solicitud descartada.')}>Descartar</button>
              <button className="btn" onClick={() => setDiscard(false)}>Cancelar</button>
            </div>
          ) : <button className="btn" onClick={() => setDiscard(true)}>Descartar</button>}
        </>
      )}
      {l.status === 'convertida' && (player ? <button className="btn pri" onClick={() => go('clientes', player.id)}>Ver ficha</button> : <span className="small">Cliente creado</span>)}
      {l.status !== 'activa' && <button className="btn" onClick={() => upd({ status: 'activa', stage: l.status === 'convertida' ? 3 : stage }, 'Solicitud reabierta.')}>Reabrir</button>}
    </article>
  );
}
