-- =====================================================================
-- Esquema de la plataforma (multi-entrenador, marca personalizable)
-- Pegar entero en Supabase -> SQL Editor -> Run. Se puede ejecutar
-- de nuevo sin romper nada (usa "if not exists" / "or replace").
-- =====================================================================

-- ---------- Tablas ----------------------------------------------------

-- Correos autorizados a ser entrenador (se rellena a mano o con seed.sql)
create table if not exists public.coach_allowlist (
  email text primary key check (email = lower(email))
);

-- Entrenadores: uno por usuario de Auth. Guarda su marca.
create table if not exists public.coaches (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  brand_name  text not null default 'Mi marca',
  brand_short text,
  logo        text,                              -- imagen pequeña en data URL
  color       text not null default '#d9480f' check (color ~ '^#[0-9a-fA-F]{6}$'),
  whatsapp    text,
  instagram   text,
  created_at  timestamptz not null default now()
);
alter table public.coaches add column if not exists instagram text;

-- Jugadores / clientes de cada entrenador
create table if not exists public.players (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references public.coaches(id) on delete cascade,
  user_id         uuid unique references auth.users(id) on delete set null,
  email           text not null check (email = lower(email)),
  name            text not null,
  phone           text,
  position        text,
  plan            text,
  start_date      date not null default current_date,
  end_date        date,
  end_reason      text,
  important       text,
  restrictions    text,
  consent_at      timestamptz,
  consent_version text,
  created_at      timestamptz not null default now(),
  unique (coach_id, email)
);
create index if not exists players_coach_idx on public.players(coach_id);

