-- ParkFlow · tipos de unidad y tarifas por sucursal.
-- Ejecutar manualmente en Supabase.
begin;

create table if not exists public.parking_vehicle_types (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.parking_businesses(id) on delete cascade,
  name text not null,
  key text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(business_id,key)
);

alter table public.parking_vehicles add column if not exists vehicle_type_id uuid references public.parking_vehicle_types(id);
alter table public.parking_stays add column if not exists vehicle_type_id uuid references public.parking_vehicle_types(id);
alter table public.parking_rate_plans add column if not exists vehicle_type_id uuid references public.parking_vehicle_types(id);

insert into public.parking_vehicle_types(business_id,name,key,description)
select b.id,v.name,v.key,v.description
from public.parking_businesses b
cross join (values
  ('Carro','car','Automóvil o sedán'),
  ('Camioneta','suv','SUV, pickup o vehículo familiar'),
  ('Camión','truck','Camión o vehículo de carga')
) as v(name,key,description)
on conflict(business_id,key) do nothing;

update public.parking_rate_plans r
set vehicle_type_id=t.id
from public.parking_vehicle_types t
where t.business_id=r.business_id and t.key='car' and r.vehicle_type_id is null;

insert into public.parking_rate_plans(
  business_id,lot_id,name,fraction_minutes,price_per_fraction,grace_minutes,daily_max,lost_ticket_fee,active,vehicle_type_id
)
select r.business_id,r.lot_id,'Tarifa '||lower(t.name),r.fraction_minutes,r.price_per_fraction,
       r.grace_minutes,r.daily_max,r.lost_ticket_fee,true,t.id
from public.parking_rate_plans r
join public.parking_vehicle_types car on car.id=r.vehicle_type_id and car.key='car'
join public.parking_vehicle_types t on t.business_id=r.business_id and t.key in('suv','truck')
where not exists(
  select 1 from public.parking_rate_plans existing
  where existing.lot_id=r.lot_id and existing.vehicle_type_id=t.id and existing.active
);

update public.parking_vehicles v set vehicle_type_id=t.id
from public.parking_vehicle_types t
where t.business_id=v.business_id and t.key='car' and v.vehicle_type_id is null;
update public.parking_stays s set vehicle_type_id=v.vehicle_type_id
from public.parking_vehicles v where v.id=s.vehicle_id and s.vehicle_type_id is null;

create unique index if not exists one_active_rate_per_vehicle_type
on public.parking_rate_plans(lot_id,vehicle_type_id) where active and vehicle_type_id is not null;

alter table public.parking_vehicle_types enable row level security;
drop policy if exists "members read vehicle types" on public.parking_vehicle_types;
create policy "members read vehicle types" on public.parking_vehicle_types
for select to authenticated using(exists(
  select 1 from public.parking_memberships m
  where m.business_id=parking_vehicle_types.business_id and m.user_id=auth.uid() and m.active
));
drop policy if exists "admins create vehicle types" on public.parking_vehicle_types;
create policy "admins create vehicle types" on public.parking_vehicle_types
for insert to authenticated with check(public.has_parking_permission(business_id,'rates.manage'));
drop policy if exists "admins update vehicle types" on public.parking_vehicle_types;
create policy "admins update vehicle types" on public.parking_vehicle_types
for update to authenticated using(public.has_parking_permission(business_id,'rates.manage'))
with check(public.has_parking_permission(business_id,'rates.manage'));
drop policy if exists "admins delete vehicle types" on public.parking_vehicle_types;
create policy "admins delete vehicle types" on public.parking_vehicle_types
for delete to authenticated using(public.has_parking_permission(business_id,'rates.manage'));

drop policy if exists "admins create rates" on public.parking_rate_plans;
create policy "admins create rates" on public.parking_rate_plans
for insert to authenticated with check(
  public.has_parking_lot_access(business_id,lot_id)
  and public.has_parking_permission(business_id,'rates.manage')
);

commit;
