
-- 1. Enum de roles
create type public.app_role as enum ('administrador', 'supervisor', 'operador');

-- 2. Tabla profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text not null default '',
  email text not null default '',
  status text not null default 'Activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 3. Tabla user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- 4. has_role (security definer, evita recursión en RLS)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- 5. RLS profiles
create policy "Profiles: usuario ve su propio perfil"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'administrador'));

create policy "Profiles: usuario actualiza su propio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'administrador'));

create policy "Profiles: admin inserta"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id or public.has_role(auth.uid(), 'administrador'));

create policy "Profiles: admin elimina"
  on public.profiles for delete
  to authenticated
  using (public.has_role(auth.uid(), 'administrador'));

-- 6. RLS user_roles
create policy "Roles: usuario ve sus roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'administrador'));

create policy "Roles: admin gestiona"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'administrador'))
  with check (public.has_role(auth.uid(), 'administrador'));

-- 7. Trigger updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 8. Trigger handle_new_user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_first boolean;
  v_role public.app_role;
begin
  select count(*) = 0 into v_is_first from public.profiles;
  v_role := case when v_is_first then 'administrador'::public.app_role else 'operador'::public.app_role end;

  insert into public.profiles (id, full_name, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  );

  insert into public.user_roles (user_id, role) values (new.id, v_role);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
