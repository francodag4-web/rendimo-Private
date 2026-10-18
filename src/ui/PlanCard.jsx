import React from 'react';
import { fmtDate } from '../lib/util.js';

const tu = (x) => x.replace(/\bsu posición\b/g, 'tu posición').replace(/\bsu fisio\b/g, 'tu fisio').replace(/\bsu calendario\b/g, 'tu calendario');

// Tarjeta de un plan u oferta: la ven el jugador, el formulario público y el entrenador
export default function PlanCard({ plan: p, badge, as: Tag = 'section', className = '', children, you = true, ...rest }) {
  return (
    <Tag className={`tile ${p.color || 't-g'} plancard ${p.offer ? 'offer ' : ''}${className}`} aria-label={p.name} {...rest}>
      <span className="between"><b className="pname">{p.name}</b>{(badge || p.offer || p.tag) && <span className="pill">{badge || (p.offer ? 'Oferta' : p.tag)}</span>}</span>
      <span className="price num">
        {p.oldFee != null && p.oldFee > p.fee && <s className="old">{p.oldFee} €</s>}
        {p.fee} €<small>{p.type === 'unico' ? ' pago único' : ' / mes'}</small>
      </span>
      {p.until && <span className="until">Hasta el {fmtDate(p.until)}</span>}
      {p.pitch && <span className="sub">{p.pitch}</span>}
      {p.features?.length > 0 && <ul>{p.features.map((x) => <li key={x}><span>✓ {you ? tu(x) : x}</span></li>)}</ul>}
      {p.commitment ? <span className="small">Compromiso de {p.commitment} meses; después, mes a mes.</span> : null}
      {children}
    </Tag>
  );
}
