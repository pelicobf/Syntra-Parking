-- Permite que cada usuario autenticado consulte el nombre comercial de su empresa.
-- Ejecutar manualmente en Supabase SQL Editor.
begin;

drop policy if exists "members read own parking business" on public.parking_businesses;
create policy "members read own parking business"
on public.parking_businesses
for select
to authenticated
using (
  public.is_parkflow_super_admin()
  or exists (
    select 1
    from public.parking_memberships membership
    where membership.business_id = parking_businesses.id
      and membership.user_id = auth.uid()
      and membership.active
  )
);

commit;
