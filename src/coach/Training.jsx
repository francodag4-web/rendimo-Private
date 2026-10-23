import React, { useState } from 'react';
import { useCoach } from './CoachApp.jsx';
import { supabase, q } from '../lib/supabase.js';
import { fmtDate, matches } from '../lib/util.js';
import { useAction, useToast, Empty } from '../ui/ui.jsx';

// Formación: manual de uso fijo + artículos y documentos que comparten los entrenadores (con aprobación)
export const DOC_CATS = ['Entrenamiento', 'Readaptación', 'Rendimiento y tests', 'Nutrición', 'Gestión y negocio', 'Otros'];
export const DOC_STATUS = { pendiente: ['En revisión', 'warn'], publicado: ['Publicado', 'ok'], rechazado: ['No publicado', 'bad'] };
export const MANUAL = { title: 'Manual de uso de Rendimo', summary: 'Todas las funciones de la app explicadas en pasos cortos, con capturas y preguntas frecuentes.', url: '/formacion/manual-rendimo.pdf' };
const MAX_MB = 25;
const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg';
export const docUrl = (d) => d.link_url || (d.file_path ? supabase.storage.from('formacion').getPublicUrl(d.file_path).data.publicUrl : '#');
const ext = (d) => (d.link_url ? 'Enlace' : (d.file_name || d.file_path || '').split('.').pop().toUpperCase());
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

export function DocCard({ d, children }) {
  return (
    <article className="doccard" aria-label={d.title}>
      <div className="row small"><span className="pill brand">{d.category}</span><span className="muted">{ext(d)}</span></div>
      <b className="doctitle">{d.title}</b>
      {d.summary && <p className="muted small clamp3">{d.summary}</p>}
      <span className="muted small">{d.author_name || 'Rendimo'} · {fmtDate(d.created_at)}</span>
      <div className="row">{children}</div>
    </article>
  );
}

export default function Training() {
  const { docs = [], uid, isAdmin } = useCoach();
  const [cat, setCat] = useState('');
  const [qy, setQy] = useState('');
  const [form, setForm] = useState(false);
  const pub = docs.filter((d) => d.status === 'publicado');
  const list = pub.filter((d) => (!cat || d.category === cat) && matches(`${d.title} ${d.summary || ''} ${d.author_name || ''}`, qy));
  const mine = docs.filter((d) => d.author_id === uid && d.status !== 'publicado');
  return (
    <>
      <div className="pagehead">
        <div><h1>Formación</h1><p>El manual de la app y artículos o documentos que compartimos los entrenadores para seguir aprendiendo.</p></div>
        <button className="btn pri" onClick={() => setForm(!form)} aria-expanded={form}>+ Compartir un documento</button>
      </div>
      {form && <DocForm onClose={() => setForm(false)} admin={isAdmin} />}
      <section className="panel manualcard" aria-label="Manual de uso">
        <div>
          <span className="kick">Empieza aquí</span>
          <h2>{MANUAL.title}</h2>
          <p className="muted">{MANUAL.summary}</p>
        </div>
        <a className="btn pri" href={MANUAL.url} target="_blank" rel="noopener">Abrir el manual (PDF)</a>
      </section>
      <div className="row">
        <button type="button" className={'chipbtn' + (!cat ? ' on' : '')} aria-pressed={!cat} onClick={() => setCat('')}>Todo ({pub.length})</button>
        {DOC_CATS.filter((c) => pub.some((d) => d.category === c)).map((c) => (
          <button type="button" key={c} className={'chipbtn' + (cat === c ? ' on' : '')} aria-pressed={cat === c} onClick={() => setCat(c)}>{c} ({pub.filter((d) => d.category === c).length})</button>
        ))}
        <input style={{ maxWidth: 260, marginLeft: 'auto' }} placeholder="Buscar" value={qy} onChange={(e) => setQy(e.target.value)} aria-label="Buscar documentos" />
      </div>
      {list.length ? (
        <div className="docgrid">{list.map((d) => (
          <DocCard key={d.id} d={d}><a className="btn sm" href={docUrl(d)} target="_blank" rel="noopener">{d.link_url ? 'Abrir enlace' : 'Abrir'}</a></DocCard>
        ))}</div>
      ) : <Empty>{pub.length ? 'Nada coincide con la búsqueda.' : 'Aún no hay documentos publicados. Comparte el primero con «+ Compartir un documento».'}</Empty>}
      {mine.length > 0 && <MyDocs list={mine} />}
    </>
  );
}

