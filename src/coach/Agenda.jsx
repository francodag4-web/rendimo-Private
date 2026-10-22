import React, { useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { iso, addDays, mondayOf, DAYS, DAYS_SHORT, MONTHS, fmtDateTime } from '../lib/util.js';
import { useAction, useToast, Empty } from '../ui/ui.jsx';

export default function Agenda() {
  const { tasks, notes, players, uid, load, go, alertActions = [], leads = [] } = useCoach();
  const act = useAction();
  const toast = useToast();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState(iso());
  const [form, setForm] = useState(null);
  const pname = (id) => players.find((p) => p.id === id)?.name;

  // Eventos por día: tareas + notas con aviso
  const events = {};
  const add = (day, ev) => (events[day] = events[day] || []).push(ev);
  tasks.forEach((t) => add(iso(t.due_at), { kind: 'task', id: t.id, title: t.title, done: t.done, at: t.due_at, player: t.player_id, raw: t }));
  notes.filter((n) => n.remind_at).forEach((n) => add(iso(n.remind_at), { kind: 'note', id: n.id, title: n.text, done: n.done, at: n.remind_at, player: n.player_id, raw: n }));
  alertActions.filter((x) => x.due_date && x.status !== 'nueva').forEach((x) => add(x.due_date, { kind: 'alert', id: x.id, title: `Alerta: ${x.alert_key.split(':')[0].replace('sin-checkin', 'sin check-in')}${x.note ? ' · ' + x.note : ''}`, done: x.status === 'gestionada', at: `${x.due_date}T09:00:00`, player: x.player_id, raw: x }));
  players.filter((p) => !p.end_date && p.next_review).forEach((p) => add(p.next_review, { kind: 'review', id: 'r' + p.id, title: 'Revisión', done: false, at: `${p.next_review}T08:00:00`, player: p.id, raw: p }));
  leads.filter((l) => l.status === 'activa' && l.call_at).forEach((l) => add(iso(l.call_at), { kind: 'call', id: 'c' + l.id, title: `Videollamada con ${l.name}`, done: (l.stage || 0) >= 3, at: l.call_at, player: null, raw: l }));
  Object.values(events).forEach((l) => l.sort((a, b) => a.at.localeCompare(b.at)));

  const first = mondayOf(month);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const weekStart = mondayOf(new Date(sel));
  const weekDays = Array.from({ length: 7 }, (_, i) => iso(addDays(weekStart, i)));

  const toggle = (ev) => act(async () => {
    if (ev.kind === 'review') {
      await q(supabase.from('players').update({ next_review: iso(addDays(new Date(), Number(ev.raw.review_days) || 14)) }).eq('id', ev.raw.id));
      await q(supabase.from('evolution').insert({ coach_id: uid, player_id: ev.raw.id, category: 'valor', text: 'Revisión hecha.' }));
      return load(['players', 'evolution']);
    }
    if (ev.kind === 'call') {
      await q(supabase.from('leads').update({ stage: ev.done ? 2 : 3 }).eq('id', ev.raw.id));
      return load('leads');
    }
    if (ev.kind === 'alert') {
      await q(supabase.from('alert_actions').update({ status: ev.done ? 'pendiente' : 'gestionada' }).eq('id', ev.id));
      return load('alertActions');
    }
    await q(supabase.from(ev.kind === 'task' ? 'tasks' : 'notes').update({ done: !ev.done }).eq('id', ev.id));
    await load(ev.kind === 'task' ? 'tasks' : 'notes');
  });
  const delTask = (ev) => act(async () => {
    await q(supabase.from('tasks').delete().eq('id', ev.id));
    await load('tasks');
    setForm(null);
    toast('Tarea eliminada.', { undo: () => act(async () => { const { id, created_at, ...rest } = ev.raw; await q(supabase.from('tasks').insert(rest)); await load('tasks'); }) });
  });
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      const row = { title: form.title.trim(), due_at: new Date(`${form.date}T${form.time || '09:00'}`).toISOString(), player_id: form.player || null };
      if (form.id) await q(supabase.from('tasks').update(row).eq('id', form.id));
      else await q(supabase.from('tasks').insert({ coach_id: uid, ...row }));
      await load('tasks');
      setForm(null);
    }, form.id ? 'Tarea actualizada.' : 'Tarea guardada.');
  };
  // Tocar una tarea la abre para editarla; borrar pide confirmación y se puede deshacer
  const edit = (ev) => {
    const d = new Date(ev.at);
    setForm({ id: ev.id, raw: ev.raw, title: ev.title, date: iso(d), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, player: ev.player || '', sure: false });
    setTimeout(() => document.getElementById('t-title')?.scrollIntoView({ block: 'center' }), 30);
  };

  return (
    <>
      <div className="pagehead">
        <div><h1>Agenda</h1><p>Tus tareas y los avisos de las notas de cada cliente. Toca una tarea para editarla.</p></div>
        <button className="btn pri" onClick={() => setForm({ title: '', date: sel, time: '09:00', player: '' })}>+ Nueva tarea</button>
      </div>
      {form && (
        <form className="panel row" onSubmit={save} aria-label={form.id ? 'Editar tarea' : 'Nueva tarea'}>
          {form.id && <b style={{ flex: '1 1 100%' }}>Editar tarea</b>}
          <input id="t-title" required placeholder="Ej. Grabar vídeo de cargada" style={{ flex: '1 1 220px' }} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input id="t-date" type="date" required style={{ width: 'auto' }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input id="t-time" type="time" style={{ width: 'auto' }} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <select style={{ width: 'auto' }} value={form.player} onChange={(e) => setForm({ ...form, player: e.target.value })}><option value="">Sin cliente</option>{players.filter((p) => !p.end_date).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button className="btn pri" type="submit">Guardar</button><button type="button" className="btn" onClick={() => setForm(null)}>Cancelar</button>
          {form.id && (form.sure
            ? <span className="row small">¿Eliminar esta tarea?<button type="button" className="btn sm danger" onClick={() => delTask({ id: form.id, raw: form.raw })}>Sí, eliminar</button><button type="button" className="btn sm" onClick={() => setForm({ ...form, sure: false })}>No</button></span>
            : <button type="button" className="btn ghost danger" onClick={() => setForm({ ...form, sure: true })}>Eliminar</button>)}
        </form>
      )}
      <div className="panel stack">
        <div className="between">
          <div className="row">
            <button className="ib" aria-label="Mes anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
            <h2 style={{ textTransform: 'capitalize' }}>{MONTHS[month.getMonth()]} {month.getFullYear()}</h2>
            <button className="ib" aria-label="Mes siguiente" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
            <button className="btn sm" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSel(iso()); }}>Hoy</button>
          </div>
          <span className="row small"><span className="pill brand">Tarea</span><span className="pill" style={{ background: 'color-mix(in srgb,var(--info) 18%,transparent)' }}>Aviso de nota</span></span>
        </div>
        <div className="cal">
          {DAYS_SHORT.map((d) => <div key={d} className="dow">{d}</div>)}
          {cells.map((c) => {
            const k = iso(c); const ev = events[k] || [];
            return (
              <button key={k} type="button" className={'day' + (c.getMonth() !== month.getMonth() ? ' out' : '') + (k === iso() ? ' today' : '') + (k === sel ? ' sel' : '')} onClick={() => setSel(k)} aria-label={`${c.getDate()} de ${MONTHS[c.getMonth()]}: ${ev.length} eventos`}>
                <span className="dn">{c.getDate()}</span>
                {ev.slice(0, 3).map((e) => <span key={e.id} className={'ev' + (e.kind === 'note' ? ' note' : e.kind === 'alert' ? ' alert' : e.kind === 'review' || e.kind === 'call' ? ' note' : '') + (e.done ? ' done' : '')}>{e.kind === 'review' ? `Revisión ${pname(e.player)?.split(' ')[0]}` : e.title}</span>)}
                {ev.length > 3 && <span className="small muted">+{ev.length - 3}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="panel stack">
        <h3>Semana del {weekStart.getDate()} de {MONTHS[weekStart.getMonth()]}</h3>
        {weekDays.map((k, i) => {
          const ev = events[k] || [];
          return (
            <div key={k} className="stack" style={{ gap: 4 }}>
              <b className={k === iso() ? '' : 'muted'} style={k === iso() ? { color: 'var(--brand)' } : {}}>{DAYS[i]} {Number(k.slice(8))}</b>
              {ev.length ? (
                <ul className="list">
                  {ev.map((e) => (
                    <li key={e.id} style={e.done ? { opacity: 0.55 } : {}}>
                      <span className="row"><input type="checkbox" style={{ width: 18 }} checked={e.done} onChange={() => toggle(e)} aria-label="Hecha" />
                        {e.kind === 'task' ? <button type="button" className="linkish" style={e.done ? { textDecoration: 'line-through' } : {}} onClick={() => edit(e)} aria-label={`Editar tarea: ${e.title}`}>{e.title}</button> : <span style={e.done ? { textDecoration: 'line-through' } : {}}>{e.kind === 'note' ? (e.raw.kind === 'importante' ? '⚠ ' : '📝 ') : e.kind === 'alert' ? (e.raw.urgent ? '🔴 ' : '🔔 ') : e.kind === 'review' ? '🔁 ' : e.kind === 'call' ? '📹 ' : ''}{e.title}</span>}
                        {e.kind === 'call' && <button className="btn ghost sm" onClick={() => go('solicitudes')}>Ver solicitud</button>}
                        {e.player && <button className="btn ghost sm" onClick={() => go('clientes', e.player)}>{pname(e.player)}</button>}
                      </span>
                      <span className="row"><span className="muted small">{fmtDateTime(e.at).split('·')[1]}</span>{e.kind === 'task' && <button className="ib" aria-label="Editar" title="Editar" onClick={() => edit(e)}>✎</button>}</span>
                    </li>
                  ))}
                </ul>
              ) : <span className="muted small">—</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}
