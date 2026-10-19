import React, { useEffect, useState } from 'react';
import { supabase, PLATFORM } from './lib/supabase.js';
import { AppVersion } from './ui/SettingsKit.jsx';

// Código de invitación guardado al abrir el enlace #/unirse/<código>
export const getInvite = () => { try { return localStorage.getItem('invite'); } catch { return null; } };
export const setInvite = (v) => { try { v ? localStorage.setItem('invite', v) : localStorage.removeItem('invite'); } catch {} };

export default function Login() {
  const invite = getInvite();
  const [inv, setInv] = useState(null); // datos del entrenador que invita
  useEffect(() => {
    if (!invite) return;
    supabase.rpc('public_invite', { code: invite }).then(({ data }) => {
      if (!data) return;
      setInv(data);
      const c = data.color || '';
      if (/^#[0-9a-f]{6}$/i.test(c)) {
        const [r, g, bl] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
        document.documentElement.style.setProperty('--brand', c);
        document.documentElement.style.setProperty('--brand-ink', (0.299 * r + 0.587 * g + 0.114 * bl) / 255 > 0.6 ? '#111' : '#fff');
      }
    });
  }, [invite]);
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
      : await supabase.auth.signInWithOtp({ email: mail, options: { emailRedirectTo: window.location.origin, ...(invite ? { data: { invite } } : {}) } });
    setBusy(false);
    if (error) {
      setErr(/Invalid login/i.test(error.message) ? 'Correo o contraseña incorrectos.'
        : /rate limit|security purposes/i.test(error.message) ? 'Has pedido varios enlaces seguidos. Espera un minuto y vuelve a probar.'
        : /sending.*email/i.test(error.message) ? 'No hemos podido enviar el correo ahora mismo. Prueba en unos minutos o avisa a tu entrenador.'
        : error.message);
      return;
    }
    if (!usePass) setSent(true);
  };

  return (
    <div className="center">
      <form className="card" onSubmit={submit}>
        {inv && !inv.used ? (
          <div className="invite">
            {inv.logo && <img src={inv.logo} alt="" />}
            <h1>Hola, {inv.name}</h1>
            <p><b>{inv.brand_name || 'Tu entrenador'}</b> te ha invitado a su app. Pon tu correo y te mandamos un enlace para entrar: tu cuenta queda vinculada a tu ficha.</p>
          </div>
        ) : (
          <div>
            <h1>{PLATFORM}</h1>
            <p className="muted">Tu entrenamiento, tu progreso y tu entrenador en un sitio.</p>
            {inv?.used && <p className="small">Esta invitación ya se usó. Entra con el correo con el que te registraste.</p>}
          </div>
        )}
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
              {busy ? 'Un momento…' : usePass ? 'Entrar' : inv && !inv.used ? 'Crear mi acceso' : 'Enviarme enlace de acceso'}
            </button>
            <button type="button" className="btn ghost small" onClick={() => { setUsePass(!usePass); setErr(''); }}>
              {usePass ? 'Prefiero entrar con un enlace por correo' : 'Entrar con contraseña'}
            </button>
          </>
        )}
        <p className="small muted legal-links"><a href="#/legal/privacidad">Privacidad</a> · <a href="#/legal/condiciones">Condiciones</a> · <a href="#/legal/aviso">Aviso legal</a></p>
        <AppVersion />
      </form>
    </div>
  );
}
