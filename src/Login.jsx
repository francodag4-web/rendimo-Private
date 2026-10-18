import React, { useState } from 'react';
import { supabase, PLATFORM } from './lib/supabase.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [usePass, setUsePass] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const mail = email.trim().toLowerCase();
    const { error } = usePass
      ? await supabase.auth.signInWithPassword({ email: mail, password: pass })
      : await supabase.auth.signInWithOtp({ email: mail, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) {
      setErr(/Invalid login/i.test(error.message) ? 'Correo o contraseña incorrectos.'
        : /rate limit|security purposes/i.test(error.message) ? 'Has pedido varios enlaces seguidos. Espera un minuto y vuelve a probar.'
        : error.message);
      return;
    }
    if (!usePass) setSent(true);
  };

  return (
    <div className="center">
      <form className="card" onSubmit={submit}>
        <div>
          <h1>{PLATFORM}</h1>
          <p className="muted">Tu entrenamiento, tu progreso y tu entrenador en un sitio.</p>
        </div>
        {sent ? (
          <>
            <p>Te hemos enviado un enlace a <b>{email}</b>. Ábrelo desde este mismo dispositivo para entrar.</p>
            <p className="muted small">¿No llega? Mira en spam o promociones. Puede tardar un minuto.</p>
            <button type="button" className="btn" onClick={() => setSent(false)}>Usar otro correo</button>
          </>
        ) : (
          <>
            <label className="f">Correo
              <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
            </label>
            {usePass && (
              <label className="f">Contraseña
                <input id="login-pass" type="password" required autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
              </label>
            )}
            {err && <p style={{ color: 'var(--bad)' }} role="alert">{err}</p>}
            <button className="btn pri" type="submit" disabled={busy}>
              {busy ? 'Un momento…' : usePass ? 'Entrar' : 'Enviarme enlace de acceso'}
            </button>
            <button type="button" className="btn ghost small" onClick={() => { setUsePass(!usePass); setErr(''); }}>
              {usePass ? 'Prefiero entrar con un enlace por correo' : 'Entrar con contraseña'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