-- Historia clínica (solo el entrenador la edita; el jugador puede leer la suya)
create table if not exists public.health (
  player_id  uuid primary key references public.players(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Biblioteca de ejercicios de cada entrenador
create table if not exists public.exercises (
  id             uuid primary key default gen_random_uuid(),
  coach_id       uuid not null references public.coaches(id) on delete cascade,
  name           text not null,
  type           text not null default 'Fuerza',
  primary_muscle text,
  secondary      text[] not null default '{}',
  video_url      text,
  notes          text,
  category       text,
  created_at     timestamptz not null default now(),
  unique (coach_id, name)
);
alter table public.exercises add column if not exists category text;

-- Programas: plantilla (player_id null) o copia asignada a un jugador
create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.coaches(id) on delete cascade,
  player_id   uuid references public.players(id) on delete cascade,
  template_id uuid references public.programs(id) on delete set null,
  name        text not null,
  start_date  date,
  data        jsonb not null default '{"phases":[]}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists programs_coach_idx on public.programs(coach_id);
create index if not exists programs_player_idx on public.programs(player_id);

-- Check-in diario de bienestar (escala 1-5) y dolor (0-10)
create table if not exists public.checkins (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references public.players(id) on delete cascade,
  date       date not null default current_date,
  sleep      smallint check (sleep between 1 and 5),
  fatigue    smallint check (fatigue between 1 and 5),
  soreness   smallint check (soreness between 1 and 5),
  stress     smallint check (stress between 1 and 5),
  mood       smallint check (mood between 1 and 5),
  pain       smallint check (pain between 0 and 10),
  note       text,
  created_at timestamptz not null default now(),
  unique (player_id, date)
);

-- Registro de sesiones hechas (RPE x minutos = sRPE, Foster 2001)
create table if not exists public.session_logs (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.players(id) on delete cascade,
  program_id   uuid references public.programs(id) on delete set null,
  session_key  text not null,
  date         date not null default current_date,
  rpe          numeric(3,1) check (rpe between 0 and 10),
  duration_min smallint check (duration_min between 0 and 600),
  srpe         numeric generated always as (rpe * duration_min) stored,
  sets         jsonb not null default '[]'::jsonb,
  note         text,
  created_at   timestamptz not null default now(),
  unique (player_id, session_key, date)
);

-- Notas del entrenador sobre un jugador
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  kind       text not null default 'nota' check (kind in ('importante','nota')),
  text       text not null,
  remind_at  timestamptz,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tareas de la agenda del entrenador
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  player_id  uuid references public.players(id) on delete set null,
  title      text not null,
  due_at     timestamptz not null,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Funciones auxiliares (sin recursión en las políticas) -----

create or replace function public.is_coach() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.coaches where id = auth.uid());
$$;

create or replace function public.my_player_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.players where user_id = auth.uid() limit 1;
$$;

create or replace function public.my_coach_as_player() returns uuid
language sql stable security definer set search_path = '' as $$
  select coach_id from public.players where user_id = auth.uid() limit 1;
$$;

create or replace function public.coach_of(p uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select coach_id from public.players where id = p;
$$;

-- Al entrar: vincula la cuenta con su ficha de jugador o de entrenador
create or replace function public.claim_access() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mail text := lower(coalesce(auth.jwt() ->> 'email', ''));
  is_c boolean;
  is_p boolean;
begin
  if uid is null or mail = '' then
    return jsonb_build_object('coach', false, 'player', false);
  end if;
  if exists (select 1 from public.coach_allowlist where email = mail) then
    insert into public.coaches (id, email) values (uid, mail) on conflict (id) do nothing;
  end if;
  update public.players set user_id = uid
   where email = mail and user_id is null;
  select exists (select 1 from public.coaches where id = uid) into is_c;
  select exists (select 1 from public.players where user_id = uid) into is_p;
  return jsonb_build_object('coach', is_c, 'player', is_p);
end $$;

-- El jugador acepta el consentimiento de datos de salud (RGPD art. 9.2.a)
create or replace function public.accept_consent(version text) returns void
language sql security definer set search_path = '' as $$
  update public.players set consent_at = now(), consent_version = version
   where user_id = auth.uid();
$$;

-- updated_at automático
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists programs_touch on public.programs;
create trigger programs_touch before update on public.programs
  for each row execute function public.touch_updated_at();
drop trigger if exists health_touch on public.health;
create trigger health_touch before update on public.health
  for each row execute function public.touch_updated_at();

-- ---------- Permisos -----------------------------------------------

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.coaches, public.health, public.exercises, public.programs,
  public.checkins, public.session_logs, public.notes, public.tasks
  to authenticated;
-- players: el entrenador no puede tocar user_id ni el consentimiento
revoke all on public.players from authenticated;
grant select, delete on public.players to authenticated;
grant insert (coach_id, email, name, phone, position, plan, start_date, end_date,
              end_reason, important, restrictions) on public.players to authenticated;
grant update (email, name, phone, position, plan, start_date, end_date,
              end_reason, important, restrictions) on public.players to authenticated;
-- coaches: id y email no se cambian desde la app
revoke insert on public.coaches from authenticated;
revoke update on public.coaches from authenticated;
grant update (brand_name, brand_short, logo, color, whatsapp, instagram) on public.coaches to authenticated;
revoke all on public.coach_allowlist from authenticated;

grant execute on function public.claim_access() to authenticated;
grant execute on function public.accept_consent(text) to authenticated;
revoke execute on function public.claim_access() from anon;
revoke execute on function public.accept_consent(text) from anon;

-- ---------- Seguridad por filas -----------------------------------

alter table public.coach_allowlist enable row level security;
alter table public.coaches      enable row level security;
alter table public.players      enable row level security;
alter table public.health       enable row level security;
alter table public.exercises    enable row level security;
alter table public.programs     enable row level security;
alter table public.checkins     enable row level security;
alter table public.session_logs enable row level security;
alter table public.notes        enable row level security;
alter table public.tasks        enable row level security;

-- coaches
drop policy if exists coaches_read on public.coaches;
create policy coaches_read on public.coaches for select to authenticated
  using (id = auth.uid() or id = public.my_coach_as_player());
drop policy if exists coaches_update on public.coaches;
create policy coaches_update on public.coaches for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- players
drop policy if exists players_coach on public.players;
create policy players_coach on public.players for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
drop policy if exists players_self on public.players;
create policy players_self on public.players for select to authenticated
  using (user_id = auth.uid());

-- health
drop policy if exists health_coach on public.health;
create policy health_coach on public.health for all to authenticated
  using (public.coach_of(player_id) = auth.uid())
  with check (public.coach_of(player_id) = auth.uid());
drop policy if exists health_self on public.health;
create policy health_self on public.health for select to authenticated
  using (player_id = public.my_player_id());

-- exercises
drop policy if exists exercises_coach on public.exercises;
create policy exercises_coach on public.exercises for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
drop policy if exists exercises_player on public.exercises;
create policy exercises_player on public.exercises for select to authenticated
  using (coach_id = public.my_coach_as_player());

-- programs
drop policy if exists programs_coach on public.programs;
create policy programs_coach on public.programs for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid()
              and (player_id is null or public.coach_of(player_id) = auth.uid()));
drop policy if exists programs_player on public.programs;
create policy programs_player on public.programs for select to authenticated
  using (player_id is not null and player_id = public.my_player_id());

-- checkins
drop policy if exists checkins_self on public.checkins;
create policy checkins_self on public.checkins for all to authenticated
  using (player_id = public.my_player_id()) with check (player_id = public.my_player_id());
drop policy if exists checkins_coach on public.checkins;
create policy checkins_coach on public.checkins for select to authenticated
  using (public.coach_of(player_id) = auth.uid());

-- session_logs
drop policy if exists logs_self on public.session_logs;
create policy logs_self on public.session_logs for all to authenticated
  using (player_id = public.my_player_id()) with check (player_id = public.my_player_id());
drop policy if exists logs_coach on public.session_logs;
create policy logs_coach on public.session_logs for select to authenticated
  using (public.coach_of(player_id) = auth.uid());

-- notes
drop policy if exists notes_coach on public.notes;
create policy notes_coach on public.notes for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and public.coach_of(player_id) = auth.uid());

