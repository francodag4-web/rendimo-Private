import { createClient } from '@supabase/supabase-js';

// Valores públicos por defecto (la clave publishable está pensada para ir en el navegador;
// la seguridad la ponen las políticas de la base de datos). Se pueden sobrescribir con variables.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://ddxrxkavvzwdofiehejt.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_MLPGjdm461v16TbqyChxBw_JTAywvyG';

if (!url || !key) {
  // Mensaje claro si faltan las variables al desplegar
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const PLATFORM = 'Rendimo';
export const CONSENT_VERSION = 'v1-2026-10';

// Lanza el error en español para mostrarlo en pantalla
export async function q(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(traducir(error.message));
  return data;
}

function traducir(m = '') {
  if (/duplicate key.*slug/i.test(m)) return 'Esa dirección ya la usa otro entrenador. Prueba otra.';
  if (/duplicate key.*email/i.test(m)) return 'Ya existe un jugador con ese correo.';
  if (/duplicate key.*name/i.test(m)) return 'Ya existe un ejercicio con ese nombre.';
  if (/duplicate key/i.test(m)) return 'Ese registro ya existe.';
  if (/row-level security/i.test(m)) return 'No tienes permiso para hacer eso.';
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera un minuto y vuelve a probar.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Revisa internet y vuelve a probar.';
  return m;
}

// Trae todas las filas (la API devuelve como máximo 1000 por petición)
export async function fetchAll(build, size = 1000) {
  const out = [];
  for (let from = 0; ; from += size) {
    const rows = await q(build().range(from, from + size - 1));
    out.push(...rows);
    if (rows.length < size) return out;
  }
}
