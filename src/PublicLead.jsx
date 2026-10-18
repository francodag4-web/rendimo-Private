import React, { useEffect, useState } from 'react';
import { supabase, PLATFORM } from './lib/supabase.js';
import { applyBrand } from './App.jsx';
import { PLANS } from './lib/domain.js';
import { Loading } from './ui/ui.jsx';

// Formulario público para que un jugador pida plaza. No necesita cuenta.
export default function PublicLead({ slug }) {
  const [brand, setBrand] = useState(undefined);
  const [f, setF] = useState({ name: '', phone: '', email: '', position: '', plan: PLANS[1].name, goal: '', injuries: '', message: '', ok: false });
  const [state, setState] = useState('form'); // form | sending | done | error
  const [err, setErr] = useState('');
  useEffect(() => {
    supabase.rpc('public_brand', { coach_slug: slug }).then(({ data }) => {
      setBrand(data || null);
      if (data) { applyBrand(data.color); document.title = `Solicitud · ${data.brand_name}`; }
    });
  }, [slug]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const send = async (e) => {
    e.preventDefault();
    setState('sending'); setErr('');
    const { ok, ...p } = f;
    const { data, error } = await supabase.rpc('submit_lead', { coach_slug: slug, p });
    if (error || !data) { setState('form'); setErr('No se pudo enviar. Revisa la conexión y vuelve a probar.'); return; }
    setState('done');
  };
  if (brand === undefined) return <Loading />;
  if (!brand) return <div className="center"><div className="card"><h2>Formulario no encontrado</h2><p className="muted">Revisa el enlace que te han pasado.</p></div></div>;
  return (
    <div className="center">
      <div className="card" style={{ width: 'min(560px,100%)' }}>
        <div className="brand" style={{ padding: 0 }}>
          {brand.logo ? <img src={brand.logo} alt="" /> : <span className="logo">{brand.brand_name.slice(0, 2)}</span>}
          <b>{brand.brand_name}</b>
        </div>
        {state === 'done' ? (
          <>
            <h2>¡Solicitud enviada!</h2>
            <p>Gracias, {f.name.split(' ')[0]}. Te escribo por WhatsApp en menos de 24-48 h para conocerte y ver tu caso.</p>
            {brand.instagram && <p className="muted">Mientras, puedes ver mi trabajo en <a href={`https://instagram.com/${brand.instagram}`} target="_blank" rel="noopener">@{brand.instagram}</a>.</p>}
          </>
        ) : (
          <form className="stack" onSubmit={send}>
            <div><h2>Solicita tu plaza</h2><p className="muted">Rellénalo en 1 minuto. Después hablamos por WhatsApp y, si encaja, una videollamada corta.</p></div>
            <label className="f">Nombre y apellidos<input id="pl-name" required maxLength={120} value={f.name} onChange={set('name')} /></label>
            <div className="grid2">
              <label className="f">WhatsApp<input id="pl-phone" required inputMode="tel" maxLength={40} value={f.phone} onChange={set('phone')} placeholder="+34 600 111 222" /></label>
              <label className="f">Correo<input id="pl-email" type="email" maxLength={160} value={f.email} onChange={set('email')} /></label>
              <label className="f">Posición<input id="pl-pos" maxLength={80} value={f.position} onChange={set('position')} placeholder="Ej. Apertura, flanker…" /></label>
              <label className="f">Qué te interesa<select id="pl-plan" value={f.plan} onChange={set('plan')}>{PLANS.map((p) => <option key={p.name}>{p.name}</option>)}</select></label>
            </div>
            <label className="f">Tu objetivo<input id="pl-goal" maxLength={300} value={f.goal} onChange={set('goal')} placeholder="Ej. Ganar velocidad para la temporada" /></label>
            <label className="f">Lesiones (si tienes alguna)<input id="pl-inj" maxLength={500} value={f.injuries} onChange={set('injuries')} /></label>
            <label className="f">Algo más<textarea maxLength={1500} value={f.message} onChange={set('message')} /></label>
            <label className="row small" style={{ alignItems: 'flex-start' }}>
              <input id="pl-ok" type="checkbox" required style={{ width: 'auto', marginTop: 4 }} checked={f.ok} onChange={(e) => setF({ ...f, ok: e.target.checked })} />
              <span>Acepto que {brand.brand_name} use estos datos (incluidas las lesiones que indique) solo para contactarme sobre mi solicitud. Puedo pedir que se borren cuando quiera.</span>
            </label>
            {err && <p style={{ color: 'var(--bad)' }}>{err}</p>}
            <button className="btn pri" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Enviar solicitud'}</button>
            <p className="muted small">Con {PLATFORM}</p>
          </form>
        )}
      </div>
    </div>
  );
}
