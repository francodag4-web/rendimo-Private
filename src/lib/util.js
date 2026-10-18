// Utilidades generales

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

// Búsqueda sin tildes ni mayúsculas
export const norm = (s = '') =>
  s.toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const matches = (text, query) => {
  const words = norm(query).trim().split(/\s+/).filter(Boolean);
  const t = norm(text);
  return words.every((w) => t.includes(w));
};

// Fechas en hora local, formato YYYY-MM-DD
export const iso = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const daysBetween = (a, b) => Math.round((parseISO(iso(b)) - parseISO(iso(a))) / 86400000);
// Lunes = 1 ... domingo = 7
export const dow = (d) => ((new Date(d).getDay() + 6) % 7) + 1;
export const mondayOf = (d) => addDays(new Date(d), 1 - dow(d));

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const fmtDate = (s) => {
  if (!s) return '—';
  const d = typeof s === 'string' && s.length === 10 ? parseISO(s) : new Date(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
};
export const fmtDateTime = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Bienestar: suma de 5 ítems 1-5 (5-25). Más alto = mejor.
export const wellness = (c) =>
  c ? ['sleep', 'fatigue', 'soreness', 'stress', 'mood'].reduce((a, k) => a + (Number(c[k]) || 0), 0) : null;

// WhatsApp
export const waURL = (phone, text) => {
  const p = (phone || '').replace(/[^\d]/g, '');
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
};

// Epley: 1RM estimado
export const epley = (kg, reps) => (kg && reps ? Math.round(kg * (1 + reps / 30)) : null);

// Duración desde alta hasta baja (o hoy) en meses con un decimal
export const monthsActive = (p) => {
  const end = p.end_date ? parseISO(p.end_date) : new Date();
  return Math.max(0, daysBetween(parseISO(p.start_date), end) / 30.44);
};

// Redimensiona una imagen a data URL PNG (logo de marca)
export const fileToDataURL = (file, max = 256) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const r = new FileReader();
    r.onload = () => {
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      img.src = r.result;
    };
    r.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    r.readAsDataURL(file);
  });
