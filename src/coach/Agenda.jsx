import React, { useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { iso, addDays, mondayOf, DAYS, DAYS_SHORT, MONTHS, fmtDateTime } from '../lib/util.js';
import { useAction, useToast, Empty } from '../ui/ui.jsx';

export default function Agenda() {
  const { tasks, notes, players, uid, load, go } = useCoach();
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
  Object.values(events).forEach((l) => l.sort((a, b) => a.at.localeCompare(b.at)));

  const first = mondayOf(month);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const weekStart = mondayOf(new Date(sel));
  const weekDays = Array.from({ length: 7 }, (_, i) => iso(addDays(weekStart, i)));

  const toggle = (ev) => act(async () => {
    await q(supabase.from(ev.kind === 'task' ? 'tasks' : 'notes').update({ done: !ev.done }).eq('id', ev.id));
    await load(ev.kind === 'task' ? 'tasks' : 'notes');
  });
  const delTask = (ev) => act(async () => {
    await q(supabase.from('tasks').delete().eq('id', ev.id));
    await load('tasks');
    toast('Tarea eliminada.', { undo: () => act(async () => { const { id, created_at, ...rest } = ev.raw; await q(supabase.from('tasks').insert(rest)); await load('tasks'); }) });
  });
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      await q(supabase.from('tasks').insert({ coach_id: uid, title: form.title.trim(), due_at: new Date(`${form.date}T${form.time || '09:00'}`).toISOString(), player_id: form.player || null }));
      await load('tasks');
      setForm(null);
    }, 'Tarea guardada.');
  };

  return (
    <>
      <div className="pagehead">
        <div><h1>Agenda</h1><p>Tus tareas y los avisos de las notas de cada jugador.</p></div>
        <button className="btn pri" onClick={() => setForm({ title: '', date: sel, time: '09:00', player: '' })}>+ Nueva tarea</button>
      </div>
      {form && (
        <form className="panel row" onSubmit={save}>
          <input id="t-title" required placeholder="Ej. Grabar vídeo de cargada" style={{ flex: '1 1 220px' }} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input id="t-date" type="date" required style={{ width: 'auto' }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input id="t-time" type="time" style={{ width: 'auto' }} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <select style={{ width: 'auto' }} value={form.player} onChange={(e) => setForm({ ...form, player: e.target.value })}><option value="">Sin jugador</option>{players.filter((p) => !p.end_date).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button className="btn pri" type="submit">Guardar</button><button type="button" className="btn" onClick={() => setForm(null)}>Cancelar</button>
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
                {ev.slice(0, 3).map((e) => <span key={e.id} className={'ev' + (e.kind === 'note' ? ' note' : '') + (e.done ? ' done' : '')}>{e.title}</span>)}
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
                        <span style={e.done ? { textDecoration: 'line-through' } : {}}>{e.kind === 'note' ? (e.raw.kind === 'importante' ? '⚠ ' : '📝 ') : ''}{e.title}</span>
                        {e.player && <button className="btn ghost sm" onClick={() => go('clientes', e.player)}>{pname(e.player)}</button>}
                      </span>
                      <span className="row"><span className="muted small">{fmtDateTime(e.at).split('·')[1]}</span>{e.kind === 'task' && <button className="ib" aria-label="Eliminar tarea" onClick={() => delTask(e)}>✕</button>}</span>
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
