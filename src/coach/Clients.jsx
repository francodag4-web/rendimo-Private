import React, { useMemo, useState, useEffect } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { matches, iso, fmtDate, fmtDateTime, waURL, monthsActive, wellness, addDays, mondayOf, parseISO } from '../lib/util.js';
import { useAction, useToast, Tabs, Empty, Bars, Line, WAIcon } from '../ui/ui.jsx';
import { waText } from './Home.jsx';
import { calendarWeekIdx, totalWeeks, cloneWithNewIds } from '../lib/program.js';

const PLANS = ['Online', 'Online + revisiones', 'Presencial', 'Readaptación'];

export default function Clients() {
  const { route } = useCoach();
  if (route.id === 'nuevo') return <NewPlayer />;
  if (route.id) return <PlayerDetail id={route.id} />;
  return <PlayerList />;
}

function PlayerList() {
  const { players, go, checkins } = useCoach();
  const [qy, setQy] = useState('');
  const [show, setShow] = useState('activos');
  const list = players.filter((p) => (show === 'activos' ? !p.end_date : !!p.end_date) && matches(`${p.name} ${p.position || ''} ${p.plan || ''} ${p.email}`, qy));
  const ended = players.filter((p) => p.end_date);
  const avg = ended.length ? ended.reduce((a, p) => a + monthsActive(p), 0) / ended.length : null;
  const lastCheck = (id) => { const c = checkins.filter((x) => x.player_id === id); return c[c.length - 1]; };

  return (
    <>
      <div className="pagehead">
        <div><h1>Jugadores</h1><p>{players.filter((p) => !p.end_date).length} activos{avg != null ? ` · permanencia media ${avg.toFixed(1)} meses` : ''}</p></div>
        <button className="btn pri" onClick={() => go('clientes', 'nuevo')}>+ Nuevo jugador</button>
      </div>
      <div className="row">
        <input id="cq" style={{ maxWidth: 320 }} placeholder="Buscar por nombre, posición o plan" value={qy} onChange={(e) => setQy(e.target.value)} />
        <Tabs tabs={[['activos', 'Activos'], ['baja', 'De baja']]} value={show} onChange={setShow} />
      </div>
      {list.length ? (
        <div className="panel tablewrap">
          <table>
            <thead><tr><th>Nombre</th><th>Posición</th><th>Plan</th><th>Último check-in</th><th>Acceso</th></tr></thead>
            <tbody>
              {list.map((p) => {
                const c = lastCheck(p.id); const w = wellness(c);
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => go('clientes', p.id)}>
                    <td><b>{p.important ? '⚠ ' : ''}{p.name}</b></td>
                    <td>{p.position || '—'}</td>
                    <td>{p.plan || '—'}</td>
                    <td className="num">{c ? <>{fmtDate(c.date)} · <span className={'pill ' + (w <= 13 ? 'warn' : 'ok')}>{w}/25</span>{c.pain >= 4 && <span className="pill bad">dolor {c.pain}</span>}</> : '—'}</td>
                    <td>{p.user_id ? <span className="pill ok">Activo</span> : <span className="pill warn">Invitado</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <Empty>{players.length ? 'Nadie coincide con la búsqueda.' : 'Aún no tienes jugadores. Añade el primero con «+ Nuevo jugador».'}</Empty>}
    </>
  );
}

function NewPlayer() {
  const { uid, load, go, coach } = useCoach();
  const act = useAction();
  const [f, setF] = useState({ name: '', email: '', phone: '', position: '', plan: PLANS[0], start_date: iso() });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      const row = await q(supabase.from('players').insert({ ...f, email: f.email.trim().toLowerCase(), name: f.name.trim(), coach_id: uid }).select().single());
      await load('players');
      go('clientes', row.id);
    }, 'Jugador añadido. Mándale el acceso por WhatsApp.');
  };
  return (
    <>
      <div className="pagehead"><div><h1>Nuevo jugador</h1><p>Con su correo podrá entrar y ver solo lo suyo.</p></div><button className="btn" onClick={() => go('clientes')}>Volver</button></div>
      <form className="panel stack" onSubmit={save} style={{ maxWidth: 640 }}>
        <div className="grid2">
          <label className="f">Nombre y apellidos<input id="np-name" required value={f.name} onChange={set('name')} /></label>
          <label className="f">Correo (con el que entrará)<input id="np-email" type="email" required value={f.email} onChange={set('email')} /></label>
          <label className="f">WhatsApp (con prefijo, ej. 34600111222)<input id="np-phone" inputMode="tel" value={f.phone} onChange={set('phone')} /></label>
          <label className="f">Posición o deporte<input id="np-pos" value={f.position} onChange={set('position')} placeholder="Ej. Pilier, Ala…" /></label>
          <label className="f">Plan<select id="np-plan" value={f.plan} onChange={set('plan')}>{PLANS.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="f">Fecha de alta<input id="np-start" type="date" required value={f.start_date} onChange={set('start_date')} /></label>
        </div>
        <div className="row"><button className="btn pri" type="submit">Guardar jugador</button></div>
        <p className="muted small">Después de guardar te aparece el botón para mandarle el acceso por WhatsApp ({coach.brand_name}).</p>
      </form>
    </>
  );
}

function PlayerDetail({ id }) {
  const { players, go, coach } = useCoach();
  const p = players.find((x) => x.id === id);
  const [tab, setTab] = useState('resumen');
  if (!p) return <Empty>No se encuentra este jugador. <button className="btn sm" onClick={() => go('clientes')}>Volver</button></Empty>;
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{p.name}</h1>
          <p>{[p.position, p.plan, p.end_date ? 'De baja' : null].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="row">
          {p.phone && (
            <a className="btn" target="_blank" rel="noopener" href={waURL(p.phone, waText(p, p.user_id ? 'libre' : 'invitar', coach))}>
              <WAIcon /> {p.user_id ? 'WhatsApp' : 'Enviar acceso'}
            </a>
          )}
          <button className="btn" onClick={() => go('clientes')}>Volver</button>
        </div>
      </div>
      {p.important && <div className="panel" style={{ borderColor: 'var(--warn)' }}><b>⚠ Importante:</b> {p.important}</div>}
      <Tabs tabs={[['resumen', 'Resumen'], ['programa', 'Programa'], ['clinica', 'Historia clínica'], ['notas', 'Notas'], ['datos', 'Datos']]} value={tab} onChange={setTab} />
      {tab === 'resumen' && <Summary p={p} />}
      {tab === 'programa' && <PlayerPrograms p={p} />}
      {tab === 'clinica' && <Health p={p} />}
      {tab === 'notas' && <Notes p={p} />}
      {tab === 'datos' && <Data p={p} />}
    </>
  );
}

function Summary({ p }) {
  const { checkins, logs, programs, go } = useCoach();
  const cs = checkins.filter((c) => c.player_id === p.id);
  const ls = logs.filter((l) => l.player_id === p.id);
  // Carga semanal (suma sRPE) últimas 8 semanas
  const mon = mondayOf(new Date());
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const a = addDays(mon, -7 * (7 - i)); const b = addDays(a, 6);
    const v = ls.filter((l) => l.date >= iso(a) && l.date <= iso(b)).reduce((s, l) => s + Number(l.srpe || 0), 0);
    return { label: `${a.getDate()}/${a.getMonth() + 1}`, value: v };
  });
  const acute = weeks[7].value; const chronic = weeks.slice(4, 8).reduce((a, w) => a + w.value, 0) / 4;
  // Ratio agudo:crónico solo con al menos 4 semanas con carga (orientativo; Impellizzeri et al., 2020)
  const acwr = chronic && weeks.slice(4, 8).filter((w) => w.value > 0).length >= 4 ? acute / chronic : null;
  const days = Array.from({ length: 21 }, (_, i) => {
    const d = iso(addDays(new Date(), i - 20)); const c = cs.find((x) => x.date === d);
    return { label: `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`, value: c ? wellness(c) : null };
  });
  const prog = programs.find((x) => x.player_id === p.id);
  const wk = prog ? calendarWeekIdx(prog) : null;

  return (
    <div className="stack">
      <div className="grid3">
        <div className="panel"><div className="muted small">Programa actual</div>
          {prog ? <><b>{prog.name}</b><div className="small muted">{wk != null && wk >= 0 ? `Semana ${wk + 1} de ${totalWeeks(prog.data)}` : 'Sin fecha de inicio'}</div><button className="btn sm" style={{ marginTop: 6 }} onClick={() => go('programacion', prog.id)}>Abrir</button></> : <span className="muted">Sin programa</span>}
        </div>
        <div className="panel"><div className="muted small">Carga esta semana (sRPE)</div><h2 className="num">{Math.round(acute)}</h2>
          {acwr != null && <span className={'pill ' + (acwr > 1.5 ? 'warn' : 'ok')} title="Carga de esta semana dividida por la media de las últimas 4. Orientativo.">Esta semana / media 4 sem.: {acwr.toFixed(2).replace('.', ',')}</span>}
        </div>
        <div className="panel"><div className="muted small">Sesiones registradas</div><h2 className="num">{ls.length}</h2><span className="muted small">últimos 4 meses</span></div>
      </div>
      <div className="panel stack"><h3>Carga semanal</h3><p className="muted small">Suma de RPE × minutos de cada sesión (Foster 2001).</p><Bars data={weeks} /></div>
      <div className="panel stack"><h3>Bienestar (últimos 21 días)</h3><p className="muted small">Suma de sueño, fatiga, dolor muscular, estrés y ánimo (5 a 25). La línea marca 13: por debajo, conviene preguntar.</p><Line data={days} min={5} max={25} refLine={13} /></div>
      <div className="panel stack">
        <h3>Últimas sesiones</h3>
        {ls.length ? (
          <div className="tablewrap"><table><thead><tr><th>Fecha</th><th>RPE</th><th>Min</th><th>sRPE</th><th>Comentario</th></tr></thead>
            <tbody>{[...ls].reverse().slice(0, 10).map((l) => <tr key={l.id}><td>{fmtDate(l.date)}</td><td className="num">{l.rpe ?? '—'}</td><td className="num">{l.duration_min ?? '—'}</td><td className="num">{l.srpe ?? '—'}</td><td>{l.note || ''}</td></tr>)}</tbody>
          </table></div>
        ) : <Empty>Todavía no ha registrado sesiones.</Empty>}
      </div>
    </div>
  );
}