-- tasks
drop policy if exists tasks_coach on public.tasks;
create policy tasks_coach on public.tasks for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid()
              and (player_id is null or public.coach_of(player_id) = auth.uid()));

-- ---------- Alertas (añadido) ----------
-- Seguimiento de alertas: sin gestionar / pendiente (con fecha) / gestionada, y urgencia
create table if not exists public.alert_actions (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  alert_key  text not null,
  status     text not null default 'pendiente' check (status in ('pendiente','gestionada')),
  urgent     boolean not null default false,
  due_date   date,
  note       text,
  updated_at timestamptz not null default now(),
  unique (coach_id, player_id, alert_key)
);
grant select, insert, update, delete on public.alert_actions to authenticated;
alter table public.alert_actions enable row level security;
drop policy if exists alert_actions_coach on public.alert_actions;
create policy alert_actions_coach on public.alert_actions for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and public.coach_of(player_id) = auth.uid());
drop trigger if exists alert_actions_touch on public.alert_actions;
create trigger alert_actions_touch before update on public.alert_actions
  for each row execute function public.touch_updated_at();


-- ===== Funciones del prototipo (6-prototipo.sql) =====
-- =====================================================================
-- Rendimo · funciones del prototipo FRP
-- Ficha completa del jugador, evolución, tests, lesiones, pagos,
-- solicitudes (con formulario público) y bloques guardados.
-- Se puede ejecutar más de una vez sin romper nada.
-- =====================================================================

-- ---------- Jugador: datos de la ficha ----------
alter table public.players add column if not exists objective      text;
alter table public.players add column if not exists club_days      text;
alter table public.players add column if not exists extra_days     text;
alter table public.players add column if not exists equipment      text;
alter table public.players add column if not exists screening      text default 'pendiente';
alter table public.players add column if not exists review_days    smallint default 14;
alter table public.players add column if not exists next_review    date;
alter table public.players add column if not exists commitment_months smallint default 3;
alter table public.players add column if not exists fee            numeric(8,2);
alter table public.players add column if not exists fee_type       text default 'mensual';
alter table public.players add column if not exists flags          text[] not null default '{}';

grant insert (coach_id, email, name, phone, position, plan, start_date, end_date, end_reason, important, restrictions,
              objective, club_days, extra_days, equipment, screening, review_days, next_review, commitment_months, fee, fee_type, flags)
  on public.players to authenticated;
grant update (email, name, phone, position, plan, start_date, end_date, end_reason, important, restrictions,
              objective, club_days, extra_days, equipment, screening, review_days, next_review, commitment_months, fee, fee_type, flags)
  on public.players to authenticated;

-- ---------- Entrenador: identificador público para el formulario ----------
alter table public.coaches add column if not exists slug text unique;
grant update (brand_name, brand_short, logo, color, whatsapp, instagram, slug) on public.coaches to authenticated;

-- ---------- Ejercicios: semana con nombre (en JSON) no necesita columna ----------

-- ---------- Evolución y ajustes ----------
create table if not exists public.evolution (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  date       date not null default current_date,
  category   text not null default 'ajuste' check (category in ('ajuste','valor','molestia','test','comunicacion')),
  text       text not null,
  created_at timestamptz not null default now()
);

