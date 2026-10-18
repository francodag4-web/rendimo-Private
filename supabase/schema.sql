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