function PlayerPrograms({ p }) {
  const { programs, uid, load, go } = useCoach();
  const act = useAction();
  const mine = programs.filter((x) => x.player_id === p.id);
  const tpls = programs.filter((x) => !x.player_id);
  const [tpl, setTpl] = useState(tpls[0]?.id || '');
  const [start, setStart] = useState(iso(mondayOf(addDays(new Date(), 7))));
  useEffect(() => { if (!tpl && tpls[0]) setTpl(tpls[0].id); }, [tpls.length]);
  const assign = () => act(async () => {
    const t = programs.find((x) => x.id === tpl);
    const row = await q(supabase.from('programs').insert({ coach_id: uid, player_id: p.id, template_id: t.id, name: t.name, start_date: start, data: cloneWithNewIds(t.data) }).select().single());
    await load('programs');
    go('programacion', row.id);
  }, 'Programa asignado. Es una copia: los cambios en la plantilla no le afectan.');
  return (
    <div className="stack">
      <div className="panel stack">
        <h3>Asignar desde plantilla</h3>
        {tpls.length ? (
          <div className="row">
            <select id="as-tpl" style={{ maxWidth: 280 }} value={tpl} onChange={(e) => setTpl(e.target.value)}>{tpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <label className="row small">Empieza el<input id="as-start" type="date" style={{ width: 'auto' }} value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <button className="btn pri" onClick={assign}>Asignar copia</button>
          </div>
        ) : <p className="muted">Crea primero una plantilla en Programación.</p>}
      </div>
      <div className="panel stack">
        <h3>Programas de {p.name.split(' ')[0]}</h3>
        {mine.length ? <ul className="list">{mine.map((x) => <li key={x.id}><span><b>{x.name}</b> · {x.start_date ? `desde ${fmtDate(x.start_date)}` : 'sin fecha'} · {totalWeeks(x.data)} semanas</span><button className="btn sm" onClick={() => go('programacion', x.id)}>Editar</button></li>)}</ul> : <Empty>Sin programas asignados.</Empty>}
      </div>
    </div>
  );
}

const HFIELDS = [
  ['antecedentes', 'Enfermedades o condiciones relevantes', 'area'],
  ['medicacion', 'Medicación actual', 'area'],
  ['alergias', 'Alergias', 'text'],
  ['familiares', 'Antecedentes familiares (cardiovasculares, muerte súbita…)', 'text'],
  ['habitos', 'Hábitos (sueño, trabajo, tabaco, alcohol)', 'text'],
  ['lesiones', 'Lesiones previas (fecha, tipo, gravedad, días de baja)', 'area'],
  ['cirugias', 'Cirugías', 'area'],
  ['conmociones', 'Conmociones cerebrales (número, última, vuelta gradual completada)', 'area'],
  ['pruebas', 'Pruebas e informes (resonancias, ecografías, analíticas…)', 'area'],
  ['profesionales', 'Profesionales de referencia (fisio, médico)', 'text'],
  ['evolucion', 'Evolución: qué ha pasado y qué cambias (con fecha)', 'area'],
];

function Health({ p }) {
  const act = useAction();
  const [data, setData] = useState(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    supabase.from('health').select('data').eq('player_id', p.id).limit(1).then(({ data: r }) => setData(r?.[0]?.data || {}));
  }, [p.id]);
  if (!data) return <p className="muted">Cargando…</p>;
  const set = (k) => (e) => { setData({ ...data, [k]: e.target.value }); setDirty(true); };
  const save = () => act(async () => {
    await q(supabase.from('health').upsert({ player_id: p.id, data }));
    setDirty(false);
  }, 'Historia clínica guardada.');
  return (
    <div className="stack">
      <div className="panel stack">
        <div className="between"><h3>Historia clínica</h3><button className="btn pri" disabled={!dirty} onClick={save}>{dirty ? 'Guardar cambios' : 'Guardado'}</button></div>
        <div className="grid2">
          {HFIELDS.map(([k, l, t]) => (
            <label key={k} className="f" style={t === 'area' ? {} : {}}>{l}
              {t === 'area' ? <textarea id={'h-' + k} value={data[k] || ''} onChange={set(k)} /> : <input id={'h-' + k} value={data[k] || ''} onChange={set(k)} />}
            </label>
          ))}
        </div>
      </div>
      <p className="muted small">Datos de salud: solo los ves tú; {p.name.split(' ')[0]} puede leerlos pero no editarlos. Consentimiento expreso {p.consent_at ? `firmado el ${fmtDate(p.consent_at)}` : 'pendiente: lo acepta al entrar por primera vez'}.</p>
    </div>
  );
}

