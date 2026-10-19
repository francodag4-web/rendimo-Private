import React, { useEffect, useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { iso, addDays, mondayOf, parseISO, MONTHS } from '../lib/util.js';
import { useAction, useToast } from '../ui/ui.jsx';

const weeks = () => { const m = mondayOf(new Date()); return [['esta', 'Esta semana', iso(m)], ['proxima', 'La próxima', iso(addDays(m, 7))]]; };
const range = (w) => { const a = parseISO(w); const b = addDays(a, 6); return `${a.getDate()} ${MONTHS[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MONTHS[b.getMonth()].slice(0, 3)}`; };
const EXAMPLES = ['Esta semana nos centramos más en pliometría: calienta bien y llega descansado.', 'Semana de descarga: baja un poco las cargas y cuida el sueño.', 'Semana de partido importante: llega fresco el domingo.'];

// Nota de la semana para un cliente (o para todos los activos con `all`)
export default function WeekNoteEditor({ p, all }) {
  const { weekNotes = [], players, uid, load } = useCoach();
  const act = useAction();
  const toast = useToast();
  const [wk, setWk] = useState(weeks()[0][2]);
  const cur = p ? weekNotes.find((n) => n.player_id === p.id && n.week === wk) : null;
  const [text, setText] = useState(cur?.text || '');
  useEffect(() => { setText(cur?.text || ''); }, [cur?.id, cur?.text, wk]);
  const targets = all ? players.filter((x) => !x.end_date) : [p];
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      const rows = targets.map((x) => ({ coach_id: uid, player_id: x.id, week: wk, text: text.trim(), updated_at: new Date().toISOString() }));
      await q(supabase.from('week_notes').upsert(rows, { onConflict: 'player_id,week' }));
      await load('weekNotes');
      if (all) setText('');
    }, all ? `Nota enviada a ${targets.length} cliente${targets.length === 1 ? '' : 's'}. La ven en «Hoy».` : 'Nota guardada. La verá en «Hoy» esa semana.');
  };
  const del = () => act(async () => {
    const old = cur;
    await q(supabase.from('week_notes').delete().eq('id', cur.id));
    await load('weekNotes');
    toast('Nota borrada.', { undo: () => act(async () => { await q(supabase.from('week_notes').insert(old)); await load('weekNotes'); }) });
  });
  return (
    <form className="panel stack wnbox" onSubmit={save}>
      <div className="between">
        <div><h3>{all ? 'Nota de la semana para todos' : `Nota de la semana para ${p.name.split(' ')[0]}`}</h3>
          <p className="muted small">{all ? `La verán tus ${targets.length} clientes activos al abrir «Hoy». Sustituye la que tengan esa semana.` : 'La ve al abrir «Hoy» en su app, durante esa semana.'}</p></div>
        <span className="row">{weeks().map(([k, l, w]) => <button key={k} type="button" className={'btn sm' + (wk === w ? ' pri' : '')} aria-pressed={wk === w} onClick={() => setWk(w)}>{l} · {range(w)}</button>)}</span>
      </div>
      <textarea aria-label="Nota de la semana" required maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Ej. ' + EXAMPLES[0]} />
      <div className="row">
        <button className="btn pri" type="submit" disabled={!text.trim() || (cur && cur.text === text.trim())}>{cur ? 'Guardar cambios' : all ? 'Enviar a todos' : 'Guardar nota'}</button>
        {cur && <button type="button" className="btn danger" onClick={del}>Borrar</button>}
        {!text && <span className="row">{EXAMPLES.slice(1).map((x) => <button key={x} type="button" className="btn sm ghost" onClick={() => setText(x)}>{x.split(':')[0]}</button>)}</span>}
      </div>
    </form>
  );
}