-- ---------- Tests ----------
create table if not exists public.tests (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  date       date not null default current_date,
  test       text not null,
  unit       text,
  value      numeric(10,2),
  value_r    numeric(10,2),          -- lado derecho si el test es bilateral (value = izquierdo)
  better     text not null default 'mas' check (better in ('mas','menos')),
  note       text,
  created_at timestamptz not null default now()
);

-- ---------- Lesiones (gravedad según días de baja, Fuller et al. 2007) ----------
create table if not exists public.injuries (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  date       date not null default current_date,
  zone       text not null,
  side       text check (side in ('izq','der','central')),
  kind       text,
  days_out   smallint,
  status     text not null default 'activa' check (status in ('activa','readaptacion','recuperada')),
  recurrence boolean not null default false,
  note       text,
  created_at timestamptz not null default now()
);

-- ---------- Pagos (control manual por mes) ----------
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  month      text not null check (month ~ '^\d{4}-\d{2}$'),
  amount     numeric(8,2),
  paid_at    date not null default current_date,
  unique (player_id, month)
);

-- ---------- Solicitudes ----------
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  created_at timestamptz not null default now(),
  name       text not null,
  phone      text,
  email      text,
  position   text,
  plan       text,
  goal       text,
  injuries   text,
  message    text,
  stage      smallint not null default 0,   -- 0 contactar · 1 videollamada · 2 alta
  call_at    timestamptz,
  status     text not null default 'activa' check (status in ('activa','convertida','descartada')),
  player_id  uuid references public.players(id) on delete set null
);

-- Formulario público: cualquiera puede enviar una solicitud a un entrenador por su identificador
create or replace function public.submit_lead(coach_slug text, p jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  select id into cid from public.coaches where slug = lower(coach_slug);
  if cid is null then return false; end if;
  if coalesce(trim(p->>'name'),'') = '' or length(p::text) > 5000 then return false; end if;
  insert into public.leads (coach_id, name, phone, email, position, plan, goal, injuries, message)
  values (cid, left(trim(p->>'name'),120), left(p->>'phone',40), left(lower(p->>'email'),160), left(p->>'position',80),
          left(p->>'plan',80), left(p->>'goal',300), left(p->>'injuries',500), left(p->>'message',1500));
  return true;
end $$;
grant execute on function public.submit_lead(text, jsonb) to anon, authenticated;

-- Datos públicos de la marca para pintar el formulario (sin correo ni teléfono)
create or replace function public.public_brand(coach_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('brand_name', brand_name, 'logo', logo, 'color', color, 'instagram', instagram)
    from public.coaches where slug = lower(coach_slug);
$$;
grant execute on function public.public_brand(text) to anon, authenticated;

-- ---------- Bloques guardados ----------
create table if not exists public.saved_blocks (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  name       text not null,
  data       jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------- Permisos y seguridad por filas ----------
grant select, insert, update, delete on public.evolution, public.tests, public.injuries,
  public.payments, public.leads, public.saved_blocks to authenticated;
alter table public.evolution    enable row level security;
alter table public.tests        enable row level security;
alter table public.injuries     enable row level security;
alter table public.payments     enable row level security;
alter table public.leads        enable row level security;
alter table public.saved_blocks enable row level security;

-- Solo el entrenador de ese jugador
drop policy if exists evolution_coach on public.evolution;
create policy evolution_coach on public.evolution for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid() and public.coach_of(player_id) = auth.uid());
drop policy if exists tests_coach on public.tests;
create policy tests_coach on public.tests for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid() and public.coach_of(player_id) = auth.uid());
drop policy if exists injuries_coach on public.injuries;
create policy injuries_coach on public.injuries for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid() and public.coach_of(player_id) = auth.uid());
drop policy if exists payments_coach on public.payments;
create policy payments_coach on public.payments for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid() and public.coach_of(player_id) = auth.uid());
drop policy if exists leads_coach on public.leads;
create policy leads_coach on public.leads for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and (player_id is null or public.coach_of(player_id) = auth.uid()));
drop policy if exists blocks_coach on public.saved_blocks;
create policy blocks_coach on public.saved_blocks for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- El jugador puede ver sus propios tests (para su progreso)
drop policy if exists tests_self on public.tests;
create policy tests_self on public.tests for select to authenticated
  using (player_id = public.my_player_id());


