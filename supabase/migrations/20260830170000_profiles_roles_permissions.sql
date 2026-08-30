-- Syntra Parkflow · perfiles, roles y permisos granulares
-- Ejecutar después de 20260830150000_syntra_parkflow.sql.

begin;

-- 1. Perfil global de cada usuario de Supabase Auth.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Datos públicos del usuario. La autorización por empresa vive en parking_memberships.';

create or replace function public.handle_new_parking_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.phone, new.raw_user_meta_data ->> 'phone', '')), '')
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, profiles.full_name),
        phone = coalesce(excluded.phone, profiles.phone),
        updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_profile_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists touch_parking_profile_updated_at on public.profiles;
create trigger touch_parking_profile_updated_at
before update on public.profiles
for each row execute function public.touch_profile_updated_at();

drop trigger if exists on_auth_user_created_parkflow on auth.users;
create trigger on_auth_user_created_parkflow
after insert or update of raw_user_meta_data, phone on auth.users
for each row execute function public.handle_new_parking_user();

-- Crear perfiles para usuarios que existían antes de esta migración.
insert into public.profiles (id, full_name, phone)
select
  u.id,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
  nullif(trim(coalesce(u.phone, u.raw_user_meta_data ->> 'phone', '')), '')
from auth.users u
on conflict (id) do nothing;

-- 2. Catálogo de permisos. Los códigos son estables y se usan desde UI/RLS.
create table if not exists public.parking_permissions (
  code text primary key,
  module text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

insert into public.parking_permissions (code, module, name, description) values
  ('dashboard.view', 'dashboard', 'Ver resumen', 'Consultar indicadores generales.'),
  ('stays.view', 'stays', 'Ver estancias', 'Consultar vehículos y boletos.'),
  ('stays.create', 'stays', 'Registrar entradas', 'Crear vehículos, estancias y boletos.'),
  ('stays.checkout', 'stays', 'Procesar salidas', 'Calcular cobros y cerrar estancias.'),
  ('stays.cancel', 'stays', 'Cancelar boletos', 'Cancelar estancias y registrar motivo.'),
  ('payments.view', 'payments', 'Ver cobros', 'Consultar pagos del estacionamiento.'),
  ('payments.create', 'payments', 'Registrar cobros', 'Cobrar efectivo, tarjeta o transferencia.'),
  ('payments.void', 'payments', 'Anular cobros', 'Anular pagos con trazabilidad.'),
  ('shifts.view', 'shifts', 'Ver turnos', 'Consultar aperturas y cortes.'),
  ('shifts.manage', 'shifts', 'Gestionar turnos', 'Abrir y cerrar turnos de caja.'),
  ('reports.view', 'reports', 'Ver reportes', 'Consultar reportes financieros y operativos.'),
  ('reports.export', 'reports', 'Exportar reportes', 'Descargar reportes.'),
  ('rates.manage', 'settings', 'Gestionar tarifas', 'Crear y modificar reglas de cobro.'),
  ('lots.manage', 'settings', 'Gestionar sucursales', 'Crear y editar estacionamientos.'),
  ('devices.manage', 'settings', 'Gestionar dispositivos', 'Configurar impresoras y lectores.'),
  ('staff.view', 'staff', 'Ver personal', 'Consultar usuarios y asignaciones.'),
  ('staff.manage', 'staff', 'Gestionar personal', 'Crear, editar y desactivar usuarios.'),
  ('roles.manage', 'staff', 'Gestionar roles', 'Crear roles y asignar permisos.'),
  ('audit.view', 'audit', 'Ver auditoría', 'Consultar acciones sensibles.')
on conflict (code) do update set
  module = excluded.module,
  name = excluded.name,
  description = excluded.description;

-- 3. Roles configurables por empresa.
create table if not exists public.parking_roles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.parking_businesses(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, key)
);

create table if not exists public.parking_role_permissions (
  role_id uuid not null references public.parking_roles(id) on delete cascade,
  permission_code text not null references public.parking_permissions(code) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_code)
);

alter table public.parking_memberships
  add column if not exists role_id uuid references public.parking_roles(id) on delete restrict;

