-- ParkFlow · altas de caja y apertura/cierre de turnos.
-- Ejecutar manualmente en Supabase.
begin;

drop policy if exists "lot staff read cash registers" on public.parking_cash_registers;
create policy "lot staff read cash registers" on public.parking_cash_registers
for select to authenticated using(public.has_parking_lot_access(business_id,lot_id));

drop policy if exists "shift managers create cash registers" on public.parking_cash_registers;
create policy "shift managers create cash registers" on public.parking_cash_registers
for insert to authenticated with check(
  public.has_parking_lot_access(business_id,lot_id)
  and public.has_parking_permission(business_id,'shifts.manage')
);

drop policy if exists "shift managers update cash registers" on public.parking_cash_registers;
create policy "shift managers update cash registers" on public.parking_cash_registers
for update to authenticated using(
  public.has_parking_lot_access(business_id,lot_id)
  and public.has_parking_permission(business_id,'shifts.manage')
) with check(
  public.has_parking_lot_access(business_id,lot_id)
  and public.has_parking_permission(business_id,'shifts.manage')
);

drop policy if exists "shift managers open shifts" on public.parking_shifts;
create policy "shift managers open shifts" on public.parking_shifts
for insert to authenticated with check(
  public.has_parking_lot_access(business_id,lot_id)
  and public.has_parking_permission(business_id,'shifts.manage')
  and opened_by=auth.uid()
);

drop policy if exists "shift managers close shifts" on public.parking_shifts;
create policy "shift managers close shifts" on public.parking_shifts
for update to authenticated using(
  public.has_parking_lot_access(business_id,lot_id)
  and public.has_parking_permission(business_id,'shifts.manage')
) with check(
  public.has_parking_lot_access(business_id,lot_id)
  and public.has_parking_permission(business_id,'shifts.manage')
  and closed_by=auth.uid()
);

commit;
