# Rendimo

Plataforma para preparadores físicos: cada entrenador pone su marca (nombre, logo y color) y sus jugadores entrenan con ella.

- **Entrenador:** jugadores, programación por fases y semanas con bloques A1/A2, plantillas con copias independientes, biblioteca de ejercicios, agenda, notas e historia clínica.
- **Jugador:** check-in diario de bienestar, sesión de hoy, semana y progreso (carga sRPE y bienestar).

## Tecnología
Vite + React, Supabase (Auth, Postgres con seguridad por filas, región UE) y Cloudflare Pages.

## Puesta en marcha
1. En Supabase → SQL Editor, ejecuta `supabase/schema.sql`.
2. Autoriza a los entrenadores: `insert into public.coach_allowlist (email) values ('correo@ejemplo.com');`
3. En Cloudflare (Workers & Pages, conectado a este repositorio): build `npm run build` y deploy `npx wrangler deploy`. La configuración está en `wrangler.jsonc`.

## Desarrollo
```
cp .env.example .env.local   # y rellena los valores
npm install
npm run dev
```