-- La sucursal se mantiene normalizada en una tabla. lot_ids queda temporalmente
-- disponible para clientes anteriores y puede retirarse cuando todos migren.
create table if not exists public.parking_membership_lots (
  membership_id uuid not null references public.parking_memberships(id) on delete cascade,
  lot_id uuid not null references public.parking_lots(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (membership_id, lot_id)
);

create index if not exists parking_memberships_user_idx
  on public.parking_memberships(user_id, business_id) where active;
create index if not exists parking_roles_business_idx
  on public.parking_roles(business_id, active);
create index if not exists parking_membership_lots_lot_idx
  on public.parking_membership_lots(lot_id, membership_id);

-- 4. Semillas de roles. Se ejecuta para empresas actuales y para nuevas.
create or replace function public.seed_parking_roles(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_admin uuid;
  v_cashier uuid;
  v_operator uuid;
  v_viewer uuid;
begin
  insert into public.parking_roles (business_id, key, name, description, is_system) values
    (p_business_id, 'owner', 'Propietario', 'Acceso completo al negocio.', true),
    (p_business_id, 'admin', 'Administrador', 'Administra operación, personal y configuración.', true),
    (p_business_id, 'cashier', 'Cajero', 'Registra entradas, salidas, cobros y turnos.', true),
    (p_business_id, 'operator', 'Operador', 'Registra accesos y consulta estancias.', true),
    (p_business_id, 'viewer', 'Consulta', 'Acceso de solo lectura.', true)
  on conflict (business_id, key) do update set
    name = excluded.name,
    description = excluded.description,
    is_system = true;

  select id into v_owner from public.parking_roles where business_id=p_business_id and key='owner';
  select id into v_admin from public.parking_roles where business_id=p_business_id and key='admin';
  select id into v_cashier from public.parking_roles where business_id=p_business_id and key='cashier';
  select id into v_operator from public.parking_roles where business_id=p_business_id and key='operator';
  select id into v_viewer from public.parking_roles where business_id=p_business_id and key='viewer';

  -- Propietario: todos los permisos actuales y futuros se pueden volver a sincronizar ejecutando la función.
  insert into public.parking_role_permissions (role_id, permission_code)
  select v_owner, code from public.parking_permissions on conflict do nothing;

  insert into public.parking_role_permissions (role_id, permission_code)
  select v_admin, code from public.parking_permissions
  where code <> 'payments.void' on conflict do nothing;

  insert into public.parking_role_permissions (role_id, permission_code) values
    (v_cashier,'dashboard.view'),(v_cashier,'stays.view'),(v_cashier,'stays.create'),
    (v_cashier,'stays.checkout'),(v_cashier,'payments.view'),(v_cashier,'payments.create'),
    (v_cashier,'shifts.view'),(v_cashier,'shifts.manage'),(v_cashier,'reports.view'),
    (v_operator,'dashboard.view'),(v_operator,'stays.view'),(v_operator,'stays.create'),
    (v_viewer,'dashboard.view'),(v_viewer,'stays.view'),(v_viewer,'payments.view'),
    (v_viewer,'shifts.view'),(v_viewer,'reports.view')
  on conflict do nothing;
end;
$$;

select public.seed_parking_roles(id) from public.parking_businesses;

-- Convertir los roles enum existentes a role_id y normalizar sus sucursales.
update public.parking_memberships m
set role_id = r.id
from public.parking_roles r
where r.business_id = m.business_id
  and r.key = m.role::text
  and m.role_id is null;

insert into public.parking_membership_lots (membership_id, lot_id)
select m.id, unnest(m.lot_ids)
from public.parking_memberships m
on conflict do nothing;

create or replace function public.on_parking_business_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_parking_roles(new.id);
  return new;
end;
$$;

drop trigger if exists seed_roles_after_parking_business on public.parking_businesses;
create trigger seed_roles_after_parking_business
after insert on public.parking_businesses
for each row execute function public.on_parking_business_created();

-- 5. Helpers de autorización SECURITY DEFINER para evitar recursión de RLS.
create or replace function public.is_parking_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.parking_memberships m
    where m.business_id=p_business_id and m.user_id=auth.uid() and m.active
  );
$$;

create or replace function public.has_parking_permission(p_business_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parking_memberships m
    join public.parking_roles r on r.id=m.role_id and r.business_id=m.business_id and r.active
    join public.parking_role_permissions rp on rp.role_id=r.id
    where m.business_id=p_business_id
      and m.user_id=auth.uid()
      and m.active
      and rp.permission_code=p_permission
  );
$$;

create or replace function public.has_parking_lot_access(p_business_id uuid, p_lot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parking_memberships m
    join public.parking_membership_lots ml on ml.membership_id=m.id
    join public.parking_lots l on l.id=ml.lot_id and l.business_id=m.business_id and l.active
    where m.business_id=p_business_id
      and m.user_id=auth.uid()
      and m.active
      and ml.lot_id=p_lot_id
  );
$$;

create or replace function public.get_my_parking_context()
returns table (
  membership_id uuid,
  business_id uuid,
  business_name text,
  role_key text,
  role_name text,
  permission_codes text[],
  lot_ids uuid[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.business_id,
    b.name,
    r.key,
    r.name,
    coalesce(array_agg(distinct rp.permission_code) filter (where rp.permission_code is not null), '{}'),
    coalesce(array_agg(distinct ml.lot_id) filter (where ml.lot_id is not null), '{}')
  from public.parking_memberships m
  join public.parking_businesses b on b.id=m.business_id and b.active
  join public.parking_roles r on r.id=m.role_id and r.active
  left join public.parking_role_permissions rp on rp.role_id=r.id
  left join public.parking_membership_lots ml on ml.membership_id=m.id
  where m.user_id=auth.uid() and m.active
  group by m.id,m.business_id,b.name,r.key,r.name;
$$;

revoke all on function public.seed_parking_roles(uuid) from public, anon, authenticated;
revoke all on function public.is_parking_business_member(uuid) from public, anon;
revoke all on function public.has_parking_permission(uuid,text) from public, anon;
revoke all on function public.has_parking_lot_access(uuid,uuid) from public, anon;
revoke all on function public.get_my_parking_context() from public, anon;
grant execute on function public.is_parking_business_member(uuid) to authenticated;
grant execute on function public.has_parking_permission(uuid,text) to authenticated;
grant execute on function public.has_parking_lot_access(uuid,uuid) to authenticated;
grant execute on function public.get_my_parking_context() to authenticated;

-- 6. RLS para perfiles, roles, permisos y asignaciones.
alter table public.profiles enable row level security;
alter table public.parking_permissions enable row level security;
alter table public.parking_roles enable row level security;
alter table public.parking_role_permissions enable row level security;
alter table public.parking_membership_lots enable row level security;

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
for select to authenticated using (id=auth.uid());

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

-- Un usuario puede editar sus datos de contacto, pero no activar su cuenta ni
-- quitar la obligación de cambiar contraseña desde el cliente.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

drop policy if exists "staff managers read business profiles" on public.profiles;
create policy "staff managers read business profiles" on public.profiles
for select to authenticated using (
  exists (
    select 1 from public.parking_memberships target
    where target.user_id=profiles.id
      and public.has_parking_permission(target.business_id,'staff.view')
  )
);

drop policy if exists "authenticated read permission catalog" on public.parking_permissions;
create policy "authenticated read permission catalog" on public.parking_permissions
for select to authenticated using (true);

drop policy if exists "members read business roles" on public.parking_roles;
create policy "members read business roles" on public.parking_roles
for select to authenticated using (public.is_parking_business_member(business_id));

drop policy if exists "role managers insert roles" on public.parking_roles;
create policy "role managers insert roles" on public.parking_roles
for insert to authenticated with check (public.has_parking_permission(business_id,'roles.manage'));

drop policy if exists "role managers update roles" on public.parking_roles;
create policy "role managers update roles" on public.parking_roles
for update to authenticated
using (public.has_parking_permission(business_id,'roles.manage') and not is_system)
with check (public.has_parking_permission(business_id,'roles.manage') and not is_system);

drop policy if exists "members read role permissions" on public.parking_role_permissions;
create policy "members read role permissions" on public.parking_role_permissions
for select to authenticated using (
  exists (select 1 from public.parking_roles r where r.id=role_id and public.is_parking_business_member(r.business_id))
);

drop policy if exists "role managers assign permissions" on public.parking_role_permissions;
create policy "role managers assign permissions" on public.parking_role_permissions
for all to authenticated
using (
  exists (select 1 from public.parking_roles r where r.id=role_id and not r.is_system and public.has_parking_permission(r.business_id,'roles.manage'))
)
with check (
  exists (select 1 from public.parking_roles r where r.id=role_id and not r.is_system and public.has_parking_permission(r.business_id,'roles.manage'))
);

drop policy if exists "members read own lot assignments" on public.parking_membership_lots;
create policy "members read own lot assignments" on public.parking_membership_lots
for select to authenticated using (
  exists (select 1 from public.parking_memberships m where m.id=membership_id and m.user_id=auth.uid())
  or exists (select 1 from public.parking_memberships m where m.id=membership_id and public.has_parking_permission(m.business_id,'staff.view'))
);

drop policy if exists "staff managers assign lots" on public.parking_membership_lots;
create policy "staff managers assign lots" on public.parking_membership_lots
for all to authenticated
using (
  exists (select 1 from public.parking_memberships m where m.id=membership_id and public.has_parking_permission(m.business_id,'staff.manage'))
)
with check (
  exists (
    select 1 from public.parking_memberships m
    join public.parking_lots l on l.id=lot_id and l.business_id=m.business_id
    where m.id=membership_id and public.has_parking_permission(m.business_id,'staff.manage')
  )
);

-- Acceso a la membresía: el usuario ve la propia; administradores ven la empresa.
drop policy if exists "members read parking memberships" on public.parking_memberships;
create policy "members read parking memberships" on public.parking_memberships
for select to authenticated using (
  user_id=auth.uid() or public.has_parking_permission(business_id,'staff.view')
);

drop policy if exists "staff managers create memberships" on public.parking_memberships;
create policy "staff managers create memberships" on public.parking_memberships
for insert to authenticated with check (
  public.has_parking_permission(business_id,'staff.manage')
  and exists (select 1 from public.parking_roles r where r.id=role_id and r.business_id=parking_memberships.business_id)
);

drop policy if exists "staff managers update memberships" on public.parking_memberships;
create policy "staff managers update memberships" on public.parking_memberships
for update to authenticated
using (public.has_parking_permission(business_id,'staff.manage'))
with check (
  public.has_parking_permission(business_id,'staff.manage')
  and exists (select 1 from public.parking_roles r where r.id=role_id and r.business_id=parking_memberships.business_id)
);

-- Ejemplo de uso desde el cliente:
-- select * from public.get_my_parking_context();
-- select public.has_parking_permission('BUSINESS_UUID','stays.checkout');

commit;
