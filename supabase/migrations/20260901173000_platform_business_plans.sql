-- Información comercial visible únicamente para la superadministración.
-- Ejecutar manualmente en Supabase.
begin;

alter table public.parking_businesses
  add column if not exists plan_type text not null default 'demo',
  add column if not exists plan_expires_at timestamptz,
  add column if not exists max_lots integer not null default 1;

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

commit;