function Notes({ p }) {
  const { notes, uid, load } = useCoach();
  const act = useAction();
  const toast = useToast();
  const mine = notes.filter((n) => n.player_id === p.id);
  const [f, setF] = useState({ kind: 'nota', text: '', remind_at: '' });
  const add = (e) => {
    e.preventDefault();
    act(async () => {
      await q(supabase.from('notes').insert({ coach_id: uid, player_id: p.id, kind: f.kind, text: f.text.trim(), remind_at: f.remind_at ? new Date(f.remind_at).toISOString() : null }));
      setF({ kind: 'nota', text: '', remind_at: '' });
      await load('notes');
    }, 'Nota guardada.');
  };
  const toggle = (n) => act(async () => { await q(supabase.from('notes').update({ done: !n.done }).eq('id', n.id)); await load('notes'); });
  const del = (n) => act(async () => {
    await q(supabase.from('notes').delete().eq('id', n.id));
    await load('notes');
    toast('Nota eliminada.', { undo: () => act(async () => { const { id, ...rest } = n; await q(supabase.from('notes').insert(rest)); await load('notes'); }) });
  });
  return (
    <div className="stack">
      <form className="panel stack" onSubmit={add}>
        <div className="row">
          <select id="n-kind" style={{ width: 'auto' }} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="nota">Nota</option><option value="importante">⚠ Importante</option></select>
          <input id="n-text" required style={{ flex: '1 1 260px' }} placeholder="Ej. Revisar técnica de cargada" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
          <label className="row small">Avisarme<input id="n-when" type="datetime-local" style={{ width: 'auto' }} value={f.remind_at} onChange={(e) => setF({ ...f, remind_at: e.target.value })} /></label>
          <button className="btn pri" type="submit">Añadir</button>
        </div>
        <p className="muted small">Las notas con aviso aparecen en Inicio y en la Agenda el día que toca. Para un aviso fijo en su ficha, usa «Importante» en Datos.</p>
      </form>
      {mine.length ? (
        <ul className="list">
          {mine.map((n) => (
            <li key={n.id} style={n.done ? { opacity: 0.55 } : {}}>
              <span>{n.kind === 'importante' && <span className="pill warn">Importante</span>} {n.text}{n.remind_at && <span className="muted small"> · aviso {fmtDateTime(n.remind_at)}</span>}</span>
              <span className="row"><button className="btn sm" onClick={() => toggle(n)}>{n.done ? 'Reabrir' : 'Hecha'}</button><button className="ib" aria-label="Eliminar nota" onClick={() => del(n)}>✕</button></span>
            </li>
          ))}
        </ul>
      ) : <Empty>Sin notas.</Empty>}
    </div>
  );
}

