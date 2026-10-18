import React, { useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { fileToDataURL } from '../lib/util.js';
import { applyBrand } from '../App.jsx';
import { useAction } from '../ui/ui.jsx';

export default function Settings() {
  const { coach, load } = useCoach();
  const act = useAction();
  const [f, setF] = useState({ brand_name: coach.brand_name, brand_short: coach.brand_short || '', color: coach.color, logo: coach.logo, whatsapp: coach.whatsapp || '', instagram: coach.instagram || '', slug: coach.slug || '' });
  const [pw, setPw] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    act(async () => setF({ ...f, logo: await fileToDataURL(file, 256) }));
  };
  const save = (e) => {
    e.preventDefault();
    act(async () => {
      await q(supabase.from('coaches').update({ brand_name: f.brand_name.trim() || 'Mi marca', brand_short: f.brand_short.trim() || null, color: f.color, logo: f.logo || null, whatsapp: f.whatsapp || null, instagram: f.instagram.replace(/^@/, '').trim() || null, slug: f.slug.replace(/^-+|-+$/g, '') || null }).eq('id', coach.id));
      await load('coach');
      applyBrand(f.color);
    }, 'Marca guardada. Tus jugadores ya la ven.');
  };
  const savePw = (e) => {
    e.preventDefault();
    act(async () => { const { error } = await supabase.auth.updateUser({ password: pw }); if (error) throw error; setPw(''); }, 'Contraseña guardada.');
  };
  return (
    <>
      <div className="pagehead"><div><h1>Marca y cuenta</h1><p>Tus jugadores ven tu nombre, tu logo y tu color en toda la app.</p></div></div>
      <div className="grid2">
        <form className="panel stack" onSubmit={save}>
          <h3>Tu marca</h3>
          <label className="f">Nombre completo<input id="b-name" required value={f.brand_name} onChange={set('brand_name')} placeholder="Ej. FRP · Franco Rugby Performance" /></label>
          <label className="f">Nombre corto (saludo y pestaña)<input id="b-short" value={f.brand_short} onChange={set('brand_short')} placeholder="Ej. FRP" /></label>
          <label className="f">Color principal<span className="row"><input id="b-color" type="color" style={{ width: 60, height: 40, padding: 2 }} value={f.color} onChange={set('color')} /><code>{f.color}</code></span></label>
          <label className="f">Logo (PNG o JPG cuadrado; se reduce a 256 px)<input id="b-logo" type="file" accept="image/*" onChange={onLogo} /></label>
          {f.logo && <div className="row"><img src={f.logo} alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain', background: 'var(--soft)', borderRadius: 10 }} /><button type="button" className="btn sm" onClick={() => setF({ ...f, logo: null })}>Quitar logo</button></div>}
          <label className="f">Tu WhatsApp (para que los jugadores te escriban)<input value={f.whatsapp} onChange={set('whatsapp')} placeholder="34600111222" /></label>
          <label className="f">Tu Instagram (sale en el pie de la app de tus jugadores)<input id="b-ig" value={f.instagram} onChange={set('instagram')} placeholder="@francoalderete.pf" /></label>
          <label className="f">Dirección de tu formulario de solicitudes (solo letras, números y guiones)
            <input id="b-slug" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40) })} placeholder="frp" />
          </label>
          {f.slug && <span className="muted small">Se verá en: {window.location.origin}/#/s/{f.slug}</span>}
          <div className="row"><button className="btn pri" type="submit">Guardar marca</button></div>
        </form>
        <div className="stack">
          <div className="panel stack">
            <h3>Vista previa</h3>
            <div className="row" style={{ padding: 12, borderRadius: 12, background: 'var(--soft)' }}>
              {f.logo ? <img src={f.logo} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} /> : <span style={{ width: 44, height: 44, borderRadius: 10, background: f.color, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'var(--display)' }}>{(f.brand_short || f.brand_name).slice(0, 2)}</span>}
              <b style={{ fontFamily: 'var(--display)', fontSize: 18 }}>{f.brand_name}</b>
              <span className="btn sm" style={{ background: f.color, color: '#fff', borderColor: f.color, marginLeft: 'auto' }}>Botón</span>
            </div>
          </div>
          <form className="panel stack" onSubmit={savePw}>
            <h3>Contraseña (opcional)</h3>
            <p className="muted small">Puedes entrar siempre con el enlace por correo. Si prefieres contraseña, créala aquí.</p>
            <input type="password" minLength={8} required autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={pw} onChange={(e) => setPw(e.target.value)} />
            <div className="row"><button className="btn" type="submit">Guardar contraseña</button></div>
          </form>
        </div>
      </div>
    </>
  );
}