-- ===== Nota de la semana y pagos visibles para el jugador (8-semana.sql) =====
-- Rendimo · 8: nota de la semana para cada jugador y que el jugador vea sus pagos
-- Se puede ejecutar varias veces sin problema.

-- Nota de la semana (la escribe el entrenador, la lee el jugador en «Hoy»)
create table if not exists public.week_notes (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  week       date not null,                      -- lunes de esa semana
  text       text not null check (length(text) <= 1000),
  updated_at timestamptz not null default now(),
  unique (player_id, week)
);
alter table public.week_notes enable row level security;
grant select, insert, update, delete on public.week_notes to authenticated;

drop policy if exists week_notes_coach on public.week_notes;
create policy week_notes_coach on public.week_notes for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid() and public.coach_of(player_id) = auth.uid());
drop policy if exists week_notes_self on public.week_notes;
create policy week_notes_self on public.week_notes for select to authenticated
  using (player_id = public.my_player_id());

-- El jugador ve sus propios pagos (solo lectura)
drop policy if exists payments_self on public.payments;
create policy payments_self on public.payments for select to authenticated
  using (player_id = public.my_player_id());


-- ===== Calendario del club (9-club.sql) =====
-- Rendimo · 9: calendario del club de cada jugador (días de entreno y partidos)
-- Lo pueden editar el entrenador y el propio jugador. Se puede ejecutar varias veces.

-- Días fijos de entreno con el club (1 = lunes … 7 = domingo)
create table if not exists public.club_schedule (
  player_id  uuid primary key references public.players(id) on delete cascade,
  weekdays   smallint[] not null default '{}',
  time       text check (length(time) <= 20),
  updated_at timestamptz not null default now()
);

-- Partidos y cambios puntuales (p. ej. «esta semana no hay entreno»)
create table if not exists public.club_events (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references public.players(id) on delete cascade,
  date       date not null,
  kind       text not null default 'partido' check (kind in ('partido','entreno','sin_entreno')),
  label      text check (length(label) <= 80),
  home       boolean,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists club_events_player_idx on public.club_events(player_id, date);

alter table public.club_schedule enable row level security;
alter table public.club_events  enable row level security;
grant select, insert, update, delete on public.club_schedule, public.club_events to authenticated;

-- El entrenador de ese jugador y el propio jugador
drop policy if exists club_schedule_rw on public.club_schedule;
create policy club_schedule_rw on public.club_schedule for all to authenticated
  using (player_id = public.my_player_id() or public.coach_of(player_id) = auth.uid())
  with check (player_id = public.my_player_id() or public.coach_of(player_id) = auth.uid());
drop policy if exists club_events_rw on public.club_events;
create policy club_events_rw on public.club_events for all to authenticated
  using (player_id = public.my_player_id() or public.coach_of(player_id) = auth.uid())
  with check (player_id = public.my_player_id() or public.coach_of(player_id) = auth.uid());


-- ===== Planes y ofertas editables (10-planes.sql) =====
-- Rendimo · 10: planes y ofertas editables por el entrenador
-- Se puede ejecutar varias veces sin problema.

create table if not exists public.plans (
  id                uuid primary key default gen_random_uuid(),
  coach_id          uuid not null references public.coaches(id) on delete cascade,
  name              text not null check (length(name) between 1 and 60),
  fee               numeric(8,2) not null check (fee >= 0),
  fee_type          text not null default 'mensual' check (fee_type in ('mensual','unico')),
  commitment_months smallint check (commitment_months between 0 and 36),
  review_days       smallint check (review_days between 1 and 90),
  pitch             text check (length(pitch) <= 300),
  features          text[] not null default '{}',
  tag               text check (length(tag) <= 40),
  color             text not null default 't-g',
  is_offer          boolean not null default false,
  old_fee           numeric(8,2),           -- precio normal (sale tachado en las ofertas)
  valid_until       date,                   -- la oferta deja de verse después de esta fecha
  active            boolean not null default true,
  sort              smallint not null default 0,
  created_at        timestamptz not null default now(),
  unique (coach_id, name)
);
alter table public.plans enable row level security;
grant select, insert, update, delete on public.plans to authenticated;

drop policy if exists plans_coach on public.plans;
create policy plans_coach on public.plans for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
-- El jugador ve los planes activos de su entrenador
drop policy if exists plans_player on public.plans;
create policy plans_player on public.plans for select to authenticated
  using (active and coach_id = public.coach_of(public.my_player_id()));

-- Planes activos para el formulario público (sin cuenta)
create or replace function public.public_plans(coach_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(p) - 'coach_id' - 'created_at' order by p.sort, p.fee), '[]'::jsonb)
  from public.plans p join public.coaches c on c.id = p.coach_id
  where c.slug = lower(coach_slug) and p.active and (p.valid_until is null or p.valid_until >= current_date);