function Data({ p }) {
  const { load, go } = useCoach();
  const act = useAction();
  const [f, setF] = useState(p);
  useEffect(() => setF(p), [p.id]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value || null });
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      const { name, email, phone, position, plan, start_date, end_date, end_reason, important, restrictions } = f;
      await q(supabase.from('players').update({ name, email: email.trim().toLowerCase(), phone, position, plan, start_date, end_date, end_reason, important, restrictions }).eq('id', p.id));
      await load('players');
    }, 'Datos guardados.');
  };
  const remove = () => {
    act(async () => {
      await q(supabase.from('players').delete().eq('id', p.id));
      await load();
      go('clientes');
    }, 'Jugador y todos sus datos eliminados.');
  };
  const [confirm, setConfirm] = useState(false);
  return (
    <form className="panel stack" onSubmit={save}>
      <div className="grid2">
        <label className="f">Nombre<input value={f.name || ''} onChange={set('name')} required /></label>
        <label className="f">Correo<input type="email" value={f.email || ''} onChange={set('email')} required /></label>
        <label className="f">WhatsApp<input value={f.phone || ''} onChange={set('phone')} /></label>
        <label className="f">Posición<input value={f.position || ''} onChange={set('position')} /></label>
        <label className="f">Plan<select value={f.plan || ''} onChange={set('plan')}>{[...new Set([...PLANS, f.plan].filter(Boolean))].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="f">Alta<input type="date" value={f.start_date || ''} onChange={set('start_date')} required /></label>
        <label className="f">Baja<input id="d-end" type="date" value={f.end_date || ''} onChange={set('end_date')} /></label>
        <label className="f">Motivo de baja<select value={f.end_reason || ''} onChange={set('end_reason')}><option value="">—</option>{['Objetivo cumplido', 'Precio', 'Falta de tiempo', 'Lesión', 'Se pasa a presencial', 'Sin respuesta', 'Otro'].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="f">⚠ Importante (aviso fijo en su ficha)<input value={f.important || ''} onChange={set('important')} placeholder="Ej. Hombro derecho: nada por encima de la cabeza" /></label>
        <label className="f">Restricciones<input value={f.restrictions || ''} onChange={set('restrictions')} /></label>
      </div>
      <div className="between">
        <button className="btn pri" type="submit">Guardar datos</button>
        {confirm
          ? <span className="row"><span className="small">¿Borrar a {p.name} y todo su historial? No se puede deshacer.</span><button type="button" className="btn danger" onClick={remove}>Sí, borrar</button><button type="button" className="btn" onClick={() => setConfirm(false)}>No</button></span>
          : <button type="button" className="btn danger" onClick={() => setConfirm(true)}>Eliminar jugador</button>}
      </div>
      <p className="muted small">Para una baja normal pon la fecha de baja y el motivo: así se conserva el historial y se calcula la permanencia media. Eliminar borra todo (derecho de supresión del RGPD).</p>
    </form>
  );
}
