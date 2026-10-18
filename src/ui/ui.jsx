import React, { createContext, useCallback, useContext, useState } from 'react';

// ---------- Avisos con opción de deshacer ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((msg, opts = {}) => {
    const id = Math.random();
    setList((l) => [...l, { id, msg, ...opts }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), opts.undo ? 6000 : opts.error ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={'toast' + (t.error ? ' err' : '')}>
            <span>{t.msg}</span>
            {t.undo && (
              <button type="button" onClick={() => { t.undo(); setList((l) => l.filter((x) => x.id !== t.id)); }}>
                Deshacer
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// Ejecuta una acción y muestra el error si falla
export function useAction() {
  const toast = useToast();
  return useCallback(
    async (fn, okMsg) => {
      try {
        const r = await fn();
        if (okMsg) toast(okMsg);
        return r;
      } catch (e) {
        toast(e.message || 'Algo ha fallado.', { error: true });
        return undefined;
      }
    },
    [toast]
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([k, l]) => (
        <button key={k} type="button" role="tab" className="tab" aria-selected={value === k} onClick={() => onChange(k)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export const Empty = ({ children }) => <div className="empty">{children}</div>;

export const Loading = () => <div className="muted" style={{ padding: 20 }}>Cargando…</div>;

// ---------- Gráficas simples en SVG ----------
export function Bars({ data, unit = '', height = 160 }) {
  // data: [{label, value}]
  const W = 600, H = height, pad = 24, top = 14;
  const max = Math.max(1, ...data.map((d) => d.value || 0));
  const bw = (W - pad * 2) / Math.max(1, data.length);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H + 20}`} role="img" aria-label="Gráfica de barras">
      <line x1={pad} x2={W - pad} y1={H} y2={H} stroke="var(--line)" />
      {data.map((d, i) => {
        const h = ((d.value || 0) / max) * (H - top - 6);
        const x = pad + i * bw + bw * 0.15;
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={bw * 0.7} height={h} rx="3" fill="var(--brand)" opacity={i === data.length - 1 ? 1 : 0.55} />
            {d.value ? <text x={x + bw * 0.35} y={H - h - 4} textAnchor="middle">{Math.round(d.value)}{unit}</text> : null}
            <text x={x + bw * 0.35} y={H + 15} textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function Line({ data, min = 0, max, height = 140, refLine }) {
  // data: [{label, value|null}]
  const W = 600, H = height, pad = 26, top = 10;
  const vals = data.map((d) => d.value).filter((v) => v != null);
  const hi = max ?? Math.max(1, ...vals);
  const x = (i) => pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v) => H - ((v - min) / (hi - min)) * (H - top);
  const pts = data.map((d, i) => (d.value == null ? null : [x(i), y(d.value)])).filter(Boolean);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H + 20}`} role="img" aria-label="Gráfica de línea">
      <line x1={pad} x2={W - pad} y1={H} y2={H} stroke="var(--line)" />
      {refLine != null && <line x1={pad} x2={W - pad} y1={y(refLine)} y2={y(refLine)} stroke="var(--warn)" strokeDasharray="4 4" />}
      <text x={4} y={y(hi) + 4}>{String(hi).replace('.', ',')}</text>
      <text x={4} y={H}>{String(min).replace('.', ',')}</text>
      {path && <path d={path} fill="none" stroke="var(--brand)" strokeWidth="2.5" />}
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4.5 : 3} fill="var(--brand)" />)}
      {data.map((d, i) => (i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) && (
        <text key={'l' + i} x={x(i)} y={H + 15} textAnchor="middle">{d.label}</text>
      ))}
    </svg>
  );
}

export const WAIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/></svg>
);
