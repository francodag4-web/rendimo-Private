import React, { useEffect, useState, useCallback } from 'react';
import { supabase, q, PLATFORM } from './lib/supabase.js';
import Login, { getInvite, setInvite } from './Login.jsx';
import CoachApp from './coach/CoachApp.jsx';
import PlayerApp from './player/PlayerApp.jsx';
import Consent from './player/Consent.jsx';
import { Loading } from './ui/ui.jsx';
import PublicLead from './PublicLead.jsx';

// Aplica el color de la marca del entrenador a toda la app
export function applyBrand(color) {
  const c = /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#d9480f';
  document.documentElement.style.setProperty('--brand', c);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  document.documentElement.style.setProperty('--brand-ink', lum > 0.6 ? '#111' : '#fff');
}

export default function App() {
  // Formulario público de solicitudes: #/s/<dirección del entrenador>
  const pub = window.location.hash.match(/^#\/s\/([a-z0-9-]+)/i);
  if (pub) return <PublicLead slug={pub[1].toLowerCase()} />;
  // Enlace de invitación: #/unirse/<código>. Se guarda y se usa al entrar.
  const inv = window.location.hash.match(/^#\/unirse\/([a-f0-9]{16,64})/i);
  if (inv) {
    try { localStorage.setItem('invite', inv[1].toLowerCase()); } catch {}
    window.history.replaceState(null, '', window.location.pathname + '#/');
  }
  return <Private />;
}

function Private() {
  const [session, setSession] = useState(undefined);
  const [access, setAccess] = useState(null); // {coach, player}
  const [mode, setMode] = useState(null); // 'coach' | 'player'
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadAccess = useCallback(async () => {
    setError('');
    try {
      const invite = getInvite();
      let a = await q(supabase.rpc('claim_access'));
      // La invitación solo se usa si esta cuenta aún no es entrenador ni cliente
      if (invite) {
        if (!a.coach && !a.player) {
          const r = await supabase.rpc('claim_access', { invite });
          if (!r.error) a = r.data;
        }
        setInvite(null);
      }
      let p = null;
      if (a.player) {
        const rows = await q(supabase.from('players').select('*').eq('user_id', session.user.id));
        p = rows[0] || null;
      }
      const saved = (() => { try { return localStorage.getItem('mode'); } catch { return null; } })();
      // Todo a la vez para no mostrar un panel equivocado ni un instante
      setPlayer(p);
      setMode(a.coach && a.player ? (saved || 'coach') : a.coach ? 'coach' : a.player ? 'player' : null);
      setAccess(a);
    } catch (e) {
      setError(e.message);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user) loadAccess();
    else { setAccess(null); setMode(null); setPlayer(null); }
  }, [session?.user?.id, loadAccess]);

  const switchMode = (m) => { try { localStorage.setItem('mode', m); } catch {} setMode(m); };
  const logout = async () => { await supabase.auth.signOut(); applyBrand(null); };

  if (session === undefined) return <Loading />;
  if (!session) return <Login />;
  if (error)
    return (
      <div className="center"><div className="card">
        <h2>No se pudo cargar tu cuenta</h2><p className="muted">{error}</p>
        <div className="row"><button className="btn pri" onClick={loadAccess}>Reintentar</button><button className="btn" onClick={logout}>Salir</button></div>
      </div></div>
    );
  if (!access) return <Loading />;
  if (!access.coach && !access.player)
    return (
      <div className="center"><div className="card">
        <h2>Tu cuenta aún no tiene acceso</h2>
        <p>Has entrado como <b>{session.user.email}</b>, pero ningún entrenador te ha dado de alta con este correo en {PLATFORM}.</p>
        <p className="muted">Pide a tu entrenador que te añada con este mismo correo y vuelve a entrar.</p>
        <button className="btn" onClick={logout}>Salir</button>
      </div></div>
    );

  if (mode === 'player' && player) {
    if (!player.consent_at) return <Consent player={player} onDone={loadAccess} onLogout={logout} />;
    return <PlayerApp player={player} session={session} onLogout={logout} canSwitch={access.coach} onSwitch={() => switchMode('coach')} />;
  }
  if (mode === 'coach' && access.coach)
    return <CoachApp session={session} onLogout={logout} canSwitch={access.player} onSwitch={() => switchMode('player')} />;
  return <Loading />;
}