$$;
grant execute on function public.public_plans(text) to anon, authenticated;

-- Los tres planes de partida para cada entrenador (no toca los que ya existan)
insert into public.plans (coach_id, name, fee, fee_type, commitment_months, review_days, pitch, features, tag, color, sort)
select c.id, v.name, v.fee, v.fee_type, v.cm, v.rd, v.pitch, v.features, v.tag, v.color, v.sort
from public.coaches c cross join (values
  ('Programa pretemporada', 39, 'unico', null::smallint, null::smallint, 'Para entrenar por tu cuenta con un plan serio.',
    array['8 semanas de fuerza, velocidad y resistencia','Vídeo de cada ejercicio','Tests de inicio y final para comprobar el progreso'], 'Sin seguimiento', 't-a', 1),
  ('Coaching rugby', 89, 'mensual', 3::smallint, 14::smallint, 'Plan personalizado y seguimiento para rendir en el campo.',
    array['Valoración y tests iniciales','Plan adaptado a su posición y calendario del club','Ajuste de cargas cada dos semanas','WhatsApp para dudas','Re-test al final de cada bloque'], 'El más elegido', 't-g', 2),
  ('Readaptación', 149, 'mensual', 3::smallint, 7::smallint, 'Vuelta al juego tras lesión, por fases y con criterios.',
    array['Todo lo del coaching rugby','Revisión semanal','Criterios objetivos para volver al contacto','Coordinación con su fisio o médico si hace falta'], 'Plazas limitadas', 't-r', 3)
) as v(name, fee, fee_type, cm, rd, pitch, features, tag, color, sort)
on conflict (coach_id, name) do nothing;


-- ===== Pago trimestral (11-trimestral.sql) =====
-- Rendimo · 11: permitir el pago trimestral en los planes
alter table public.plans drop constraint if exists plans_fee_type_check;
alter table public.plans add constraint plans_fee_type_check check (fee_type in ('mensual','trimestral','unico'));

-- 12 · Tipo de cliente: juega en un equipo (club y partidos) o entrenamiento personal
alter table public.players add column if not exists kind text not null default 'equipo';
alter table public.players drop constraint if exists players_kind_check;
alter table public.players add constraint players_kind_check check (kind in ('equipo','personal'));
grant insert (kind), update (kind) on public.players to authenticated;

-- 13 · Invitar sin correo: enlace personal por WhatsApp; el cliente se registra con su correo
alter table public.players alter column email drop not null;
alter table public.players add column if not exists invite_code text unique
  default replace(gen_random_uuid()::text, '-', '');
update public.players set invite_code = replace(gen_random_uuid()::text, '-', '') where invite_code is null;

-- Datos mínimos para la pantalla de bienvenida del enlace (sin sesión)
create or replace function public.public_invite(code text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', split_part(p.name, ' ', 1), 'brand_name', c.brand_name,
    'color', c.color, 'logo', c.logo, 'used', p.user_id is not null)
    from public.players p join public.coaches c on c.id = p.coach_id
   where p.invite_code = code and p.end_date is null limit 1;
$$;
grant execute on function public.public_invite(text) to anon, authenticated;

