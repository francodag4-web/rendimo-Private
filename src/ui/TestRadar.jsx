import React, { useMemo, useState } from 'react';
import { radarAxes, defaultAxes, radarDates, axisPoint } from '../lib/radar.js';
import { fmtNum } from '../lib/domain.js';
import { fmtDate } from '../lib/util.js';

const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// Radar de tests 0-10: elige qué tests salen (3 a 8) y compara dos fechas
export default function TestRadar({ tests, storeKey, title = 'Perfil de tests', from, to, controls = true }) {
  const axesAll = useMemo(() => radarAxes(tests), [tests]);
  const dates = useMemo(() => radarDates(tests).filter((d) => !to || d <= to), [tests, to]);
  const [sel, setSel] = useState(() => load(`radar:${storeKey}`, null));
  const keys = (sel || defaultAxes(axesAll)).filter((k) => axesAll.some((a) => a.key === k));
  const [da, setDa] = useState(null); const [db, setDb] = useState(null);
  const A = da && dates.includes(da) ? da : (from && [...dates].reverse().find((d) => d <= from)) || dates[0];
  const B = db && dates.includes(db) ? db : dates[dates.length - 1];
  if (axesAll.length < 3) return (
    <section className="panel stack"><h3>{title}</h3><p className="muted small">El radar aparece con 3 tests distintos o más (por ejemplo: resistencia, salto, fuerza, agilidad y sprint). Ahora hay {axesAll.length}.</p></section>
  );
  const toggle = (k) => {
    const next = keys.includes(k) ? keys.filter((x) => x !== k) : [...keys, k];
    if (next.length < 3 || next.length > 8) return;
    setSel(next); save(`radar:${storeKey}`, next);
  };
  const axes = keys.map((k) => axesAll.find((a) => a.key === k));
  const two = A !== B;
  const ptsA = axes.map((a) => axisPoint(tests, a, A));
  const ptsB = axes.map((a) => axisPoint(tests, a, B));
  const avg = (pts) => { const s = pts.filter(Boolean).map((p) => p.score); return s.length ? s.reduce((x, y) => x + y, 0) / s.length : null; };

  // Geometría
  const S = 360; const c = S / 2; const R = 112; const n = axes.length;
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const xy = (i, r) => [c + Math.cos(ang(i)) * r, c + Math.sin(ang(i)) * r];
  const poly = (pts) => pts.map((p, i) => xy(i, ((p?.score ?? 0) / 10) * R).map((v) => v.toFixed(1)).join(',')).join(' ');
  return (
    <section className="panel stack radar">
      <div className="between">
        <h3>{title} <span className="muted small">· puntuación 0-10</span></h3>
        {controls && dates.length > 1 && (
          <div className="row small">
            <label className="row">Antes<select aria-label="Fecha anterior" style={{ width: 'auto' }} value={A} onChange={(e) => setDa(e.target.value)}>{dates.map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}</select></label>
            <label className="row">Ahora<select aria-label="Fecha actual" style={{ width: 'auto' }} value={B} onChange={(e) => setDb(e.target.value)}>{dates.map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}</select></label>
          </div>
        )}
      </div>
      <svg viewBox={`0 0 ${S} ${S}`} className="radar-svg" role="img" aria-label={`Radar de ${axes.map((a) => a.label).join(', ')}`}>
        {[2.5, 5, 7.5, 10].map((r) => <circle key={r} cx={c} cy={c} r={(r / 10) * R} className="rg" />)}
        {axes.map((a, i) => { const [x, y] = xy(i, R); return <line key={a.key} x1={c} y1={c} x2={x} y2={y} className="rg" />; })}
        {two && <polygon points={poly(ptsA)} className="ra" />}
        <polygon points={poly(ptsB)} className="rb" />
        {two && ptsA.map((p, i) => p && <circle key={'a' + i} cx={xy(i, (p.score / 10) * R)[0]} cy={xy(i, (p.score / 10) * R)[1]} r="3.5" className="rad" />)}
        {ptsB.map((p, i) => p && <circle key={'b' + i} cx={xy(i, (p.score / 10) * R)[0]} cy={xy(i, (p.score / 10) * R)[1]} r="4" className="rbd" />)}
        {axes.map((a, i) => {
          const [x, y] = xy(i, R + 18); const cos = Math.cos(ang(i));
          const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
          const words = a.label.split(' '); const lines = a.label.length > 14 && words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [a.label];
          const dy = Math.sin(ang(i)) > 0.3 ? 10 : Math.sin(ang(i)) < -0.3 ? -4 - (lines.length - 1) * 13 : 4 - (lines.length - 1) * 6;
          return <text key={a.key} x={x} y={y + dy} textAnchor={anchor} className="rl">{lines.map((l, j) => <tspan key={j} x={x} dy={j ? 13 : 0}>{l}</tspan>)}</text>;
        })}
      </svg>
      <div className="row small radar-legend">
        {two && <span><i className="sw a" /> {fmtDate(A)} · media {fmtNum(avg(ptsA), 1)}</span>}
        <span><i className="sw b" /> {fmtDate(B)} · media {fmtNum(avg(ptsB), 1)}</span>
      </div>
      <div className="tablewrap">
        <table className="small">
          <thead><tr><th>Test</th>{two && <th>{fmtDate(A)}</th>}<th>{fmtDate(B)}</th>{two && <th>Cambio</th>}<th>0-10</th></tr></thead>
          <tbody>{axes.map((a, i) => {
            const pa = ptsA[i]; const pb = ptsB[i]; const d = pa && pb ? pb.score - pa.score : null;
            const val = (p) => (p ? `${fmtNum(p.v, 2)} ${p.unit || ''}` : '—');
            return (
              <tr key={a.key}>
                <td><b>{a.label}</b>{pb?.scale === 'own' && <span className="muted"> *</span>}</td>
                {two && <td className="num">{val(pa)}</td>}
                <td className="num">{val(pb)}</td>
                {two && <td>{d == null ? '—' : <span className={'pill ' + (d > 0.05 ? 'ok' : d < -0.05 ? 'bad' : '')}>{d > 0 ? '+' : ''}{fmtNum(d, 1)}</span>}</td>}
                <td className="num"><b>{pb ? fmtNum(pb.score, 1) : '—'}</b></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {controls && <details className="small">
        <summary style={{ cursor: 'pointer' }}><b>Elegir tests</b> <span className="muted">({keys.length} de {axesAll.length}, entre 3 y 8)</span></summary>
        <div className="row" style={{ marginTop: 8 }}>
          {axesAll.map((a) => (
            <button key={a.key} type="button" className={'chipbtn' + (keys.includes(a.key) ? ' on' : '')} aria-pressed={keys.includes(a.key)} onClick={() => toggle(a.key)}>{a.label} <span className="muted">· {a.cat}</span></button>
          ))}
        </div>
      </details>}
      <p className="muted small">0 = peor · 10 = mejor. Escala de referencia para adulto de deporte de equipo; la fuerza relativa es el 1RM dividido por el peso corporal.{axes.some((a, i) => ptsB[i]?.scale === 'own') ? ' * Sin referencia publicada: 0 es su peor marca y 10 la mejor.' : ''}</p>
    </section>
  );
}
