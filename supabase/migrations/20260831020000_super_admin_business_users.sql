-- ParkFlow · Super administrador, dueños, administradores e invitaciones.
-- EJECUTAR MANUALMENTE en Supabase después de las migraciones anteriores.
begin;

create table if not exists public.platform_super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.parking_user_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.parking_businesses(id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.parkflow_role not null,
  lot_ids uuid[] not null default '{}',
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check(status in('pending','accepted','cancelled','expired')),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default now()+interval '7 days',
  created_at timestamptz not null default now()
);
create unique index if not exists one_pending_parking_invitation_per_email
  on public.parking_user_invitations(business_id,lower(email)) where status='pending';

create or replace function public.is_parkflow_super_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.platform_super_admins s where s.user_id=auth.uid());
$$;

create or replace function public.invite_parking_user(
  p_email text,
  p_full_name text,
  p_role public.parkflow_role,
  p_lot_ids uuid[]
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  v_business_id uuid;
  v_invitation_id uuid;
  v_actor_role public.parkflow_role;
begin
  if coalesce(trim(p_email),'')='' or coalesce(trim(p_full_name),'')='' then
    raise exception 'Nombre y correo son obligatorios';
  end if;
  if coalesce(array_length(p_lot_ids,1),0)=0 then raise exception 'Asigna al menos una sucursal'; end if;

  select business_id into v_business_id from public.parking_lots where id=p_lot_ids[1] and active;
  if v_business_id is null or exists(select 1 from unnest(p_lot_ids) x left join public.parking_lots l on l.id=x and l.business_id=v_business_id where l.id is null) then
    raise exception 'Las sucursales seleccionadas no pertenecen al mismo negocio';
  end if;

  if not public.is_parkflow_super_admin() then
    select role into v_actor_role from public.parking_memberships
      where user_id=auth.uid() and business_id=v_business_id and active limit 1;
    if v_actor_role is null then raise exception 'No tienes acceso al negocio'; end if;
    if v_actor_role='admin' and p_role not in('cashier','operator','viewer') then
      raise exception 'El administrador solo puede crear cajeros, operadores y usuarios de consulta';
    end if;
    if v_actor_role='owner' and p_role='owner' then raise exception 'Solo el super administrador puede crear otro dueño'; end if;
    if v_actor_role not in('owner','admin') then raise exception 'No tienes permiso para crear usuarios'; end if;
    if exists(select 1 from unnest(p_lot_ids) x where not public.has_parking_lot_access(v_business_id,x)) then
      raise exception 'Solo puedes asignar tus propias sucursales';
    end if;
  end if;

  insert into public.parking_user_invitations(business_id,email,full_name,role,lot_ids,invited_by)
  values(v_business_id,lower(trim(p_email)),trim(p_full_name),p_role,p_lot_ids,auth.uid())
  on conflict (business_id,(lower(email))) where status='pending'
  do update set full_name=excluded.full_name,role=excluded.role,lot_ids=excluded.lot_ids,
    invited_by=auth.uid(),expires_at=now()+interval '7 days'
  returning id into v_invitation_id;
  return v_invitation_id;
end;
$$;

create or replace function public.accept_parking_invitation()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_inv public.parking_user_invitations%rowtype;
  v_membership_id uuid;
  v_role_id uuid;
begin
  select * into v_inv from public.parking_user_invitations
    where lower(email)=lower(new.email) and status='pending' and expires_at>now()
    order by created_at desc limit 1 for update;
  if v_inv.id is null then return new; end if;
  select id into v_role_id from public.parking_roles where business_id=v_inv.business_id and key=v_inv.role::text and active limit 1;
  insert into public.parking_memberships(business_id,user_id,full_name,role,role_id,lot_ids,active)
    values(v_inv.business_id,new.id,v_inv.full_name,v_inv.role,v_role_id,v_inv.lot_ids,true)
    on conflict(business_id,user_id) do update set full_name=excluded.full_name,role=excluded.role,role_id=excluded.role_id,lot_ids=excluded.lot_ids,active=true
    returning id into v_membership_id;
  insert into public.parking_membership_lots(membership_id,lot_id)
    select v_membership_id,unnest(v_inv.lot_ids) on conflict do nothing;
  update public.parking_user_invitations set status='accepted',accepted_by=new.id,accepted_at=now() where id=v_inv.id;
  return new;
end;
$$;

create or replace function public.create_parking_business(
  p_name text,p_slug text,p_lot_name text,p_lot_code text,p_capacity integer
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_business_id uuid; v_lot_id uuid;
begin
  if not public.is_parkflow_super_admin() then raise exception 'Solo el super administrador puede crear negocios'; end if;
  if coalesce(trim(p_name),'')='' or coalesce(trim(p_slug),'')='' or coalesce(trim(p_lot_name),'')='' then raise exception 'Completa los datos del negocio'; end if;
  insert into public.parking_businesses(name,slug) values(trim(p_name),lower(trim(p_slug))) returning id into v_business_id;
  insert into public.parking_lots(business_id,name,code,capacity) values(v_business_id,trim(p_lot_name),upper(trim(p_lot_code)),p_capacity) returning id into v_lot_id;
  insert into public.parking_rate_plans(business_id,lot_id,name,fraction_minutes,price_per_fraction,grace_minutes,lost_ticket_fee)
    values(v_business_id,v_lot_id,'Tarifa general',15,0,0,0);
  return v_business_id;
end;
$$;

drop function if exists public.create_parking_business_with_responsible(text,text,text,text,integer,text,text,public.parkflow_role);
create function public.create_parking_business_with_responsible(
  p_name text,
  p_slug text,
  p_lot_name text,
  p_lot_code text,
  p_capacity integer,
  p_responsible_name text,
  p_responsible_email text,
  p_responsible_role public.parkflow_role
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_business_id uuid;
  v_lot_id uuid;
  v_invitation_id uuid;
begin
  if not public.is_parkflow_super_admin() then raise exception 'Solo el super administrador puede crear empresas'; end if;
  if p_responsible_role not in ('owner','admin') then raise exception 'El responsable debe ser propietario o administrador'; end if;
  if coalesce(trim(p_name),'')='' or coalesce(trim(p_slug),'')='' or coalesce(trim(p_lot_name),'')='' then raise exception 'Completa los datos de la empresa y sucursal'; end if;
  if coalesce(trim(p_responsible_name),'')='' or coalesce(trim(p_responsible_email),'')='' then raise exception 'Completa los datos del responsable'; end if;
  if p_capacity<1 then raise exception 'La capacidad debe ser mayor que cero'; end if;

  insert into public.parking_businesses(name,slug)
    values(trim(p_name),lower(trim(p_slug))) returning id into v_business_id;
  insert into public.parking_lots(business_id,name,code,capacity)
    values(v_business_id,trim(p_lot_name),upper(trim(p_lot_code)),p_capacity) returning id into v_lot_id;
  insert into public.parking_rate_plans(business_id,lot_id,name,fraction_minutes,price_per_fraction,grace_minutes,lost_ticket_fee)
    values(v_business_id,v_lot_id,'Tarifa general',15,0,0,0);
  insert into public.parking_user_invitations(business_id,email,full_name,role,lot_ids,invited_by)
    values(v_business_id,lower(trim(p_responsible_email)),trim(p_responsible_name),p_responsible_role,array[v_lot_id],auth.uid())
    returning id into v_invitation_id;

  return jsonb_build_object('business_id',v_business_id,'lot_id',v_lot_id,'invitation_id',v_invitation_id);
end;
$$;
drop trigger if exists accept_parkflow_invitation_after_signup on auth.users;
create trigger accept_parkflow_invitation_after_signup after insert on auth.users
for each row execute function public.accept_parking_invitation();

alter table public.platform_super_admins enable row level security;
alter table public.parking_user_invitations enable row level security;

drop policy if exists "super admins read own platform role" on public.platform_super_admins;
drop policy if exists "authorized users read invitations" on public.parking_user_invitations;
drop policy if exists "authorized users manage invitations" on public.parking_user_invitations;
drop policy if exists "super admins read businesses" on public.parking_businesses;
drop policy if exists "super admins read lots" on public.parking_lots;
drop policy if exists "super admins read memberships" on public.parking_memberships;
drop policy if exists "super admins read profiles" on public.profiles;

create policy "super admins read own platform role" on public.platform_super_admins for select to authenticated using(user_id=auth.uid());
create policy "authorized users read invitations" on public.parking_user_invitations for select to authenticated using(
  public.is_parkflow_super_admin() or public.has_parking_permission(business_id,'staff.view') or lower(email)=lower(coalesce(auth.jwt()->>'email',''))
);
create policy "authorized users manage invitations" on public.parking_user_invitations for update to authenticated
using(public.is_parkflow_super_admin() or public.has_parking_permission(business_id,'staff.manage'));
create policy "super admins read businesses" on public.parking_businesses for select to authenticated using(public.is_parkflow_super_admin());
create policy "super admins read lots" on public.parking_lots for select to authenticated using(public.is_parkflow_super_admin());
create policy "super admins read memberships" on public.parking_memberships for select to authenticated using(public.is_parkflow_super_admin());
create policy "super admins read profiles" on public.profiles for select to authenticated using(public.is_parkflow_super_admin());

revoke all on function public.is_parkflow_super_admin() from public,anon;
revoke all on function public.invite_parking_user(text,text,public.parkflow_role,uuid[]) from public,anon;
revoke all on function public.create_parking_business(text,text,text,text,integer) from public,anon;
revoke all on function public.create_parking_business_with_responsible(text,text,text,text,integer,text,text,public.parkflow_role) from public,anon;
grant execute on function public.is_parkflow_super_admin() to authenticated;
grant execute on function public.invite_parking_user(text,text,public.parkflow_role,uuid[]) to authenticated;
grant execute on function public.create_parking_business(text,text,text,text,integer) to authenticated;
grant execute on function public.create_parking_business_with_responsible(text,text,text,text,integer,text,text,public.parkflow_role) to authenticated;

commit;

-- DESPUÉS de ejecutar esta migración, asigna manualmente al primer super administrador:
-- insert into public.platform_super_admins(user_id)
-- select id from auth.users where email='TU_CORREO@DOMINIO.COM';