function MyDocs({ list }) {
  const { load } = useCoach();
  const act = useAction();
  const del = (d) => act(async () => {
    await q(supabase.from('training_docs').delete().eq('id', d.id));
    if (d.file_path) await supabase.storage.from('formacion').remove([d.file_path]);
    await load('docs');
  }, 'Aportación retirada.');
  return (
    <section className="panel stack">
      <h3>Mis aportaciones</h3>
      <ul className="list">{list.map((d) => (
        <li key={d.id}>
          <span className="stack" style={{ gap: 2 }}><b>{d.title}</b><span className="muted small">{d.category} · enviado el {fmtDate(d.created_at)}{d.review_note ? ` · Nota: ${d.review_note}` : ''}</span></span>
          <span className="row"><span className={'pill ' + DOC_STATUS[d.status][1]}>{DOC_STATUS[d.status][0]}</span><a className="btn sm" href={docUrl(d)} target="_blank" rel="noopener">Ver</a><button className="btn sm" onClick={() => del(d)}>Retirar</button></span>
        </li>
      ))}</ul>
      <p className="muted small">Un administrador revisa cada aportación antes de publicarla para todos los entrenadores.</p>
    </section>
  );
}

function DocForm({ onClose, admin }) {
  const { uid, load } = useCoach();
  const act = useAction();
  const toast = useToast();
  const [f, setF] = useState({ title: '', summary: '', category: DOC_CATS[0], mode: 'file', link: '', file: null });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (f.mode === 'file' && !f.file) return toast('Elige el archivo.', { error: true });
    if (f.mode === 'file' && f.file.size > MAX_MB * 1048576) return toast(`El archivo pasa de ${MAX_MB} MB.`, { error: true });
    if (f.mode === 'link' && !/^https?:\/\/\S+\.\S+/.test(f.link.trim())) return toast('Pega el enlace completo (empieza por https://).', { error: true });
    setBusy(true);
    act(async () => {
      let file_path = null;
      if (f.mode === 'file') {
        file_path = `${uid}/${Date.now()}-${slug(f.file.name)}`;
        const up = await supabase.storage.from('formacion').upload(file_path, f.file, { contentType: f.file.type || undefined, upsert: false });
        if (up.error) throw new Error('No se pudo subir el archivo: ' + up.error.message);
      }
      const row = { title: f.title.trim(), summary: f.summary.trim() || null, category: f.category, file_path, file_name: f.mode === 'file' ? f.file.name : null, link_url: f.mode === 'link' ? f.link.trim() : null, status: admin ? 'publicado' : 'pendiente', reviewed_at: admin ? new Date().toISOString() : null };
      const r = await supabase.from('training_docs').insert(row);
      if (r.error) { if (file_path) await supabase.storage.from('formacion').remove([file_path]); throw new Error(r.error.message); }
      await load('docs');
      onClose();
    }, admin ? 'Documento publicado para todos los entrenadores.' : 'Enviado. Un administrador lo revisa y te avisamos aquí cuando esté publicado.').finally(() => setBusy(false));
  };
  return (
    <form className="panel stack" onSubmit={submit} aria-label="Compartir un documento">
      <h3>Compartir un documento</h3>
      <div className="grid2">
        <label className="f">Título<input id="doc-title" required maxLength={160} value={f.title} onChange={set('title')} placeholder="Ej. Entrenamiento con restricción de flujo sanguíneo (BFR)" /></label>
        <label className="f">Categoría<select id="doc-cat" value={f.category} onChange={set('category')}>{DOC_CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>
      <label className="f">De qué trata (opcional)<textarea id="doc-sum" maxLength={1000} rows={3} value={f.summary} onChange={set('summary')} placeholder="Dos o tres líneas: qué aporta y a quién le sirve." /></label>
      <div className="row" role="radiogroup" aria-label="Tipo">
        <label className="row small"><input type="radio" name="doc-mode" style={{ width: 'auto' }} checked={f.mode === 'file'} onChange={() => setF({ ...f, mode: 'file' })} /> Subir archivo</label>
        <label className="row small"><input type="radio" name="doc-mode" style={{ width: 'auto' }} checked={f.mode === 'link'} onChange={() => setF({ ...f, mode: 'link' })} /> Enlace (artículo, vídeo, Drive…)</label>
      </div>
      {f.mode === 'file'
        ? <label className="f">Archivo (PDF, Word, PowerPoint o imagen; máx. {MAX_MB} MB)<input id="doc-file" type="file" accept={ACCEPT} onChange={(e) => setF({ ...f, file: e.target.files?.[0] || null })} /></label>
        : <label className="f">Enlace<input id="doc-link" inputMode="url" value={f.link} onChange={set('link')} placeholder="https://" /></label>}
      <div className="row">
        <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Subiendo…' : admin ? 'Publicar' : 'Enviar a revisión'}</button>
        <button type="button" className="btn" onClick={onClose}>Cancelar</button>
      </div>
      {!admin && <p className="muted small">Lo revisa un administrador antes de que lo vean todos. Comparte solo material tuyo o con permiso para difundirlo.</p>}
    </form>
  );
}