-- Al entrar: vincula por correo (como antes) o por el código del enlace de invitación
drop function if exists public.claim_access();
create or replace function public.claim_access(invite text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mail text := lower(coalesce(auth.jwt() ->> 'email', ''));
  code text := coalesce(nullif(invite, ''), auth.jwt() -> 'user_metadata' ->> 'invite');
  is_c boolean;
  is_p boolean;
begin
  if uid is null or mail = '' then
    return jsonb_build_object('coach', false, 'player', false);
  end if;
  if exists (select 1 from public.coach_allowlist where email = mail) then
    insert into public.coaches (id, email) values (uid, mail) on conflict (id) do nothing;
  end if;
  update public.players set user_id = uid
   where email = mail and user_id is null;
  -- Un entrenador o alguien que ya es cliente no puede quedarse una invitación ajena por tener la sesión abierta
  if code is not null and not exists (select 1 from public.coaches where id = uid)
     and not exists (select 1 from public.players where user_id = uid) then
    begin
      update public.players set user_id = uid, email = mail
       where invite_code = code and user_id is null;
    exception when unique_violation then
      update public.players set user_id = uid
       where invite_code = code and user_id is null;
    end;
  end if;
  select exists (select 1 from public.coaches where id = uid) into is_c;
  select exists (select 1 from public.players where user_id = uid) into is_p;
  return jsonb_build_object('coach', is_c, 'player', is_p);
end $$;
grant execute on function public.claim_access(text) to authenticated;

-- 14 · Borrar mi cuenta desde la app (App Store 5.1.1(v) y RGPD art. 17)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mail text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if uid is null then raise exception 'Sin sesión'; end if;
  delete from public.players where user_id = uid;          -- su ficha de cliente y todo su historial
  delete from public.coach_allowlist where email = mail;
  delete from public.coaches where id = uid;               -- si es entrenador: su marca, clientes y programas
  delete from auth.users where id = uid;                   -- la cuenta de acceso
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;


-- 15 · Borrado de cuenta del cliente con confirmación del entrenador (48 h; si no confirma, se borra solo)
alter table public.players add column if not exists delete_requested_at timestamptz;

-- El cliente pide borrar su cuenta (o la recupera si cambia de idea)
create or replace function public.request_account_deletion() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare t timestamptz;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  update public.players set delete_requested_at = now() where user_id = auth.uid() and delete_requested_at is null;
  select delete_requested_at into t from public.players where user_id = auth.uid() limit 1;
  return t;
end $$;
create or replace function public.cancel_account_deletion() returns void
language sql security definer set search_path = '' as $$
  update public.players set delete_requested_at = null where user_id = auth.uid();
$$;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;

-- Borra una ficha y su acceso (si esa cuenta no es entrenador ni tiene otras fichas)
create or replace function public.purge_player(pid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  select user_id into u from public.players where id = pid;
  delete from public.players where id = pid;
  if u is not null and not exists (select 1 from public.coaches where id = u)
     and not exists (select 1 from public.players where user_id = u) then
    delete from auth.users where id = u;
  end if;
end $$;
revoke all on function public.purge_player(uuid) from public, anon, authenticated;

-- El entrenador confirma (doble check)
create or replace function public.confirm_client_deletion(pid uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.players where id = pid and coach_id = auth.uid() and delete_requested_at is not null) then
    raise exception 'Este cliente no tiene una solicitud de borrado';
  end if;
  perform public.purge_player(pid);
end $$;
grant execute on function public.confirm_client_deletion(uuid) to authenticated;

-- Pasadas 48 h sin confirmar: se borra igualmente
create or replace function public.process_due_deletions() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select id from public.players where delete_requested_at < now() - interval '48 hours' loop
    perform public.purge_player(r.id); n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.process_due_deletions() from public, anon, authenticated;

-- Cada hora (pg_cron) …
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('rendimo-borrados-48h', '7 * * * *', 'select public.process_due_deletions()');

-- … y también cada vez que alguien entra en la app (por si la tarea horaria no estuviera activa)
create or replace function public.claim_access(invite text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mail text := lower(coalesce(auth.jwt() ->> 'email', ''));
  code text := coalesce(nullif(invite, ''), auth.jwt() -> 'user_metadata' ->> 'invite');
  is_c boolean;
  is_p boolean;
begin
  perform public.process_due_deletions();
  if uid is null or mail = '' then
    return jsonb_build_object('coach', false, 'player', false);
  end if;
  if exists (select 1 from public.coach_allowlist where email = mail) then
    insert into public.coaches (id, email) values (uid, mail) on conflict (id) do nothing;
  end if;
  update public.players set user_id = uid
   where email = mail and user_id is null;
  if code is not null and not exists (select 1 from public.coaches where id = uid)
     and not exists (select 1 from public.players where user_id = uid) then
    begin
      update public.players set user_id = uid, email = mail
       where invite_code = code and user_id is null;
    exception when unique_violation then
      update public.players set user_id = uid
       where invite_code = code and user_id is null;
    end;
  end if;
  select exists (select 1 from public.coaches where id = uid) into is_c;
  select exists (select 1 from public.players where user_id = uid) into is_p;
  return jsonb_build_object('coach', is_c, 'player', is_p);
end $$;

