-- Syntra Parkflow · arquitectura multiempresa y multisucursal inspirada en Syntra POS
create extension if not exists pgcrypto;
do $$ begin create type public.parkflow_role as enum ('owner','admin','cashier','operator','viewer'); exception when duplicate_object then null; end $$;
do $$ begin create type public.parking_stay_status as enum ('active','pending_payment','paid','cancelled','lost_ticket'); exception when duplicate_object then null; end $$;
do $$ begin create type public.parking_payment_method as enum ('cash','card','transfer','courtesy'); exception when duplicate_object then null; end $$;

create table if not exists public.parking_businesses (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  legal_name text, tax_id text, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.parking_lots (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.parking_businesses(id) on delete cascade,
  name text not null, code text not null, address text, capacity integer not null check(capacity>0),
  timezone text not null default 'America/Mexico_City', active boolean not null default true, created_at timestamptz not null default now(),
  unique(business_id,code)
);
create table if not exists public.parking_memberships (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.parking_businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, full_name text not null, role public.parkflow_role not null default 'operator',
  lot_ids uuid[] not null default '{}', active boolean not null default true, created_at timestamptz not null default now(), unique(business_id,user_id)
);
create table if not exists public.parking_rate_plans (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.parking_businesses(id) on delete cascade,
  lot_id uuid not null references public.parking_lots(id) on delete cascade, name text not null,
  fraction_minutes integer not null default 15 check(fraction_minutes in(15,30,45,60)), price_per_fraction numeric(10,2) not null check(price_per_fraction>=0),
  grace_minutes integer not null default 0, daily_max numeric(10,2), lost_ticket_fee numeric(10,2) not null default 0,
  active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.parking_vehicles (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.parking_businesses(id) on delete cascade,
  plate text not null, state_code text not null default '', make text, model text, color text, notes text, created_at timestamptz not null default now(),
  unique(business_id,plate,state_code)
);
create table if not exists public.parking_cash_registers (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.parking_businesses(id) on delete cascade,
  lot_id uuid not null references public.parking_lots(id) on delete cascade, name text not null, code text not null, active boolean not null default true,
  unique(lot_id,code)
);
create table if not exists public.parking_shifts (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.parking_businesses(id), lot_id uuid not null references public.parking_lots(id),
  cash_register_id uuid references public.parking_cash_registers(id), opened_by uuid not null references auth.users(id), closed_by uuid references auth.users(id),
  opened_at timestamptz not null default now(), closed_at timestamptz, opening_cash numeric(10,2) not null default 0,
  expected_cash numeric(10,2), counted_cash numeric(10,2), notes text
);
create unique index if not exists one_open_parking_shift_per_register on public.parking_shifts(cash_register_id) where closed_at is null;
create table if not exists public.parking_stays (
  id uuid primary key default gen_random_uuid(), folio bigint generated always as identity unique,
  business_id uuid not null references public.parking_businesses(id), lot_id uuid not null references public.parking_lots(id),
  vehicle_id uuid not null references public.parking_vehicles(id), rate_plan_id uuid not null references public.parking_rate_plans(id), shift_id uuid references public.parking_shifts(id),
  qr_token uuid not null default gen_random_uuid() unique, barcode_value text unique, entered_at timestamptz not null default now(), exited_at timestamptz,
  status public.parking_stay_status not null default 'active', amount_due numeric(10,2), created_by uuid references auth.users(id), closed_by uuid references auth.users(id),
  created_at timestamptz not null default now(), check(exited_at is null or exited_at>=entered_at)
);
create unique index if not exists one_active_stay_per_vehicle on public.parking_stays(lot_id,vehicle_id) where status in('active','pending_payment');
create table if not exists public.parking_payments (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.parking_businesses(id), lot_id uuid not null references public.parking_lots(id),
  stay_id uuid not null references public.parking_stays(id), shift_id uuid references public.parking_shifts(id), method public.parking_payment_method not null,
  amount numeric(10,2) not null check(amount>=0), reference text, received_by uuid references auth.users(id), paid_at timestamptz not null default now(), voided_at timestamptz, void_reason text
);
create table if not exists public.parking_audit_log (
  id bigint generated always as identity primary key, business_id uuid not null references public.parking_businesses(id), lot_id uuid references public.parking_lots(id),
  actor_id uuid references auth.users(id), action text not null, entity text not null, entity_id text, details jsonb not null default '{}', created_at timestamptz not null default now()
);

create index if not exists parking_stays_live_idx on public.parking_stays(lot_id,status,entered_at desc);
create index if not exists parking_vehicle_plate_idx on public.parking_vehicles(business_id,upper(plate));
create index if not exists parking_payments_shift_idx on public.parking_payments(shift_id,paid_at desc) where voided_at is null;

create or replace function public.has_parking_lot_access(p_business_id uuid,p_lot_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.parking_memberships m where m.business_id=p_business_id and m.user_id=auth.uid() and m.active and p_lot_id=any(m.lot_ids));
$$;
create or replace function public.calculate_parking_fee(p_stay_id uuid,p_at timestamptz default now()) returns numeric language sql stable security invoker as $$
 select least(coalesce(r.daily_max,999999),greatest(0,ceil(greatest(0,extract(epoch from(p_at-s.entered_at))/60-r.grace_minutes)/r.fraction_minutes))*r.price_per_fraction)
 from public.parking_stays s join public.parking_rate_plans r on r.id=s.rate_plan_id where s.id=p_stay_id;
$$;

alter table public.parking_businesses enable row level security; alter table public.parking_lots enable row level security;
alter table public.parking_memberships enable row level security; alter table public.parking_rate_plans enable row level security;
alter table public.parking_vehicles enable row level security; alter table public.parking_cash_registers enable row level security;
alter table public.parking_shifts enable row level security; alter table public.parking_stays enable row level security;
alter table public.parking_payments enable row level security; alter table public.parking_audit_log enable row level security;

drop policy if exists "lot staff read stays" on public.parking_stays;
create policy "lot staff read stays" on public.parking_stays for select to authenticated using(public.has_parking_lot_access(business_id,lot_id));
drop policy if exists "lot staff create stays" on public.parking_stays;
create policy "lot staff create stays" on public.parking_stays for insert to authenticated with check(public.has_parking_lot_access(business_id,lot_id) and created_by=auth.uid());
drop policy if exists "lot staff update stays" on public.parking_stays;
create policy "lot staff update stays" on public.parking_stays for update to authenticated using(public.has_parking_lot_access(business_id,lot_id)) with check(public.has_parking_lot_access(business_id,lot_id));
drop policy if exists "lot staff read payments" on public.parking_payments;
create policy "lot staff read payments" on public.parking_payments for select to authenticated using(public.has_parking_lot_access(business_id,lot_id));
drop policy if exists "lot cashiers create payments" on public.parking_payments;
create policy "lot cashiers create payments" on public.parking_payments for insert to authenticated with check(public.has_parking_lot_access(business_id,lot_id) and received_by=auth.uid());
drop policy if exists "members see assigned lots" on public.parking_lots;
create policy "members see assigned lots" on public.parking_lots for select to authenticated using(public.has_parking_lot_access(business_id,id));

-- Realtime: la UI puede refrescar entradas, cobros y turnos sin recargar.
do $$ begin alter publication supabase_realtime add table public.parking_stays; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.parking_payments; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.parking_shifts; exception when duplicate_object then null; end $$;
