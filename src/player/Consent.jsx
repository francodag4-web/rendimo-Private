import React, { useEffect, useState } from 'react';
import { supabase, q, CONSENT_VERSION } from '../lib/supabase.js';
import { applyBrand } from '../App.jsx';
import { useAction } from '../ui/ui.jsx';

export default function Consent({ player, onDone, onLogout }) {
  const [coach, setCoach] = useState(null);
  const [ok1, setOk1] = useState(false);
  const [ok2, setOk2] = useState(false);
  const act = useAction();

  useEffect(() => {
    supabase.from('coaches').select('brand_name,color,logo,email').eq('id', player.coach_id).limit(1)
      .then(({ data }) => { const c = data?.[0] || null; setCoach(c); applyBrand(c?.color); });
  }, [player.coach_id]);

  const accept = () => act(async () => {
    await q(supabase.rpc('accept_consent', { version: CONSENT_VERSION }));
    onDone();
  });

  const who = coach?.brand_name || 'tu entrenador';
  return (
    <div className="center">
      <div className="card" style={{ width: 'min(560px,100%)' }}>
        {coach?.logo && <img src={coach.logo} alt="" style={{ width: 56, height: 56, objectFit: 'contain' }} />}
        <h2>Antes de empezar</h2>
        <p>Hola {player.name.split(' ')[0]}. Para preparar y ajustar tu entrenamiento, <b>{who}</b> va a guardar en esta app:</p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Tus datos de contacto y tu plan.</li>
          <li>Tus entrenamientos, cargas, esfuerzo (RPE) y check-in diario de bienestar.</li>
          <li><b>Datos de salud</b>: lesiones, molestias, antecedentes e informes que tú compartas.</li>
        </ul>
        <p className="small muted">
          Responsable: {who}{coach?.email ? ` (${coach.email})` : ''}. Finalidad: planificar y ajustar tu entrenamiento.
          Los datos se guardan cifrados en servidores de la Unión Europea, solo los ve tu entrenador y no se ceden a nadie.
          Puedes pedir verlos, corregirlos o borrarlos en cualquier momento escribiendo a tu entrenador, y retirar este consentimiento.
          Si lo retiras, dejarás de poder usar la app. Base legal: tu consentimiento expreso (RGPD, art. 6.1.a y 9.2.a).
        </p>
        <label className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <input type="checkbox" checked={ok1} onChange={(e) => setOk1(e.target.checked)} style={{ width: 20, marginTop: 3 }} />
          <span>Acepto que se traten mis datos para gestionar mi entrenamiento.</span>
        </label>
        <label className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <input type="checkbox" checked={ok2} onChange={(e) => setOk2(e.target.checked)} style={{ width: 20, marginTop: 3 }} />
          <span>Doy mi consentimiento <b>expreso</b> para el tratamiento de mis datos de salud con esa finalidad.</span>
        </label>
        <div className="row">
          <button className="btn pri" disabled={!ok1 || !ok2} onClick={accept}>Aceptar y entrar</button>
          <button className="btn" onClick={onLogout}>Salir</button>
        </div>
      </div>
    </div>
  );
}
