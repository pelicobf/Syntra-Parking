-- Información comercial visible únicamente para la superadministración.
-- Ejecutar manualmente en Supabase.
begin;

alter table public.parking_businesses
  add column if not exists plan_type text not null default 'demo',
  add column if not exists plan_expires_at timestamptz,
  add column if not exists plan_price numeric(12,2) not null default 0,
  add column if not exists max_lots integer not null default 1,
  add column if not exists suspension_type text,
  add column if not exists suspension_reason text,
  add column if not exists suspended_at timestamptz;

alter table public.parking_businesses
  drop constraint if exists parking_businesses_plan_type_check;
alter table public.parking_businesses
  add constraint parking_businesses_plan_type_check
  check(plan_type in('demo','monthly','annual'));

update public.parking_businesses
set plan_expires_at=coalesce(plan_expires_at,created_at+interval '15 days')
where plan_type='demo';

alter table public.parking_businesses
  drop constraint if exists parking_businesses_max_lots_check;
alter table public.parking_businesses
  add constraint parking_businesses_max_lots_check check(max_lots>0);

alter table public.parking_businesses
  drop constraint if exists parking_businesses_suspension_type_check;
alter table public.parking_businesses
  add constraint parking_businesses_suspension_type_check
  check(suspension_type is null or suspension_type in('temporary','permanent'));

create table if not exists public.parking_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.parking_businesses(id) on delete cascade,
  plan_type text not null check(plan_type in('monthly','annual')),
  amount numeric(12,2) not null check(amount>0),
  period_start date not null,
  period_end date not null,
  paid_at timestamptz not null default now(),
  payment_method text not null default 'transfer',
  reference text,
  notes text,
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check(period_end>=period_start)
);

alter table public.parking_subscription_payments enable row level security;
drop policy if exists "super admins manage subscription payments" on public.parking_subscription_payments;
create policy "super admins manage subscription payments" on public.parking_subscription_payments
for all to authenticated using(public.is_parkflow_super_admin()) with check(public.is_parkflow_super_admin());

drop function if exists public.update_parkflow_business_plan(uuid,text,integer,integer);
create or replace function public.update_parkflow_business_plan(
  p_business_id uuid,
  p_plan_type text,
  p_duration_days integer,
  p_max_lots integer,
  p_plan_price numeric
) returns public.parking_businesses
language plpgsql security definer set search_path=public as $$
declare v_business public.parking_businesses;
begin
  if not public.is_parkflow_super_admin() then raise exception 'Acceso exclusivo de super administración'; end if;
  if p_plan_type not in('demo','monthly','annual') then raise exception 'Plan no válido'; end if;
  if p_duration_days<1 or p_max_lots<1 or p_plan_price<0 then raise exception 'Duración, sucursales y costo no son válidos'; end if;
  update public.parking_businesses
  set plan_type=p_plan_type,
      plan_expires_at=now()+make_interval(days=>p_duration_days),
      max_lots=p_max_lots,
      plan_price=p_plan_price
  where id=p_business_id returning * into v_business;
  if v_business.id is null then raise exception 'Empresa no encontrada'; end if;
  return v_business;
end;
$$;

create or replace function public.record_parkflow_subscription_payment(
  p_business_id uuid,
  p_amount numeric,
  p_period_start date,
  p_period_end date,
  p_payment_method text,
  p_reference text default null,
  p_notes text default null
) returns public.parking_subscription_payments
language plpgsql security definer set search_path=public as $$
declare v_plan text; v_payment public.parking_subscription_payments;
begin
  if not public.is_parkflow_super_admin() then raise exception 'Acceso exclusivo de super administración'; end if;
  select plan_type into v_plan from public.parking_businesses where id=p_business_id;
  if v_plan is null then raise exception 'Empresa no encontrada'; end if;
  if v_plan='demo' then raise exception 'Asigna un plan mensual o anual antes de registrar pagos'; end if;
  if p_amount<=0 or p_period_end<p_period_start then raise exception 'Importe o periodo no válido'; end if;
  insert into public.parking_subscription_payments(business_id,plan_type,amount,period_start,period_end,payment_method,reference,notes,recorded_by)
  values(p_business_id,v_plan,p_amount,p_period_start,p_period_end,coalesce(nullif(trim(p_payment_method),''),'transfer'),nullif(trim(p_reference),''),nullif(trim(p_notes),''),auth.uid())
  returning * into v_payment;
  update public.parking_businesses set plan_expires_at=greatest(coalesce(plan_expires_at,now()),p_period_end::timestamptz+interval '1 day') where id=p_business_id;
  return v_payment;
end;
$$;

create or replace function public.set_parkflow_business_status(
  p_business_id uuid,
  p_active boolean,
  p_suspension_type text default null,
  p_reason text default null
) returns public.parking_businesses
language plpgsql security definer set search_path=public as $$
declare v_business public.parking_businesses;
begin
  if not public.is_parkflow_super_admin() then raise exception 'Acceso exclusivo de super administración'; end if;
  if not p_active and p_suspension_type not in('temporary','permanent') then raise exception 'Selecciona el tipo de suspensión'; end if;
  if not p_active and coalesce(trim(p_reason),'')='' then raise exception 'Captura el motivo de la suspensión'; end if;
  update public.parking_businesses
  set active=p_active,
      suspension_type=case when p_active then null else p_suspension_type end,
      suspension_reason=case when p_active then null else trim(p_reason) end,
      suspended_at=case when p_active then null else now() end
  where id=p_business_id returning * into v_business;
  if v_business.id is null then raise exception 'Empresa no encontrada'; end if;
  return v_business;
end;
$$;

create or replace function public.delete_parkflow_business(
  p_business_id uuid,
  p_confirmation text
) returns boolean
language plpgsql security definer set search_path=public as $$
declare v_name text;
begin
  if not public.is_parkflow_super_admin() then raise exception 'Acceso exclusivo de super administración'; end if;
  select name into v_name from public.parking_businesses where id=p_business_id;
  if v_name is null then raise exception 'Empresa no encontrada'; end if;
  if trim(p_confirmation)<>v_name then raise exception 'La confirmación no coincide con el nombre de la empresa'; end if;
  -- Estas tablas se crearon originalmente sin ON DELETE CASCADE. El orden
  -- mantiene la integridad referencial y preserva las cuentas de auth.users.
  delete from public.parking_payments where business_id=p_business_id;
  delete from public.parking_audit_log where business_id=p_business_id;
  delete from public.parking_stays where business_id=p_business_id;
  delete from public.parking_shifts where business_id=p_business_id;
  delete from public.parking_businesses where id=p_business_id;
  return true;
end;
$$;

revoke all on function public.update_parkflow_business_plan(uuid,text,integer,integer,numeric) from public,anon;
revoke all on function public.record_parkflow_subscription_payment(uuid,numeric,date,date,text,text,text) from public,anon;
revoke all on function public.set_parkflow_business_status(uuid,boolean,text,text) from public,anon;
revoke all on function public.delete_parkflow_business(uuid,text) from public,anon;
grant execute on function public.update_parkflow_business_plan(uuid,text,integer,integer,numeric) to authenticated;
grant execute on function public.record_parkflow_subscription_payment(uuid,numeric,date,date,text,text,text) to authenticated;
grant execute on function public.set_parkflow_business_status(uuid,boolean,text,text) to authenticated;
grant execute on function public.delete_parkflow_business(uuid,text) to authenticated;

commit;
