-- ParkFlow · acceso CRUD del frontal para usuarios autenticados y asignados.
begin;

drop policy if exists "members read own membership" on public.parking_memberships;
create policy "members read own membership" on public.parking_memberships
for select to authenticated using(user_id=auth.uid() and active);

drop policy if exists "lot staff read vehicles" on public.parking_vehicles;
create policy "lot staff read vehicles" on public.parking_vehicles
for select to authenticated using(exists(
  select 1 from public.parking_memberships m where m.business_id=parking_vehicles.business_id and m.user_id=auth.uid() and m.active
));
drop policy if exists "lot staff create vehicles" on public.parking_vehicles;
create policy "lot staff create vehicles" on public.parking_vehicles
for insert to authenticated with check(exists(
  select 1 from public.parking_memberships m where m.business_id=parking_vehicles.business_id and m.user_id=auth.uid() and m.active
));
drop policy if exists "lot staff update vehicles" on public.parking_vehicles;
create policy "lot staff update vehicles" on public.parking_vehicles
for update to authenticated using(exists(
  select 1 from public.parking_memberships m where m.business_id=parking_vehicles.business_id and m.user_id=auth.uid() and m.active
));

drop policy if exists "lot staff read rates" on public.parking_rate_plans;
create policy "lot staff read rates" on public.parking_rate_plans
for select to authenticated using(public.has_parking_lot_access(business_id,lot_id));
drop policy if exists "admins update rates" on public.parking_rate_plans;
create policy "admins update rates" on public.parking_rate_plans
for update to authenticated using(exists(
  select 1 from public.parking_memberships m where m.business_id=parking_rate_plans.business_id and m.user_id=auth.uid() and m.active and m.role in('owner','admin')
)) with check(exists(
  select 1 from public.parking_memberships m where m.business_id=parking_rate_plans.business_id and m.user_id=auth.uid() and m.active and m.role in('owner','admin')
));

drop policy if exists "lot staff read shifts" on public.parking_shifts;
create policy "lot staff read shifts" on public.parking_shifts
for select to authenticated using(public.has_parking_lot_access(business_id,lot_id));

drop policy if exists "lot staff read payments" on public.parking_payments;
create policy "lot staff read payments" on public.parking_payments
for select to authenticated using(public.has_parking_lot_access(business_id,lot_id));

commit;
